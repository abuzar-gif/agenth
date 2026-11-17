import io
import json
import wave
import uuid
import urllib.request
from pathlib import Path

token = next(line.split('=', 1)[1].strip() for line in Path('.env').read_text(encoding='utf-8-sig').splitlines() if line.startswith('LOCAL_SPEECH_TOKEN='))
root = Path('test-results')
root.mkdir(exist_ok=True)
for voice, text, name in [('mms-english', 'Hello. Your local assistant is ready to help you.', 'english'), ('mms-urdu', 'Assalamualaikum. Aap ka naam kya hai?', 'urdu')]:
    request = urllib.request.Request('http://localhost:8001/synthesize', data=json.dumps({'voice': voice, 'text': text, 'speed': 1}).encode(), headers={'Content-Type': 'application/json', 'x-agenth-token': token})
    with urllib.request.urlopen(request, timeout=180) as response:
        audio = response.read()
    with wave.open(io.BytesIO(audio)) as wav:
        duration = wav.getnframes() / wav.getframerate()
        assert duration > .2 and wav.getnchannels() == 1
    (root / f'neural-{name}.wav').write_bytes(audio)
    print(f'{voice}: actual WAV synthesized, {duration:.2f} seconds.', flush=True)

audio = (root / 'neural-english.wav').read_bytes()
boundary = 'agenth-' + uuid.uuid4().hex
body = (f'--{boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nen\r\n--{boundary}\r\nContent-Disposition: form-data; name="audio"; filename="test.wav"\r\nContent-Type: audio/wav\r\n\r\n').encode() + audio + f'\r\n--{boundary}--\r\n'.encode()
request = urllib.request.Request('http://localhost:8001/transcribe', data=body, headers={'Content-Type': f'multipart/form-data; boundary={boundary}', 'x-agenth-token': token})
with urllib.request.urlopen(request, timeout=180) as response:
    result = json.load(response)
assert len(result['text'].strip()) > 5
print('Actual local recognition transcript:', result['text'], flush=True)
(root / 'speech-verification.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
