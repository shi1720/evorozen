"""Assemble the live UI recording, stock narration, and word-aligned captions.

Requires Python with Pillow and ffmpeg/ffprobe. No API calls or private keys.
The source recording and speech timestamps are preserved under .artifacts/live-video.
"""
from pathlib import Path
import difflib
import json
import re
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / '.artifacts/live-video'
OUT = ROOT / 'deliverables'
OUT.mkdir(exist_ok=True)
FONT = ROOT / 'assets/fonts'
manifest = json.loads((WORK / 'narration.json').read_text())
recording = json.loads((WORK / 'recording.json').read_text())
transcript = json.loads((WORK / 'transcript.json').read_text())
assert recording['passed'], 'The live workflow must pass before video assembly.'
assert len(recording['marks']) == len(manifest['scenes']) == 16
assert manifest['total'] < 180


def run(args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *args], check=True)


def readable(text):
    for a, b in [('two hundred sixteen dollars', '$216'), ('one hundred forty-four dollars', '$144'),
                 ('twenty-nine dollars', '$29'), ('seventy-two dollars', '$72'),
                 ('thirty-six dollars', '$36'), ('twenty-four dollars', '$24'),
                 ('Two hundred sixteen claimed', '$216 claimed'),
                 ('One hundred forty-four in', '$144 in'), ('Seventy-two still', '$72 still'),
                 ('make seventy-two', 'make $72'), ('remainder desk dot web dot app', 'remainder-desk.web.app')]:
        text = text.replace(a, b)
    return text


def norm(word):
    word = word.lower().replace('everosen', 'evorozen').replace('confirm', 'confirmed') if word.lower() == 'confirm' else word.lower().replace('everosen', 'evorozen')
    return re.sub(r'[^a-z0-9]', '', word)


# Align the approved transcript to independent speech timestamps. Keep exact approved
# wording where the recognizer misspells a name or misses a word; interpolate only
# between surrounding recognized word boundaries, never across scene boundaries.
cues = []
for scene in manifest['scenes']:
    start, end = scene['start'], scene['start'] + scene['duration']
    original = readable(scene['text']).split()
    spoken = [w for w in transcript['words'] if w['start'] >= start - .08 and w['start'] < end - .05]
    matcher = difflib.SequenceMatcher(None, [norm(w) for w in original], [norm(w['word']) for w in spoken], autojunk=False)
    times = [None] * len(original)
    for block in matcher.get_matching_blocks():
        for offset in range(block.size):
            w = spoken[block.b + offset]
            times[block.a + offset] = [max(start + .12, w['start']), min(end - .1, w['end'])]
    for i, value in enumerate(times):
        if value is not None:
            continue
        previous = next((k for k in range(i - 1, -1, -1) if times[k] is not None), None)
        following = next((k for k in range(i + 1, len(times)) if times[k] is not None), None)
        left = times[previous][1] if previous is not None else start + .25
        right = times[following][0] if following is not None else end - .35
        count = (following if following is not None else len(times)) - i
        step = max(.03, (right - left) / count)
        times[i] = [left, left + step]
    first = 0
    while first < len(original):
        last = first
        while last + 1 < len(original):
            candidate = ' '.join(original[first:last + 2])
            if len(candidate) > 92 or last - first >= 12 or times[last + 1][1] - times[first][0] > 5.2:
                break
            if original[last].endswith(('.', '?', '!')) and last - first >= 3:
                break
            last += 1
        cue_start = max(start, times[first][0] - .08)
        cue_end = min(end, max(cue_start + .65, times[last][1] + .15))
        cues.append({'start': cue_start, 'end': cue_end, 'text': ' '.join(original[first:last + 1]), 'scene': scene['id']})
        first = last + 1
for i in range(len(cues) - 1):
    cues[i]['end'] = min(cues[i]['end'], cues[i + 1]['start'])


def stamp(seconds, sep=','):
    total = round(seconds * 1000)
    return f'{total // 3600000:02}:{total // 60000 % 60:02}:{total // 1000 % 60:02}{sep}{total % 1000:03}'


def wrap(text, draw, font, width):
    lines, line = [], ''
    for word in text.split():
        candidate = f'{line} {word}'.strip()
        if draw.textlength(candidate, font=font) > width and line:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    assert len(lines) <= 2, text
    return lines


caption_dir = WORK / 'captions'
caption_dir.mkdir(exist_ok=True)
body = ImageFont.truetype(str(FONT / 'NotoSans-Regular.ttf'), 32)
small = ImageFont.truetype(str(FONT / 'NotoSans-Bold.ttf'), 15)


def caption_image(text, filename, waiting_shortened=False):
    image = Image.new('RGB', (1920, 120), '#163d31')
    draw = ImageDraw.Draw(image)
    draw.text((52, 9), 'REMAINDER  /  FICTIONAL DOCUMENTS  /  REAL OPENAI ANALYSIS', font=small, fill='#c2d4be')
    note = 'AI-GENERATED VOICE'
    if waiting_shortened:
        note = 'PROVIDER WAIT SHORTENED  /  ' + note
    draw.text((1868 - draw.textlength(note, font=small), 9), note, font=small, fill='#c2d4be')
    lines = wrap(text, draw, body, 1740)
    y = 48 if len(lines) == 1 else 30
    for line in lines:
        draw.text(((1920 - draw.textlength(line, font=body)) / 2, y), line, font=body, fill='#ffffff')
        y += 43
    image.save(filename)


shortened = set()
for mark, scene in zip(recording['marks'], manifest['scenes']):
    assert mark['id'] == scene['id']
    raw_duration = mark['end'] - mark['start']
    # Do not accelerate any speech. Only shorten a recorded UI wait when needed.
    ratio = min(1, scene['duration'] / raw_duration)
    if raw_duration > scene['duration'] + .8:
        shortened.add(scene['id'])
    still = str(WORK / 'frames' / f"{scene['id']}.png")
    output = str(WORK / 'clips' / f"{scene['id']}.mp4")
    scale = 'scale=1920:960:flags=lanczos,pad=1920:1080:0:0:color=0x163d31,fps=25,setsar=1'
    if raw_duration < .5:
        # A deliberately short capture may contain only one compressed video frame.
        # Use the exact screenshot taken from that live scene instead of a neighbor.
        run(['-loop', '1', '-i', still, '-vf', scale, '-t', str(scene['duration']), '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p', output])
    else:
        offset = recording.get('videoClockOffsetSeconds', 0)
        raw_start, raw_end = max(0, mark['start'] - offset), max(0, mark['end'] - offset)
        motion_duration = min(scene['duration'] - .1, (raw_end - raw_start) * ratio)
        hold = scene['duration'] - motion_duration
        filters = f"[0:v]trim=start={raw_start:.5f}:end={raw_end:.5f},setpts=(PTS-STARTPTS)*{ratio:.8f},{scale},trim=duration={motion_duration:.5f}[motion];[1:v]{scale},trim=duration={hold:.5f},setpts=PTS-STARTPTS[still];[motion][still]concat=n=2:v=1:a=0[v]"
        run(['-i', recording['source'], '-loop', '1', '-i', still, '-filter_complex', filters, '-map', '[v]', '-t', str(scene['duration']), '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p', output])

segments, cursor = [], 0.0
for i, cue in enumerate(cues):
    if cue['start'] > cursor + .001:
        segments.append((cursor, cue['start'], '', cue['scene']))
    segments.append((cue['start'], cue['end'], cue['text'], cue['scene']))
    cursor = cue['end']
if cursor < manifest['total']:
    segments.append((cursor, manifest['total'], '', 'closing'))
concat = []
for i, (start, end, text, scene_id) in enumerate(segments):
    file = caption_dir / f'{i:03}.png'
    caption_image(text, file, scene_id in shortened)
    concat.extend([f"file 'captions/{file.name}'", f'duration {end - start:.6f}'])
concat.append(f"file 'captions/{len(segments) - 1:03}.png'")
(WORK / 'captions-concat.txt').write_text('\n'.join(concat) + '\n')
(WORK / 'video-concat.txt').write_text('\n'.join(f"file 'clips/{s['id']}.mp4'" for s in manifest['scenes']) + '\n')
run(['-f', 'concat', '-safe', '0', '-i', str(WORK / 'video-concat.txt'), '-c', 'copy', str(WORK / 'picture.mp4')])
run(['-i', str(WORK / 'picture.mp4'), '-f', 'concat', '-safe', '0', '-i', str(WORK / 'captions-concat.txt'), '-i', str(WORK / 'narration.wav'), '-filter_complex', '[1:v]fps=25[cc];[0:v][cc]overlay=0:960:eof_action=repeat[v]', '-map', '[v]', '-map', '2:a', '-t', str(manifest['total']), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', str(OUT / 'remainder-demo-final.mp4')])

def caption_text(cue):
    return '\n'.join(wrap(cue['text'], ImageDraw.Draw(Image.new('RGB', (1920, 120))), body, 1740))

(OUT / 'remainder-demo.srt').write_text('\n\n'.join(f"{i + 1}\n{stamp(c['start'])} --> {stamp(c['end'])}\n{caption_text(c)}" for i, c in enumerate(cues)) + '\n')
(OUT / 'remainder-demo.vtt').write_text('WEBVTT\n\n' + '\n\n'.join(f"{stamp(c['start'], '.')} --> {stamp(c['end'], '.')}\n{caption_text(c)}" for c in cues) + '\n')
(WORK / 'caption-cues.json').write_text(json.dumps(cues, indent=2))
(WORK / 'assembly.json').write_text(json.dumps({'duration': manifest['total'], 'captions': len(cues), 'shortenedProviderWaitScenes': sorted(shortened), 'spokenAudioSpedUp': False, 'disclosure': manifest['disclosure'], 'proof': recording['proof']}, indent=2))
print(json.dumps({'output': str(OUT / 'remainder-demo-final.mp4'), 'seconds': manifest['total'], 'captions': len(cues), 'shortenedProviderWaitScenes': sorted(shortened)}))
