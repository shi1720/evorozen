/** Generate stock-voice narration. Explicit --generate and --transcribe spend API quota.
 * Official docs: https://developers.openai.com/api/docs/guides/text-to-speech
 * No keys, credentials, or customer records are written to media or logs.
 */
import { config } from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

config({ quiet: true });
const root = process.cwd();
const dir = path.join(root, '.artifacts/live-video');
await fs.mkdir(path.join(dir, 'audio'), { recursive: true });
const scenes = [
  ['title', 'The promise', 'A cafe is missing part of its delivery. The supplier says, "We will credit you." Days later, a credit arrives. But it covers only the oat milk.'],
  ['intro', 'Meet Remainder', 'Meet Remainder, built by Shivam Gupta: a supplier-credit desk for independent businesses. This demonstration uses fictional documents and real OpenAI analysis.'],
  ['invoice', '01 / Bring the evidence', 'The invoice bills twelve cases of oat milk and ten cases of tomatoes. Every document lives in one case, with text the owner can review.'],
  ['receiving', 'What actually arrived', 'The receiving record shows eight oat-milk cases and seven tomato cases. A confirmed supplier alias connects the different names for the same oat drink.'],
  ['analyze', '02 / Run real analysis', 'Now the owner starts a real OpenAI request. The model interprets the documents. Remainder checks quoted evidence, units, prices, and supplier identity before an amount can enter a claim.'],
  ['findings', 'A difference worth following', 'Four missing cases at thirty-six dollars make one hundred forty-four dollars. Three tomato cases at twenty-four dollars make seventy-two. Together, the shortage is two hundred sixteen dollars.'],
  ['review', 'Evidence before approval', 'Each finding links to its source. Nothing starts approved. The owner reviews the evidence and explicitly selects the supported shortages.'],
  ['approval', '03 / Prepare the claim', 'Preparing the claim locks its amount and evidence. A later credit cannot rewrite what was originally requested. This claim is for two hundred sixteen dollars.'],
  ['export', 'Ready for the owner to send', 'The owner downloads an evidence PDF and an email draft. Remainder fits the existing email workflow, and the owner decides what actually gets sent.'],
  ['credit', '04 / A credit arrives', 'Here is the supplier credit note. It names the same invoice, but credits only one hundred forty-four dollars for the oat milk.'],
  ['match', 'Match, inspect, verify', 'A second live analysis matches the credit. The owner inspects its source before verification. Duplicate checks prevent the same note from being counted twice.'],
  ['remainder', '05 / Keep the remainder open', 'Two hundred sixteen claimed. One hundred forty-four in a verified credit note. Seventy-two still outstanding. The case stays open. A credit note is distinct from cash received.'],
  ['followup', 'The next action changes', 'The follow-up draft acknowledges the credit already issued and asks only about the remaining seventy-two dollars. That is the point: a partial credit stays partial.'],
  ['architecture', 'Built around review', 'Separately verified Evorozen memory stores approved product aliases. Financial checks and durable balances stay in application code.'],
  ['gtm', 'A focused commercial starting point', 'Start with independent operators and hospitality bookkeepers. Measure review time and repeat use, then test twenty-nine dollars per location per month. Customer traction is not yet claimed.'],
  ['closing', 'Know what is still outstanding', 'Try Remainder at remainder desk dot web dot app. Built by Shivam Gupta for Evorozen Apex. Know exactly what is still outstanding.'],
].map(([id, label, text]) => ({ id, label, text }));

function duration(file) {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file], { encoding: 'utf8' }).trim());
}
if (process.argv.includes('--generate')) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required.');
  for (const scene of scenes) {
    const audio = path.join(dir, 'audio', `${scene.id}.wav`);
    const signature = createHash('sha256').update(scene.text + '|gpt-4o-mini-tts|cedar|v1').digest('hex');
    const hashFile = audio + '.sha256';
    if ((await fs.readFile(hashFile, 'utf8').catch(() => '')) !== signature) {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini-tts', voice: 'cedar', input: scene.text, response_format: 'wav', speed: 1,
          instructions: 'Narrate a polished product demonstration in a warm, articulate, restrained professional presenter voice. Conversational and confident, never salesy or dramatic. Use a clear neutral English accent, roughly 155 words per minute. Keep pauses brief. Read every word exactly. Do not add words or sound effects. Pronounce Remainder naturally and Evorozen as eh-voh-roh-zen. This is a stock AI voice and must not imitate a real person.',
        }), signal: AbortSignal.timeout(120000),
      });
      if (!response.ok) throw new Error(`Speech generation failed for ${scene.id}: HTTP ${response.status}`);
      await fs.writeFile(audio, Buffer.from(await response.arrayBuffer()));
      await fs.writeFile(hashFile, signature);
      console.log(`Generated ${scene.id}`);
    }
    scene.audio = path.relative(root, audio);
    scene.audioDuration = duration(audio);
    scene.duration = Math.ceil((scene.audioDuration + 0.7) * 25) / 25;
  }
  const spoken = scenes.reduce((sum, scene) => sum + scene.audioDuration, 0);
  let total = scenes.reduce((sum, scene) => sum + scene.duration, 0);
  if (total > 176) throw new Error(`Narration is ${total.toFixed(2)} seconds. Shorten the script before recording.`);
  if (total < 162) {
    const extra = (164 - total) / scenes.length;
    for (const scene of scenes) scene.duration = Math.ceil((scene.duration + extra) * 25) / 25;
  }
  let at = 0;
  for (const scene of scenes) { scene.start = at; scene.audioStart = at + 0.25; at += scene.duration; }
  total = at;
  const manifest = { disclosure: 'AI-generated stock presenter voice, OpenAI cedar. No human impersonation. Fictional records; live inference footage.', model: 'gpt-4o-mini-tts', voice: 'cedar', total, spoken, appUrl: process.env.REMAINDER_PUBLIC_URL || 'https://remainder-desk.web.app', scenes };
  await fs.writeFile(path.join(dir, 'narration.json'), JSON.stringify(manifest, null, 2));
  for (const scene of scenes) execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', scene.audio, '-af', 'adelay=250|250,apad', '-t', String(scene.duration), '-ar', '48000', '-ac', '1', path.join(dir, 'audio', `${scene.id}-slot.wav`)]);
  await fs.writeFile(path.join(dir, 'audio-concat.txt'), scenes.map(scene => `file 'audio/${scene.id}-slot.wav'`).join('\n'));
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'audio-concat.txt'), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7', '-ar', '48000', '-ac', '1', path.join(dir, 'narration.wav')]);
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(dir, 'narration.wav'), '-c:a', 'libmp3lame', '-b:a', '160k', path.join(dir, 'narration.mp3')]);
  console.log(JSON.stringify({ total, spoken, words: scenes.reduce((sum, s) => sum + s.text.split(/\s+/).length, 0), scenes: scenes.length }));
}
if (process.argv.includes('--transcribe')) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required.');
  const body = new FormData();
  body.set('file', new Blob([await fs.readFile(path.join(dir, 'narration.mp3'))], { type: 'audio/mpeg' }), 'narration.mp3');
  body.set('model', 'whisper-1'); body.set('response_format', 'verbose_json'); body.set('language', 'en');
  body.append('timestamp_granularities[]', 'word'); body.append('timestamp_granularities[]', 'segment');
  body.set('prompt', 'Remainder. Shivam Gupta. Evorozen Apex. OpenAI. A supplier credit desk. 216 dollars claimed, 144 dollars credited, 72 dollars still outstanding. remainder-desk.web.app.');
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body, signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`Caption alignment failed: HTTP ${response.status}`);
  const result = await response.json();
  await fs.writeFile(path.join(dir, 'transcript.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ transcriptionWords: result.words?.length, duration: result.duration }));
}
if (!process.argv.includes('--generate') && !process.argv.includes('--transcribe')) console.log('No API requests made. Use --generate to create narration and --transcribe to align captions.');
