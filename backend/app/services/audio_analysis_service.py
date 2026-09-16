import librosa
import numpy as np
from pydub import AudioSegment, silence
import soundfile as sf
import os

def extract_audio_features(audio_path):
    # If audio is webm or not wav, convert to wav using pydub/ffmpeg
    wav_path = audio_path
    if not audio_path.lower().endswith(".wav"):
        wav_path = os.path.splitext(audio_path)[0] + ".wav"
        if not os.path.exists(wav_path):
            try:
                audio = AudioSegment.from_file(audio_path)
                audio.export(wav_path, format="wav")
            except Exception as e:
                # If conversion fails, fallback gracefully
                return {
                    "duration_sec": 0,
                    "avg_pitch": 0,
                    "tempo_bpm": 0,
                    "avg_volume": 0,
                    "total_pauses_sec": 0,
                    "num_pauses": 0
                }

    try:
        y, sr = librosa.load(wav_path, sr=None)
    except Exception:
        return {
            "duration_sec": 0,
            "avg_pitch": 0,
            "tempo_bpm": 0,
            "avg_volume": 0,
            "total_pauses_sec": 0,
            "num_pauses": 0
        }

    duration = float(librosa.get_duration(y=y, sr=sr)) if len(y) > 0 else 0

    # Pitch (fundamental frequency)
    avg_pitch = 0.0
    if len(y) > 0:
        try:
            pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
            pitch_values = pitches[magnitudes > np.median(magnitudes)]
            avg_pitch = float(np.median(pitch_values)) if len(pitch_values) > 0 else 0
        except Exception:
            avg_pitch = 0.0

    # Tempo (pace)
    tempo = 0.0
    if len(y) > 0:
        try:
            t, _ = librosa.beat.beat_track(y=y, sr=sr)
            tempo = float(np.mean(t)) if isinstance(t, (list, np.ndarray)) else float(t)
        except Exception:
            tempo = 0.0

    # Volume (RMS energy)
    avg_volume = 0.0
    if len(y) > 0:
        try:
            rms = librosa.feature.rms(y=y)
            avg_volume = float(np.mean(rms))
        except Exception:
            avg_volume = 0.0

    # Pauses (using pydub)
    silence_chunks = []
    total_silence = 0.0
    try:
        audio = AudioSegment.from_file(wav_path)
        silence_chunks = silence.detect_silence(audio, min_silence_len=400, silence_thresh=audio.dBFS-16)
        total_silence = sum([(end - start) for start, end in silence_chunks]) / 1000.0  # in seconds
    except Exception:
        pass

    return {
        "duration_sec": duration,
        "avg_pitch": avg_pitch,
        "tempo_bpm": tempo,
        "avg_volume": avg_volume,
        "total_pauses_sec": total_silence,
        "num_pauses": len(silence_chunks)
    }