from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Iterable

import httpx


class PiSidecarError(RuntimeError):
    recoverable = True


@dataclass
class PiSidecarClient:
    base_url: str = os.environ.get("NAVIA_PI_SIDECAR_URL", "http://127.0.0.1:17862")
    timeout: float = float(os.environ.get("NAVIA_PI_SIDECAR_TIMEOUT", "10"))

    def health(self) -> dict[str, Any]:
        return self._json("GET", "/health")

    def create_session(self, navia_session_id: str, model_provider: dict[str, Any] | None = None) -> dict[str, Any]:
        body: dict[str, Any] = {"naviaSessionId": navia_session_id, "toolNames": []}
        if model_provider:
            body["modelProvider"] = model_provider
        return self._json("POST", "/sessions", body)

    def send_prompt(self, session_id: str, message: str, request_id: str, turn_id: str, trace_id: str) -> dict[str, Any]:
        return self._json(
            "POST",
            f"/sessions/{session_id}/prompt",
            {"message": message, "requestId": request_id, "turnId": turn_id, "traceId": trace_id},
        )

    def abort(self, session_id: str, request_id: str | None = None) -> dict[str, Any]:
        return self._json("POST", f"/sessions/{session_id}/abort", {"requestId": request_id})

    def close_session(self, session_id: str) -> dict[str, Any]:
        return self._json("DELETE", f"/sessions/{session_id}")

    def stream_events(self, session_id: str) -> Iterable[dict[str, Any]]:
        text = self._text("GET", f"/sessions/{session_id}/events")
        for line in text.splitlines():
            if line.strip():
                yield json.loads(line)

    def _json(self, method: str, path: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
        text = self._text(method, path, body)
        try:
            return json.loads(text) if text else {}
        except json.JSONDecodeError as exc:
            raise PiSidecarError("Pi sidecar returned invalid JSON.") from exc

    def _text(self, method: str, path: str, body: dict[str, Any] | None = None) -> str:
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.request(method, f"{self.base_url.rstrip('/')}{path}", json=body)
                response.raise_for_status()
                return response.text
        except httpx.HTTPError as exc:
            raise PiSidecarError("Pi sidecar is unavailable or returned an error.") from exc
