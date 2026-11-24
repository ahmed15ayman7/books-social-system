"""
فحص تزامن الصوت مع الترجمة في فيديو نهائي.

    C:\\Python314\\python.exe scripts/check_sync.py <book folder> <ar|en>

بيسمع صوت final/video_<lang>.mp4 بـ whisper (توقيت كل كلمة)، ويقارنه بتوقيت ظهور الكلمة المنوّرة في
work/render_<lang>/captions.ass. بيطبع الفرق لكل كلمة اتطابقت، والمتوسط والأقصى.
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from render_book import norm  # noqa: E402
from transcribe import load_audio  # noqa: E402
from faster_whisper import WhisperModel  # noqa: E402


def caption_events(ass: Path) -> list[tuple[float, str]]:
    """(وقت الظهور، الكلمة المنوّرة) من ملف ASS"""
    out = []
    for line in ass.read_text(encoding="utf-8-sig").splitlines():
        if not line.startswith("Dialogue:"):
            continue
        parts = line.split(",", 9)
        h, m, s = parts[1].split(":")
        t = int(h) * 3600 + int(m) * 60 + float(s)
        hit = re.search(r"\\c&H002E1EB1&\}([^{ ]+)", parts[9])
        if hit:
            out.append((t, hit.group(1)))
    return out


def main() -> None:
    book, lang = Path(sys.argv[1]), sys.argv[2]
    video = book / "final" / f"video_{lang}.mp4"
    model = WhisperModel("small", device="cpu", compute_type="int8")
    segs, _ = model.transcribe(load_audio(video), language=lang, word_timestamps=True, vad_filter=False)
    heard = [(w.start, norm(w.word)) for s in segs for w in (s.words or []) if norm(w.word)]
    caps = [(t, norm(w)) for t, w in caption_events(book / "work" / f"render_{lang}" / "captions.ass")]

    diffs, j = [], 0
    for t, w in caps:
        for k in range(j, min(j + 8, len(heard))):
            hw = heard[k][1]
            if hw == w or (len(w) > 3 and len(hw) > 3 and (hw[:4] == w[:4])):
                diffs.append((heard[k][0] - t, t, w))
                j = k + 1
                break
    if not diffs:
        print("مفيش كلمات اتطابقت")
        return
    for d, t, w in diffs[:: max(1, len(diffs) // 15)]:
        print(f"{t:6.2f}s  {w:<14}  الصوت {'بعد' if d > 0 else 'قبل'} الترجمة بـ {abs(d):.2f}s")
    avg = sum(d for d, _, _ in diffs) / len(diffs)
    print(f"\nاتطابق {len(diffs)} من {len(caps)} كلمة · متوسط الفرق {avg:+.2f}s · أقصى فرق {max(abs(d) for d, _, _ in diffs):.2f}s")


if __name__ == "__main__":
    main()
