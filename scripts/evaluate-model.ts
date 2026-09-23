/** Six fixed fictional scenarios, one live provider request each. No retries or memory calls.
 * npx tsx scripts/evaluate-model.ts --live --provider=openai */
import { config } from 'dotenv';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { analyzeDocuments, EngineError } from '../src/server/engine';
import type { Currency, EvidenceDocument } from '../src/shared/types';

config({ quiet: true });
const provider =
  process.argv.find((arg) => arg.startsWith('--provider='))?.slice('--provider='.length) ??
  'gemini';
if (!['gemini', 'openai'].includes(provider))
  throw new Error('Evaluation provider must be gemini or openai.');
if (!process.argv.includes('--live')) {
  console.log('No requests made. Add --live --provider=gemini|openai for six synthetic requests.');
  process.exit(0);
}
const keyName = provider === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY';
if (!process.env[keyName]) {
  console.error(`${keyName} is required.`);
  process.exit(1);
}
process.env.AI_PROVIDER = provider;
const model =
  provider === 'openai'
    ? process.env.OPENAI_MODEL || 'gpt-5.4-mini'
    : process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const outputPath =
  provider === 'gemini'
    ? 'docs/validation/model-eval-results.json'
    : 'docs/validation/model-eval-openai-results.json';
process.env.OPENAI_FALLBACK_ENABLED = 'false';
process.env.GEMINI_FALLBACK_ENABLED = 'false';
process.env.AI_TIMEOUT_MS = '90000';
for (const name of ['EVOROZEN_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY'])
  if (name !== keyName) delete process.env[name];
const fixturePath = 'docs/validation/model-eval-fixtures.json';
const source = await readFile(fixturePath, 'utf8');
const fixtures = JSON.parse(source) as {
  cases: {
    id: string;
    label: string;
    currency: Currency;
    supplierName: string;
    invoiceReference: string;
    expected: { product: string; amountCents: number }[];
    documents: Pick<EvidenceDocument, 'kind' | 'name' | 'text'>[];
  }[];
};
if (fixtures.cases.length !== 6) throw new Error('Expected exactly six predeclared cases.');
const startedAt = new Date().toISOString();
let requests = 0;
const results: Record<string, unknown>[] = [];
for (const fixture of fixtures.cases) {
  const timestamp = new Date().toISOString();
  const before = requests;
  const documents = fixture.documents.map((document, index) => ({
    ...document,
    id: `${fixture.id}-${index}`,
    caseId: fixture.id,
    sha256: createHash('sha256').update(document.text).digest('hex'),
    createdAt: timestamp,
  }));
  const base = {
    id: fixture.id,
    label: fixture.label,
    currency: fixture.currency,
    expected: fixture.expected,
    timestamp,
  };
  try {
    const analysis = await analyzeDocuments({
      documents,
      supplier: {
        id: `${fixture.id}-supplier`,
        name: fixture.supplierName,
        email: '',
        aliases: [],
        notes: '',
        createdAt: timestamp,
      },
      currency: fixture.currency,
      invoiceReference: fixture.invoiceReference,
      isDemo: false,
      beforeProviderRequest: async () => {
        if (++requests > 6) throw new Error('Live evaluation budget exceeded.');
      },
    });
    const supported = analysis.findings.filter(
      (finding) => !finding.needsReview && finding.confidence !== 'low',
    );
    const matched = supported.filter((finding) =>
      fixture.expected.some(
        (expected) =>
          expected.product === finding.product && expected.amountCents === finding.amountCents,
      ),
    );
    const wrong = supported.filter(
      (finding) =>
        !fixture.expected.some(
          (expected) =>
            expected.product === finding.product && expected.amountCents === finding.amountCents,
        ),
    );
    const missed = fixture.expected.filter(
      (expected) =>
        !supported.some(
          (finding) =>
            expected.product === finding.product && expected.amountCents === finding.amountCents,
        ),
    );
    const result = {
      ...base,
      provider: analysis.provider,
      model,
      traceId: analysis.traceId,
      sourceHash: analysis.sourceHash,
      requestCount: requests - before,
      durationMs: analysis.durationMs,
      emittedFindings: analysis.findings.length,
      supportedFindings: supported.length,
      matchedFindings: matched.length,
      blockedFindings: analysis.findings.filter(
        (finding) => finding.needsReview || finding.confidence === 'low',
      ).length,
      wrongSupportedFindings: wrong.length,
      missedExpectedFindings: missed.length,
      supportedAmountCents: supported.reduce((total, finding) => total + finding.amountCents, 0),
      expectedAmountCents: fixture.expected.reduce(
        (total, finding) => total + finding.amountCents,
        0,
      ),
      passed: analysis.provider === provider && wrong.length === 0 && missed.length === 0,
      findings: analysis.findings,
      warnings: analysis.warnings,
    };
    results.push(result);
    console.log(
      JSON.stringify({
        id: fixture.id,
        requestCount: result.requestCount,
        passed: result.passed,
        supportedFindings: result.supportedFindings,
        blockedFindings: result.blockedFindings,
        wrongSupportedFindings: result.wrongSupportedFindings,
        missedExpectedFindings: result.missedExpectedFindings,
      }),
    );
  } catch (error) {
    const safe =
      error instanceof EngineError
        ? { code: error.code, message: error.message }
        : { code: 'EVALUATION_ERROR', message: 'Evaluation did not complete.' };
    results.push({
      ...base,
      requestCount: requests - before,
      completed: false,
      passed: false,
      error: safe,
    });
    console.log(JSON.stringify({ id: fixture.id, ...safe }));
  }
  await writeFile(
    outputPath,
    JSON.stringify(
      {
        kind: 'small_synthetic_live_pipeline_evaluation',
        model,
        startedAt,
        completedAt: new Date().toISOString(),
        fixturesSha256: createHash('sha256').update(source).digest('hex'),
        requestCount: requests,
        results,
        disclaimer:
          'Six curated synthetic cases, one sample per case, one model configuration. This evaluates the combined model and deterministic evidence controls; it is not a statistically representative accuracy benchmark or customer traction.',
      },
      null,
      2,
    ) + '\n',
  );
}
if (results.some((result) => result.passed !== true)) process.exitCode = 1;
