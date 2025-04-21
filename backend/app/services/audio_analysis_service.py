import librosa
import numpy as np
from pydub import AudioSegment, silence
import soundfile as sf
import os

def extract_audio_features(audio_path):
    # Load audio
    y, sr = librosa.load(audio_path, sr=None)
    duration = librosa.get_duration(y=y, sr=sr)

    # Pitch (fundamental frequency)
    pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
    pitch_values = pitches[magnitudes > np.median(magnitudes)]
    avg_pitch = float(np.median(pitch_values)) if len(pitch_values) > 0 else 0

    # Tempo (pace)
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    tempo = float(tempo)

    # Volume (RMS energy)
    rms = librosa.feature.rms(y=y)
    avg_volume = float(np.mean(rms))

    # Pauses (using pydub)
    audio = AudioSegment.from_file(audio_path)
    silence_chunks = silence.detect_silence(audio, min_silence_len=400, silence_thresh=audio.dBFS-16)
    total_silence = sum([(end - start) for start, end in silence_chunks]) / 1000.0  # in seconds

    return {
        "duration_sec": duration,
        "avg_pitch": avg_pitch,
        "tempo_bpm": tempo,
        "avg_volume": avg_volume,
        "total_pauses_sec": total_silence,
        "num_pauses": len(silence_chunks)
    }