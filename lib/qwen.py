"""Shared Qwen API client."""
from __future__ import annotations

import json
import os
import urllib.request


# Base URL pattern from existing chat endpoint
_BASE_URL = "https://ws-os2hjo7wanzpcewt.cn-beijing.maas.aliyuncs.com/compatible-mode/v1"


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
        f"{_BASE_URL}/chat/completions",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
        return data["choices"][0]["message"]["content"]


def get_embedding(text: str, dimensions: int = 1024) -> list[float]:
    """Get text embedding vector via DashScope text-embedding-v3."""
    api_key = os.environ.get("QWEN_API_KEY", "")
    if not api_key:
        return []

    payload = json.dumps({
        "model": "text-embedding-v3",
        "input": text,
        "dimensions": dimensions,
    }).encode()

    req = urllib.request.Request(
        f"{_BASE_URL}/embeddings",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
        return data["data"][0]["embedding"]
