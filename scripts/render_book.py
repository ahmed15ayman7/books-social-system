"""
مونتاج فيديو كتاب 1080x1920 من plan.json + الصوت + توقيت الكلمات.

    C:\\Python314\\python.exe scripts/render_book.py <book folder> <ar|en> [--preview]

المدخلات في فولدر الكتاب:
    work/plan.json          المشاهد (شوف المثال تحت)
    work/script_<lang>.txt  السكريبت (جملة في كل سطر)
    work/words_<lang>.json  توقيت الكلمات (tts_ar.py أو transcribe.py)
    audio/voice_<lang>.mp3
الناتج:
    final/video_<lang>.mp4  (+ work/render_<lang>/ ملفات مؤقتة)
    --preview: فريمات من الخطّاف والنص والختام في work/frames_<lang>/ من غير رندر كامل

plan.json:
{
  "ar": {"scenes": [ {"sentences": [0], "shots": [{"src": "clips/x.mp4", "start": 2}]}, ... ]},
  "en": {...},
  "captions": {"ar": {"font": "Segoe UI", "size": 74}, "en": {"font": "Segoe UI Black", "size": 70}}
}
كل shot: src (صورة أو فيديو أو كارت PNG)، start (للفيديو، ثانية البداية)، weight (نصيب من مدة المشهد، افتراضي 1)،
          fixed (مدة ثابتة بالثواني بدل weight)، motion: "in" | "out" | "none" (زووم للصور).
"""
import json
import math
import re
import shutil
import subprocess
import sys
from pathlib import Path

W, H, FPS = 1080, 1920, 30
RED = "&H002E1EB1&"  # #b11e2e بصيغة ASS (BGR)
WHITE = "&H00FFFFFF&"

FF = shutil.which("ffmpeg") or str(Path.home() / "AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe")
FP = FF.replace("ffmpeg.exe", "ffprobe.exe") if FF.endswith(".exe") else (shutil.which("ffprobe") or "ffprobe")
VIDEO = {".mp4", ".mov", ".webm", ".m4v"}


def run(args: list[str]) -> None:
    r = subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", *args], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(f"ffmpeg failed: {' '.join(args)[:300]}\n{r.stderr[-2000:]}")


def duration(p: Path) -> float:
    out = subprocess.run([FP, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout
    return float(out.strip() or 0)


def norm(w: str) -> str:
    w = re.sub(r"[\u064B-\u0652\u0640]", "", w.lower())  # تشكيل وتطويل
    return re.sub(r"[^\w]", "", w)


def sentence_times(sentences: list[str], words: list[dict], total: float) -> list[tuple[float, float]]:
    """بداية ونهاية كل جملة: محاذاة كلمات السكريبت مع كلمات التوقيت بالترتيب (بتستحمل اختلافات بسيطة زي الأرقام)"""
    toks = [[norm(t) for t in s.split() if norm(t)] for s in sentences]
    seq = [norm(w["word"]) for w in words]
    pos, out = 0, []
    for st in toks:
        first = None
        last = pos
        for t in st:
            # دوّر على الكلمة في نافذة صغيرة قدام
            for j in range(pos, min(pos + 6, len(seq))):
                if seq[j] == t or (len(t) > 3 and (seq[j].startswith(t[:4]) or t.startswith(seq[j][:4]))):
                    pos = j + 1
                    last = j
                    first = j if first is None else first
                    break
        if first is None:  # مالقيناش ولا كلمة: نكمّل بعد اللي فات
            first = min(pos, len(seq) - 1)
            last = first
        out.append((words[first]["start"], words[last]["end"]))
    # المشاهد بتتلزق في بعض: كل جملة لحد بداية اللي بعدها، والأخيرة لحد آخر الصوت
    res = []
    for i, (s, e) in enumerate(out):
        start = 0.0 if i == 0 else res[-1][1]
        end = out[i + 1][0] if i + 1 < len(out) else total
        res.append((start, max(end, start + 0.5)))
    return res


def shot_segment(book: Path, shot: dict, dur: float, out: Path, idx: int) -> None:
    src = book / shot["src"]
    frames = max(1, round(dur * FPS))
    fit = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1"
    if src.suffix.lower() in VIDEO:
        start = float(shot.get("start", 0))
        avail = duration(src) - start
        speed = min(1.0, avail / dur) if avail > 0 else 1.0  # لو الكليب أقصر من المشهد نبطّأه شوية
        vf = f"{fit},setpts={1/speed:.4f}*PTS,fps={FPS},trim=end_frame={frames},eq=saturation=0.92:contrast=1.05"
        run(["-ss", f"{start}", "-i", str(src), "-an", "-vf", vf, "-frames:v", str(frames), *ENC, str(out)])
    else:
        motion = shot.get("motion", "in" if idx % 2 == 0 else "out")
        z0, z1 = {"in": (1.0, 1.08), "out": (1.08, 1.0), "none": (1.0, 1.0)}[motion]
        card = "/cards/" in src.as_posix() or src.parent.name == "cards"
        if card:  # الكروت: ظهور ناعم + زووم خفيف
            z0, z1 = 1.04, 1.0
        z = f"{z0}+({z1}-{z0})*on/{frames}"
        vf = (
            f"scale={W*2}:{H*2}:force_original_aspect_ratio=increase,crop={W*2}:{H*2},"
            f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS},setsar=1"
        )
        if card:
            vf += ",fade=t=in:st=0:d=0.25"
        run(["-loop", "1", "-i", str(src), "-vf", vf, "-frames:v", str(frames), *ENC, str(out)])


ENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(FPS)]


def script_words(sentences: list[str], words: list[dict]) -> list[dict]:
    """كلمات السكريبت الأصلية (إملاء صح) بتوقيت whisper: whisper ساعات بيسمع الأسماء غلط (Achebe → Aikb).
    المحاذاة بـ difflib على الكلمات بعد التنظيف، والكلمات اللي مالهاش مقابل بتاخد جزء من وقت اللي جنبها."""
    import difflib

    toks = [t for s in sentences for t in s.split() if norm(t)]
    a = [norm(t) for t in toks]
    b = [norm(w["word"]) for w in words]
    out: list[dict] = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op == "equal" or (op == "replace" and i2 - i1 == j2 - j1):
            out += [{"word": toks[i], "start": words[j]["start"], "end": words[j]["end"]} for i, j in zip(range(i1, i2), range(j1, j2))]
        elif op in ("replace", "insert") and i2 > i1:
            if j2 > j1:
                s, e = words[j1]["start"], words[j2 - 1]["end"]
            else:  # كلمة في السكريبت مالهاش أي مقابل: بين اللي قبلها واللي بعدها
                s = out[-1]["end"] if out else 0.0
                e = words[j1]["start"] if j1 < len(words) else s + 0.3 * (i2 - i1)
            step = max(e - s, 0.05) / (i2 - i1)
            out += [{"word": toks[i], "start": round(s + k * step, 3), "end": round(s + (k + 1) * step, 3)} for k, i in enumerate(range(i1, i2))]
        # delete: كلمات whisper زيادة، بتتشال
    return out


def write_srt(sentences: list[str], words: list[dict], out: Path) -> None:
    """ملف srt لليوتيوب: جملة السكريبت الأصلية في كل سطر، بتوقيت أول وآخر كلمة فيها"""
    def ts(t: float) -> str:
        h, rem = divmod(t, 3600)
        m, s = divmod(rem, 60)
        return f"{int(h):02}:{int(m):02}:{int(s):02},{int(round((s % 1) * 1000)):03d}"

    blocks, i = [], 0
    for n, sent in enumerate(sentences, 1):
        count = len([t for t in sent.split() if norm(t)])
        chunk = words[i : i + count] or words[-1:]
        blocks.append(f"{n}\n{ts(chunk[0]['start'])} --> {ts(chunk[-1]['end'])}\n{sent}\n")
        i += count
    out.parent.mkdir(exist_ok=True)
    out.write_text("\n".join(blocks), encoding="utf-8")


def ass_captions(words: list[dict], lang: str, font: str, size: int, out: Path, breaks: list[float] | None = None, group: int = 3) -> None:
    """ترجمة كلمة بكلمة: 3 كلمات في السطر بالكتير، والكلمة المقروءة بالأحمر. المجموعة مابتعديش من جملة للي بعدها"""
    def ts(t: float) -> str:
        h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
        return f"{h}:{m:02}:{s:05.2f}"

    lines = [
        "[Script Info]", "ScriptType: v4.00+", f"PlayResX: {W}", f"PlayResY: {H}", "WrapStyle: 2", "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: Cap,{font},{size},{WHITE},{WHITE},&H00000000&,&H64000000&,1,0,0,0,100,100,0,0,1,7,3,2,70,70,300,1",
        "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    # علامات الترقيم بتتشال من الترجمة (في العربي بتتنقل للناحية الغلط مع عكس الكلمات، ومش لازمة في الترجمة أصلًا)
    punct = re.compile(r"[«»\"“”‘’،,.:;؛؟?!…()\[\]]")
    clean = [{**w, "word": punct.sub("", w["word"]).strip()} for w in words if norm(w["word"])]
    clean = [w for w in clean if w["word"]]
    # قسّم الكلمات لمجموعات من غير ما مجموعة تعدّي حدود جملة
    bset = sorted(breaks or [])
    def sent_of(t: float) -> int:
        return sum(1 for b in bset if t >= b - 0.05)
    groups: list[list[dict]] = []
    for w in clean:
        if groups and len(groups[-1]) < group and sent_of(groups[-1][0]["start"]) == sent_of(w["start"]):
            groups[-1].append(w)
        else:
            groups.append([w])
    for gi, chunk in enumerate(groups):
        nxt = groups[gi + 1][0]["start"] if gi + 1 < len(groups) else None
        for i, w in enumerate(chunk):
            start = w["start"]
            end = chunk[i + 1]["start"] if i + 1 < len(chunk) else (min(nxt, w["end"] + 0.6) if nxt else w["end"] + 0.4)
            if lang == "ar":
                # libass بيرصّ الأجزاء الملوّنة شمال لـ يمين بالترتيب المنطقي ومابيطبقش اتجاه العربي عبر تاجات اللون،
                # فبنكتب الكلمات معكوسة، وكل كلمة run لوحدها بدرجة أبيض مختلفة شوية عشان مايدمجهمش ويعكسهم تاني
                shades = ["&H00FFFFFF&", "&H00FEFEFE&", "&H00FDFDFD&", "&H00FCFCFC&"]
                runs = []
                for j, x in enumerate(chunk):
                    t = x["word"].replace("{", "").replace("}", "")
                    runs.append("{\\c" + (RED if j == i else shades[j % 4]) + "}" + t)
                text = " ".join(reversed(runs))
            else:
                parts = []
                for j, x in enumerate(chunk):
                    t = x["word"].replace("{", "").replace("}", "")
                    parts.append(f"{{\\c{RED}}}{t}{{\\c{WHITE}}}" if j == i else t)
                text = " ".join(parts)
            lines.append(f"Dialogue: 0,{ts(start)},{ts(end)},Cap,,0,0,0,,{{\\fad(40,0)}}{text}")
    out.write_text("\n".join(lines) + "\n", encoding="utf-8-sig")


def whoosh(out: Path, cuts: list[float], total: float) -> None:
    """صوت whoosh خفيف مع كل قطع (مولّد، من غير ملفات خارجية)"""
    if not cuts:
        run(["-f", "lavfi", "-i", f"anullsrc=r=48000:cl=stereo", "-t", f"{total}", str(out)])
        return
    one = out.with_name("whoosh_one.wav")
    run(["-f", "lavfi", "-i", "anoisesrc=d=0.45:c=pink:a=0.6", "-af",
         "highpass=f=300,lowpass=f=4000,afade=t=in:d=0.22,afade=t=out:st=0.22:d=0.23,volume=0.35", "-ar", "48000", "-ac", "2", str(one)])
    inputs, chains = [], []
    for i, c in enumerate(cuts):
        inputs += ["-i", str(one)]
        ms = max(0, int((c - 0.2) * 1000))
        chains.append(f"[{i}:a]adelay={ms}|{ms}[w{i}]")
    mix = "".join(f"[w{i}]" for i in range(len(cuts)))
    fc = ";".join(chains) + f";{mix}amix=inputs={len(cuts)}:normalize=0,apad=whole_dur={total}[a]"
    run([*inputs, "-filter_complex", fc, "-map", "[a]", "-t", f"{total}", str(out)])


def main() -> None:
    book = Path(sys.argv[1])
    lang = sys.argv[2]
    preview = "--preview" in sys.argv
    reuse = "--reuse" in sys.argv
    plan = json.loads((book / "work" / "plan.json").read_text(encoding="utf-8"))
    cfg = plan[lang]
    cap = plan.get("captions", {}).get(lang, {"font": "Segoe UI", "size": 72})
    sentences = [s.strip() for s in (book / "work" / f"script_{lang}.txt").read_text(encoding="utf-8").splitlines() if s.strip()]
    words = json.loads((book / "work" / f"words_{lang}.json").read_text(encoding="utf-8"))
    if plan.get("captionsFromScript", {}).get(lang, lang != "ar"):  # العربي جاي من edge بنفس نص السكريبت أصلًا
        words = script_words(sentences, words)
        write_srt(sentences, words, book / "final" / f"video_{lang}.srt")
    voice = book / "audio" / f"voice_{lang}.mp3"
    total = duration(voice) + 0.6
    st = sentence_times(sentences, words, total)

    tmp = book / "work" / f"render_{lang}"
    tmp.mkdir(parents=True, exist_ok=True)
    segs, cuts, t = [], [], 0.0
    for si, scene in enumerate(cfg["scenes"]):
        ids = scene["sentences"]
        s0, s1 = st[ids[0]][0], st[ids[-1]][1]
        dur = s1 - s0
        shots = scene["shots"]
        fixed = sum(float(s.get("fixed", 0)) for s in shots)
        weights = sum(float(s.get("weight", 1)) for s in shots if not s.get("fixed"))
        for k, shot in enumerate(shots):
            d = float(shot["fixed"]) if shot.get("fixed") else (dur - fixed) * float(shot.get("weight", 1)) / max(weights, 1e-6)
            d = max(d, 0.4)
            seg = tmp / f"s{len(segs):02}.mp4"
            if reuse and seg.exists():
                pass  # --reuse: المشهد معمول قبل كده بنفس المدة (للتعديل على الصوت/الترجمة بس)
            elif not preview or si in (0, len(cfg["scenes"]) // 2, len(cfg["scenes"]) - 1):
                shot_segment(book, shot, d, seg, len(segs))
            segs.append((seg, t, d))
            if t > 0.05:
                cuts.append(t)
            t += d
    print(f"{len(segs)} shots, {t:.1f}s (voice {total:.1f}s)")

    subs = tmp / "captions.ass"
    # الجملة الأخيرة (كارت النهاية) من غير ترجمة: الكارت نفسه بيقول نفس الكلام
    last_start = st[-1][0] if cfg.get("hideLastCaption", True) else total + 1
    cap_words = [w for w in words if w["start"] < last_start - 0.05]
    ass_captions(cap_words, lang, cap["font"], int(cap["size"]), subs, breaks=[a for a, _ in st[1:]])
    shade = tmp / "shade.png"
    if not shade.exists():  # تدرّج أسود تحت عشان الترجمة تبان
        run(["-f", "lavfi", "-i", f"color=black:s={W}x{H}", "-vf",
             f"format=rgba,geq=r=0:g=0:b=0:a='if(gt(Y,{H*0.55}),min(200,(Y-{H*0.55})/{H*0.45}*230),0)'", "-frames:v", "1", str(shade)])
    sub_path = subs.as_posix().replace(":", "\\:")

    if preview:
        frames = book / "work" / f"frames_{lang}"
        frames.mkdir(exist_ok=True)
        for seg, start, d in segs:
            if not seg.exists():
                continue
            mid = start + d / 2
            run(["-ss", f"{d/2:.2f}", "-i", str(seg), "-i", str(shade), "-filter_complex",
                 f"[0:v][1:v]overlay,setpts=PTS+{start + d/2:.3f}/TB,subtitles='{sub_path}'", "-frames:v", "1", str(frames / f"t{mid:05.1f}.jpg")])
        print(f"preview frames -> {frames}")
        return

    lst = tmp / "list.txt"
    lst.write_text("".join(f"file '{s.as_posix()}'\n" for s, _, _ in segs), encoding="utf-8")
    silent = tmp / "silent.mp4"
    run(["-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(silent)])
    sfx = tmp / "whoosh.wav"
    whoosh(sfx, cuts, total)

    out = book / "final" / f"video_{lang}.mp4"
    (book / "final").mkdir(exist_ok=True)
    length = f"{min(t, total):.2f}"
    # 3 خطوات منفصلة: لما الترجمة (subtitles بطيئة) والصوت يبقوا في نفس أمر ffmpeg، أجزاء من الصوت
    # بتتشال من النص والكلام بيسبق الترجمة بثواني. فالفيديو لوحده، والصوت لوحده، وبعدين دمج بالنسخ.
    video_only = tmp / "video_subs.mp4"
    run(["-i", str(silent), "-i", str(shade), "-filter_complex",
         f"[0:v][1:v]overlay,subtitles='{sub_path}',fade=t=out:st={t-0.4:.2f}:d=0.4[v]",
         "-map", "[v]", "-an", "-t", length, *ENC, str(video_only)])
    audio = tmp / "audio.m4a"
    run(["-i", str(voice), "-i", str(sfx), "-filter_complex",
         "[0:a]aresample=48000,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[vo];"
         "[1:a]aresample=48000,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=0.5[fx];"
         "[vo][fx]amix=inputs=2:normalize=0:duration=longest,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]",
         "-map", "[a]", "-t", length, "-c:a", "aac", "-b:a", "192k", str(audio)])
    run(["-i", str(video_only), "-i", str(audio), "-map", "0:v", "-map", "1:a", "-c", "copy", "-movflags", "+faststart", "-shortest", str(out)])
    print(f"-> {out} ({duration(out):.1f}s)")


if __name__ == "__main__":
    main()
