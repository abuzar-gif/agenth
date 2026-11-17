"""Free local neural speech. Bind to loopback; the authenticated Next backend is the only public interface."""
import io
import os
import tempfile
import threading
from pathlib import Path
from functools import lru_cache
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header
from fastapi.responses import Response
from pydantic import BaseModel, Field

os.environ.setdefault('HF_HOME', str(Path('.runtime/speech-models').resolve()))
if Path('.env').exists():
    for line in Path('.env').read_text(encoding='utf-8-sig').splitlines():
        if line.startswith('LOCAL_SPEECH_TOKEN='):
            os.environ.setdefault('LOCAL_SPEECH_TOKEN', line.split('=', 1)[1].strip())
app = FastAPI(title="AgentH local speech")
lock = threading.Lock()
SPEECH_TOKEN = os.environ.get("LOCAL_SPEECH_TOKEN", "")

def authorize(token):
    import hmac
    if not SPEECH_TOKEN or not hmac.compare_digest(token or "", SPEECH_TOKEN):
        raise HTTPException(401, "Local speech authorization required")

@app.get('/health')
def health():
    return {"provider": "local-mms-whisper", "localOnly": True, "neural": True, "voices": ["mms-urdu", "mms-english"], "modelsLoaded": load_voice.cache_info().currsize}

@lru_cache(maxsize=1)
def load_voice(voice, download=False):
    from transformers import VitsModel, AutoTokenizer
    name = "facebook/mms-tts-eng" if voice == 'mms-english' else "facebook/mms-tts-urd-script_latin"
    import torch
    torch.set_num_threads(2)
    return VitsModel.from_pretrained(name, local_files_only=not download), AutoTokenizer.from_pretrained(name, local_files_only=not download)

@lru_cache(maxsize=1)
def load_recognizer(download=False):
    from faster_whisper import WhisperModel
    return WhisperModel(os.environ.get('WHISPER_MODEL', 'base'), device='cpu', compute_type='int8', cpu_threads=2, local_files_only=not download)

def decode_recording(filename):
    # Decode through PyAV's current public API; pass PCM directly to Whisper.
    # This avoids faster-whisper's legacy metadata_errors argument on recent PyAV.
    import av
    import numpy as np
    chunks = []
    count = 0
    with av.open(filename, mode='r') as container:
        resampler = av.AudioResampler(format='s16', layout='mono', rate=16000)
        for frame in container.decode(audio=0):
            for converted in resampler.resample(frame):
                samples = converted.to_ndarray().reshape(-1)
                count += samples.size
                if count > 16000 * 90:
                    raise HTTPException(400, 'Recording must be under 90 seconds')
                chunks.append(samples)
        for converted in resampler.resample(None):
            chunks.append(converted.to_ndarray().reshape(-1))
    if not chunks:
        raise HTTPException(400, 'No audio samples found')
    return np.concatenate(chunks).astype(np.float32) / 32768.0

class Speech(BaseModel):
    text: str = Field(min_length=1, max_length=3000)
    voice: str = 'mms-urdu'
    speed: float = Field(default=1, ge=.5, le=1.5)

@app.post('/synthesize')
def synthesize(body: Speech, x_agenth_token: str | None = Header(default=None)):
    authorize(x_agenth_token)
    if body.voice not in ['mms-urdu', 'mms-english']:
        raise HTTPException(400, 'Unsupported local voice')
    import torch
    import soundfile as sf
    with lock:
        model, tokenizer = load_voice(body.voice)
        model.speaking_rate = body.speed
        inputs = tokenizer(body.text, return_tensors='pt')
        if inputs['input_ids'].numel() < 2:
            raise HTTPException(400, 'Voice could not tokenize this text; verify normalization.')
        with torch.no_grad():
            samples = model(**inputs).waveform.squeeze().cpu().numpy()
        output = io.BytesIO()
        sf.write(output, samples, model.config.sampling_rate, format='WAV')
    return Response(output.getvalue(), media_type='audio/wav')

@app.post('/transcribe')
async def transcribe(audio: UploadFile = File(...), language: str = Form('en'), x_agenth_token: str | None = Header(default=None)):
    authorize(x_agenth_token)
    content = await audio.read(10_000_001)
    if len(content) > 10_000_000:
        raise HTTPException(413, 'Recording exceeds 10 MB')
    if language not in ['en', 'ur', 'roman-ur']:
        raise HTTPException(400, 'Unsupported language')
    # Whisper decodes the actual recording using PyAV. Audio never leaves this computer.
    with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as handle:
        handle.write(content)
        filename = handle.name
    try:
        with lock:
            segments, info = load_recognizer().transcribe(decode_recording(filename), language='en' if language == 'en' else 'ur', vad_filter=True, beam_size=3)
            text = ' '.join(segment.text.strip() for segment in segments)
        return {'text': text, 'language': info.language, 'provider': 'local-whisper'}
    finally:
        os.unlink(filename)

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=8001)
