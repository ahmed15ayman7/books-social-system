"""
عيّنات لكل الأصوات العربية في edge-tts بنفس النص (فصحى مبسطة) عشان تختار صوت ثابت من الإعدادات.

    C:\\Python314\\python.exe scripts/voice-samples.py

بيكتب public/voices/<voice>.mp3 و public/voices/voices.json
"""
import asyncio
import json
from pathlib import Path

import edge_tts

TEXT = (
    "هل تساءلتَ يومًا لماذا تتكرر الأخطاءُ نفسُها عبر التاريخ؟ "
    "في هذا الكتاب، يأخذك المؤلف في رحلةٍ ممتعة بين الأفكار والوقائع، "
    "ويكشف لك ثلاثةَ دروسٍ قد تغيّر نظرتك إلى العالم. تابِع حتى النهاية."
)

COUNTRIES = {
    "AE": "الإمارات", "BH": "البحرين", "DZ": "الجزائر", "EG": "مصر", "IQ": "العراق", "JO": "الأردن",
    "KW": "الكويت", "LB": "لبنان", "LY": "ليبيا", "MA": "المغرب", "OM": "عُمان", "QA": "قطر",
    "SA": "السعودية", "SY": "سوريا", "TN": "تونس", "YE": "اليمن",
}

OUT = Path(__file__).resolve().parent.parent / "public" / "voices"


async def one(v: dict, sem: asyncio.Semaphore) -> dict:
    name = v["ShortName"]
    async with sem:
        await edge_tts.Communicate(TEXT, name).save(str(OUT / f"{name}.mp3"))
    cc = name.split("-")[1]
    return {
        "id": name,
        "name": name.split("-")[2].replace("Neural", ""),
        "gender": "female" if v["Gender"] == "Female" else "male",
        "country": COUNTRIES.get(cc, cc),
        "file": f"/voices/{name}.mp3",
    }


async def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    voices = [v for v in await edge_tts.list_voices() if v["ShortName"].startswith("ar-")]
    sem = asyncio.Semaphore(4)
    meta = await asyncio.gather(*(one(v, sem) for v in voices))
    meta.sort(key=lambda m: (m["gender"], m["country"]))
    (OUT / "voices.json").write_text(json.dumps({"text": TEXT, "voices": meta}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(meta)} samples -> {OUT}")


if __name__ == "__main__":
    asyncio.run(main())
