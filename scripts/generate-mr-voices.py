"""Generate voice prompts for muscle relax exercises."""
import asyncio
import edge_tts
import os

VOICE = "zh-CN-XiaoxiaoNeural"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "audio")

# Quick muscle relax: 5 body parts × 2 phases
PROMPTS = {
    "tense": {
        "肩膀": "收紧你的肩膀，向上提起",
        "手臂": "握紧拳头，收紧手臂",
        "腹部": "收紧腹部肌肉",
        "大腿": "收紧大腿肌肉",
        "双脚": "绷紧脚趾，收紧双脚",
    },
    "relax": {
        "肩膀": "放松肩膀，让它们自然下沉",
        "手臂": "松开拳头，让手臂完全放松",
        "腹部": "放松腹部，感受柔软",
        "大腿": "放松大腿，感受沉重",
        "双脚": "放松双脚，感受温暖",
    },
}

async def generate_voice(text: str, filename: str):
    communicate = edge_tts.Communicate(text, VOICE, rate="-10%", pitch="+5Hz")
    filepath = os.path.join(OUTPUT_DIR, filename)
    await communicate.save(filepath)
    print(f"Generated: {filename}")

async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    tasks = []
    for phase, parts in PROMPTS.items():
        for part, text in parts.items():
            filename = f"voice-mr-{phase}-{part}.mp3"
            tasks.append(generate_voice(text, filename))
    await asyncio.gather(*tasks)
    print(f"Done! Generated {len(tasks)} voice files.")

if __name__ == "__main__":
    asyncio.run(main())
