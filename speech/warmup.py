"""Download and verify the local neural voice and recognition models."""
from server import load_voice, load_recognizer
print('Preparing English neural voice...', flush=True)
load_voice('mms-english', True)
print('Preparing Urdu neural voice...', flush=True)
load_voice('mms-urdu', True)
print('Preparing local Whisper speech recognition...', flush=True)
load_recognizer(True)
print('Local speech models are ready.', flush=True)
