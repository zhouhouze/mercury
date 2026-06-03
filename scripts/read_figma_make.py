from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

import httpx
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
FIGMA_API = "https://api.figma.com/v1"


def main() -> int:
    load_dotenv(ROOT / ".env.local")
    token = os.environ.get("FIGMA_TOKEN", "").strip()
    if not token:
        print(json.dumps({"ok": False, "error": "FIGMA_TOKEN is missing in .env.local"}, ensure_ascii=False))
        return 2

    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "Usage: python scripts/read_figma_make.py <figma-url-or-file-key>"}, ensure_ascii=False))
        return 2

    file_key = extract_file_key(sys.argv[1])
    if not file_key:
        print(json.dumps({"ok": False, "error": "Could not extract Figma file key"}, ensure_ascii=False))
        return 2

    try:
        payload = figma_get(f"/files/{file_key}?depth=2", token)
    except httpx.HTTPStatusError as error:
        print(
            json.dumps(
                {"ok": False, "status": error.response.status_code, "error": error.response.text},
                ensure_ascii=False,
            )
        )
        return 1
    except httpx.HTTPError as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False))
        return 1

    document = payload.get("document", {})
    summary = {
        "ok": True,
        "file_key": file_key,
        "name": payload.get("name"),
        "last_modified": payload.get("lastModified"),
        "version": payload.get("version"),
        "root": summarize_node(document),
        "pages": [summarize_node(child) for child in document.get("children", [])],
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


def extract_file_key(value: str) -> str | None:
    if re.fullmatch(r"[A-Za-z0-9_-]{10,}", value):
        return value
    parsed = urlparse(value)
    parts = [part for part in parsed.path.split("/") if part]
    for marker in ("design", "file", "board", "slides", "make"):
        if marker in parts:
            index = parts.index(marker)
            if len(parts) > index + 1:
                return parts[index + 1]
    return None


def figma_get(path: str, token: str) -> dict:
    with httpx.Client(timeout=30) as client:
        response = client.get(f"{FIGMA_API}{path}", headers={"X-Figma-Token": token, "Accept": "application/json"})
        response.raise_for_status()
        return response.json()


def summarize_node(node: dict) -> dict:
    children = node.get("children", [])
    return {
        "id": node.get("id"),
        "name": node.get("name"),
        "type": node.get("type"),
        "child_count": len(children),
        "children": [
            {
                "id": child.get("id"),
                "name": child.get("name"),
                "type": child.get("type"),
                "child_count": len(child.get("children", [])),
            }
            for child in children[:20]
        ],
    }


if __name__ == "__main__":
    raise SystemExit(main())
