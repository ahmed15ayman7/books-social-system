"""
الصوت العربي بـ edge-tts + توقيت كل كلمة من المحرك نفسه (أدق من whisper ومن غير أخطاء إملائية).

    C:\\Python314\\python.exe scripts/tts_ar.py <book folder> <voice> <rate> <pitch>
    مثال: ... "D:\\booksplatformContent\\x" ar-AE-HamdanNeural +0% -4Hz

بيقرا work/script_ar.txt ويكتب:
    audio/voice_ar.mp3
    work/words_ar.json   [{"word": "...", "start": 0.12, "end": 0.40}, ...]
    final/video_ar.srt   (جملة في كل سطر)
"""
import asyncio
import json
import re
import sys
from pathlib import Path

import edge_tts


def ts(t: float) -> str:
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02}:{int(m):02}:{int(s):02},{int(round((s % 1) * 1000)):03}"


async def main() -> None:
    book = Path(sys.argv[1])
    voice, rate, pitch = sys.argv[2], sys.argv[3], sys.argv[4]
    text = (book / "work" / "script_ar.txt").read_text(encoding="utf-8").strip()
    (book / "audio").mkdir(exist_ok=True)
    (book / "final").mkdir(exist_ok=True)

    words: list[dict] = []
    com = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
    with open(book / "audio" / "voice_ar.mp3", "wb") as f:
        async for chunk in com.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start = chunk["offset"] / 1e7
                words.append({"word": chunk["text"], "start": round(start, 3), "end": round(start + chunk["duration"] / 1e7, 3)})

    (book / "work" / "words_ar.json").write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding="utf-8")

    # srt: سطر لكل جملة من السكريبت، بتوقيت أول وآخر كلمة فيها
    sentences = [s.strip() for s in re.split(r"(?<=[.؟!?])\s+|\n+", text) if s.strip()]
    srt, i = [], 0
    for n, sent in enumerate(sentences, 1):
        count = len(sent.split())
        chunk = words[i : i + count] or words[-1:]
        srt.append(f"{n}\n{ts(chunk[0]['start'])} --> {ts(chunk[-1]['end'])}\n{sent}\n")
        i += count
    (book / "final" / "video_ar.srt").write_text("\n".join(srt), encoding="utf-8")
    print(f"{len(words)} words, {words[-1]['end']:.1f}s")


if __name__ == "__main__":
    asyncio.run(main())
