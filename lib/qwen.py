"""Shared Qwen API client."""
from __future__ import annotations

import json
import os
import urllib.request


def call_qwen(messages: list[dict], temperature: float = 0.7, max_tokens: int = 300) -> str:
    """Call Qwen API via DashScope. Returns the assistant message content."""
    api_key = os.environ.get("QWEN_API_KEY", "")
    if not api_key:
        return ""

    payload = json.dumps({
        "model": "qwen3.7-plus",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }).encode()

    req = urllib.request.Request(
        "https://ws-os2hjo7wanzpcewt.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
        return data["choices"][0]["message"]["content"]
