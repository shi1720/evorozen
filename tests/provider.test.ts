import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { analyzeDocuments, EngineError } from '../src/server/engine';
import { DEMO_SUPPLIER, SAMPLE_DOCUMENTS } from '../src/shared/samples';
import type { EvidenceDocument } from '../src/shared/types';

const documents: EvidenceDocument[] = SAMPLE_DOCUMENTS.map((document, index) => ({
  ...document,
  id: `provider-document-${index}`,
  caseId: 'provider-case',
  sha256: createHash('sha256').update(document.text).digest('hex'),
  createdAt: '2026-09-23T00:00:00Z',
}));
const input = {
  documents,
  supplier: { ...DEMO_SUPPLIER, id: 'provider-supplier', createdAt: '2026-09-23T00:00:00Z' },
  currency: 'USD' as const,
  invoiceReference: 'NF-1042',
  isDemo: false,
};
const extraction = {
  supplierName: 'Northstar Foods',
  invoiceReference: 'NF-1042',
  currency: 'USD',
  findings: [],
  credits: [],
};
function envelope(overrides: Record<string, unknown> = {}) {
  return {
    id: 'response-safe-id',
    status: 'completed',
    error: null,
    output: [
      {
        type: 'message',
        role: 'assistant',
        status: 'completed',
        content: [{ type: 'output_text', text: JSON.stringify(extraction) }],
      },
    ],
    ...overrides,
  };
}
function respond(value: unknown, init?: ResponseInit) {
  const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(value), init));
  vi.stubGlobal('fetch', mock);
  return mock;
}
beforeEach(() => {
  vi.stubEnv('AI_PROVIDER', 'openai');
  vi.stubEnv('OPENAI_API_KEY', 'test-private-key');
  vi.stubEnv('OPENAI_MODEL', '');
  vi.stubEnv('GEMINI_API_KEY', '');
  vi.stubEnv('EVOROZEN_API_KEY', '');
  vi.stubEnv('GEMINI_FALLBACK_ENABLED', 'false');
  vi.stubEnv('OPENAI_FALLBACK_ENABLED', 'false');
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('OpenAI Responses contract', () => {
  it('uses strict structured extraction, server-only credentials and no stored response', async () => {
    const fetcher = respond(envelope(), { headers: { 'x-request-id': 'header-request-id' } });
    const reserve = vi.fn(async () => {});
    const analysis = await analyzeDocuments({ ...input, beforeProviderRequest: reserve });
    expect(analysis).toMatchObject({ provider: 'openai', traceId: 'header-request-id' });
    expect(reserve).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(init.headers.Authorization).toBe('Bearer test-private-key');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      model: 'gpt-5.4-mini',
      store: false,
      max_output_tokens: 10000,
      text: { format: { type: 'json_schema', strict: true, name: 'supplier_evidence' } },
    });
    expect(body.text.format.schema.additionalProperties).toBe(false);
    expect(body.text.format.schema.required).toEqual(
      expect.arrayContaining(['findings', 'credits', 'currency']),
    );
    expect(body.input).not.toContain('test-private-key');
    expect(body.instructions).toContain('UNTRUSTED DATA');
  });
  it('honors explicit model configuration', async () => {
    vi.stubEnv('OPENAI_MODEL', 'gpt-4.1-mini-2025-04-14');
    const fetcher = respond(envelope());
    await analyzeDocuments(input);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).model).toBe('gpt-4.1-mini-2025-04-14');
  });
  it('rejects invalid model configuration before reserving quota or sending data', async () => {
    vi.stubEnv('OPENAI_MODEL', 'invalid/model\n');
    const fetcher = respond(envelope());
    const reserve = vi.fn(async () => {});
    await expect(
      analyzeDocuments({ ...input, beforeProviderRequest: reserve }),
    ).rejects.toMatchObject({ code: 'AI_CONFIGURATION' });
    expect(reserve).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(['incomplete', 'failed', 'cancelled', 'in_progress', undefined])(
    'rejects a %s envelope even when its text contains valid JSON',
    async (status) => {
      respond(envelope({ status }));
      const code =
        status === 'incomplete'
          ? 'AI_INCOMPLETE'
          : status === 'failed' || status === 'cancelled'
            ? 'AI_UNAVAILABLE'
            : 'AI_INVALID_OUTPUT';
      await expect(analyzeDocuments(input)).rejects.toMatchObject({ code });
    },
  );
  it('rejects incomplete messages within a completed response', async () => {
    const response = envelope();
    response.output[0].status = 'incomplete';
    respond(response);
    await expect(analyzeDocuments(input)).rejects.toMatchObject({ code: 'AI_INCOMPLETE' });
  });
  it('does not retry refusals through another provider', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-alternate');
    vi.stubEnv('GEMINI_FALLBACK_ENABLED', 'true');
    const fetcher = respond(
      envelope({
        output: [
          {
            type: 'message',
            role: 'assistant',
            status: 'completed',
            content: [{ type: 'refusal', refusal: 'Private provider details must not appear.' }],
          },
        ],
      }),
    );
    const failure = await analyzeDocuments(input).catch((error: unknown) => error);
    expect(failure).toMatchObject({ code: 'AI_REFUSED', status: 422 });
    expect(String(failure)).not.toContain('Private provider');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('does not treat a tool result as assistant evidence', async () => {
    respond(
      envelope({
        output: [
          {
            type: 'function_call',
            content: [{ type: 'output_text', text: JSON.stringify(extraction) }],
          },
        ],
      }),
    );
    await expect(analyzeDocuments(input)).rejects.toMatchObject({ code: 'AI_INVALID_OUTPUT' });
  });
  it('rejects schema-invalid values even if the provider claims completion', async () => {
    respond(
      envelope({
        output: [
          {
            type: 'message',
            role: 'assistant',
            status: 'completed',
            content: [
              { type: 'output_text', text: JSON.stringify({ ...extraction, amountCents: 999999 }) },
            ],
          },
        ],
      }),
    );
    await expect(analyzeDocuments(input)).rejects.toMatchObject({ code: 'AI_INVALID_OUTPUT' });
  });
  it('ignores no error embedded in a successful HTTP envelope and never exposes its text', async () => {
    respond(envelope({ error: { code: 'server_error', message: 'test-private-key' } }));
    const failure = await analyzeDocuments(input).catch((error: unknown) => error);
    expect(failure).toMatchObject({ code: 'AI_UNAVAILABLE' });
    expect(String(failure)).not.toContain('test-private-key');
  });
});

describe('provider failure and cost boundaries', () => {
  it.each([
    [401, 'AI_AUTH_ERROR'],
    [403, 'AI_AUTH_ERROR'],
    [429, 'AI_RATE_LIMITED'],
    [413, 'AI_REQUEST_LIMIT'],
    [404, 'AI_MODEL_UNAVAILABLE'],
    [400, 'AI_REQUEST_REJECTED'],
    [500, 'AI_UNAVAILABLE'],
  ])('sanitizes HTTP %i without leaking provider details', async (status, code) => {
    const fetcher = respond(
      { error: { message: 'test-private-key and private invoice data' } },
      { status: Number(status) },
    );
    const failure = await analyzeDocuments(input).catch((error: unknown) => error);
    expect(failure).toMatchObject({ code });
    expect(String(failure)).not.toContain('test-private-key');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('does not retry a network failure or hide it with demo replay', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('test-private-key'));
    vi.stubGlobal('fetch', fetcher);
    await expect(analyzeDocuments(input)).rejects.toMatchObject({ code: 'AI_UNAVAILABLE' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('reports a timeout separately from malformed evidence', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('private', 'TimeoutError')));
    await expect(analyzeDocuments(input)).rejects.toMatchObject({
      code: 'AI_TIMEOUT',
      status: 504,
    });
  });
  it('cancels a chunked response as soon as its byte budget is exceeded', async () => {
    const cancel = vi.fn();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(150001));
        controller.enqueue(new Uint8Array(150001));
      },
      cancel,
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));
    await expect(analyzeDocuments(input)).rejects.toMatchObject({ code: 'AI_INVALID_OUTPUT' });
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it('never invokes a provider when application quota reservation fails', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-alternate');
    vi.stubEnv('GEMINI_FALLBACK_ENABLED', 'true');
    const fetcher = respond(envelope());
    const limit = new EngineError('Application quota exhausted.', 'AI_DAILY_BUDGET', 429);
    await expect(
      analyzeDocuments({
        ...input,
        beforeProviderRequest: async () => {
          throw limit;
        },
      }),
    ).rejects.toBe(limit);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('reserves a new call and reports provenance for an explicitly enabled fallback', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-alternate');
    vi.stubEnv('GEMINI_FALLBACK_ENABLED', 'true');
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            responseId: 'gemini-fallback-id',
            candidates: [{ content: { parts: [{ text: JSON.stringify(extraction) }] } }],
          }),
        ),
      );
    vi.stubGlobal('fetch', fetcher);
    const reserve = vi.fn(async () => {});
    const analysis = await analyzeDocuments({ ...input, beforeProviderRequest: reserve });
    expect(analysis.provider).toBe('gemini');
    expect(analysis.warnings.join(' ')).toContain('explicitly enabled Gemini fallback');
    expect(reserve).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('stops when quota is exhausted before a fallback request', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-alternate');
    vi.stubEnv('GEMINI_FALLBACK_ENABLED', 'true');
    const fetcher = respond({}, { status: 503 });
    const limit = new Error('Application quota exhausted.');
    const reserve = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(limit);
    await expect(analyzeDocuments({ ...input, beforeProviderRequest: reserve })).rejects.toBe(
      limit,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('Gemini completion boundary', () => {
  it.each([
    ['MAX_TOKENS', 'AI_INCOMPLETE'],
    ['SAFETY', 'AI_REFUSED'],
    ['RECITATION', 'AI_REFUSED'],
    ['OTHER', 'AI_INVALID_OUTPUT'],
  ])(
    'does not accept %s output even when the text is valid evidence JSON',
    async (finishReason, code) => {
      vi.stubEnv('AI_PROVIDER', 'gemini');
      vi.stubEnv('GEMINI_API_KEY', 'test-alternate');
      respond({
        candidates: [{ finishReason, content: { parts: [{ text: JSON.stringify(extraction) }] } }],
      });
      await expect(analyzeDocuments(input)).rejects.toMatchObject({ code });
    },
  );
  it('handles prompt blocks without exposing private provider content', async () => {
    vi.stubEnv('AI_PROVIDER', 'gemini');
    vi.stubEnv('GEMINI_API_KEY', 'test-alternate');
    respond({
      promptFeedback: {
        blockReason: 'SAFETY',
        blockReasonMessage: 'Private provider information.',
      },
    });
    const failure = await analyzeDocuments(input).catch((error: unknown) => error);
    expect(failure).toMatchObject({ code: 'AI_REFUSED' });
    expect(String(failure)).not.toContain('Private provider');
  });
});

describe('inference gateway headroom', () => {
  it('aborts a stalled default OpenAI request at 35 seconds without fallback', async () => {
    vi.stubEnv('AI_TIMEOUT_MS', '');
    vi.useFakeTimers();
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockImplementation((milliseconds) => {
      const controller = new AbortController();
      setTimeout(
        () => controller.abort(new DOMException('Timed out', 'TimeoutError')),
        milliseconds,
      );
      return controller.signal;
    });
    const fetcher = vi.fn(
      (_url, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal!.addEventListener('abort', () => reject(init.signal!.reason), { once: true });
        }),
    );
    vi.stubGlobal('fetch', fetcher);
    let settled = false;
    const outcome = analyzeDocuments(input).catch((error: unknown) => {
      settled = true;
      return error;
    });
    await vi.advanceTimersByTimeAsync(34999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await outcome).toMatchObject({ code: 'AI_TIMEOUT', status: 504 });
    expect(timeout).toHaveBeenCalledWith(35000);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
