"""
توقيت كل كلمة في الصوت (للترجمة المحروقة كلمة بكلمة).

    python scripts/transcribe.py <audio.mp3> <ar|en>

بيكتب جنب فولدر الصوت:
    work/words_<lang>.json   [{"word": "...", "start": 0.12, "end": 0.40}, ...]
    final/video_<lang>.srt
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel


def load_audio(path: Path) -> np.ndarray:
    """فك الصوت بـ ffmpeg (16kHz mono) بدل av، عشان نسخ av الجديدة مش متوافقة مع faster-whisper"""
    ff = shutil.which("ffmpeg") or str(
        Path.home() / "AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe"
    )
    raw = subprocess.run([ff, "-v", "error", "-i", str(path), "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0


def ts(t: float) -> str:
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02}:{int(m):02}:{int(s):02},{int(round((s % 1) * 1000)):03}"


def main() -> None:
    audio = Path(sys.argv[1]).resolve()
    lang = sys.argv[2] if len(sys.argv) > 2 else "ar"
    book = audio.parent.parent
    (book / "work").mkdir(exist_ok=True)
    (book / "final").mkdir(exist_ok=True)

    model = WhisperModel("small", device="cpu", compute_type="int8")
    segments, _ = model.transcribe(load_audio(audio), language=lang, word_timestamps=True, vad_filter=True)

    words, srt = [], []
    for i, seg in enumerate(segments, 1):
        for w in seg.words or []:
            words.append({"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)})
        srt.append(f"{i}\n{ts(seg.start)} --> {ts(seg.end)}\n{seg.text.strip()}\n")

    (book / "work" / f"words_{lang}.json").write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding="utf-8")
    (book / "final" / f"video_{lang}.srt").write_text("\n".join(srt), encoding="utf-8")
    dur = words[-1]["end"] if words else 0
    print(f"{len(words)} words, {dur:.1f}s -> work/words_{lang}.json, final/video_{lang}.srt")


if __name__ == "__main__":
    main()
