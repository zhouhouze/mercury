from __future__ import annotations

import httpx
import json

from navia_runtime.modules.agent_loop.runtime.pi_sidecar_client import PiSidecarClient, PiSidecarError


def client_with_transport(handler) -> PiSidecarClient:
    class TestClient(PiSidecarClient):
        def _text(self, method: str, path: str, body=None) -> str:  # type: ignore[override]
            with httpx.Client(transport=httpx.MockTransport(handler)) as client:
                response = client.request(method, f"{self.base_url.rstrip('/')}{path}", json=body)
                response.raise_for_status()
                return response.text

    return TestClient(base_url="http://sidecar.test")


def test_sidecar_health_and_prompt() -> None:
    seen: list[tuple[str, str, dict[str, object] | None]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        body = None if not request.content else json.loads(request.content.decode())
        seen.append((request.method, request.url.path, body))
        if request.url.path == "/health":
            return httpx.Response(200, json={"status": "ok"})
        if request.url.path == "/sessions":
            return httpx.Response(200, json={"sessionId": "pi_sess", "toolNames": []})
        if request.url.path == "/sessions/pi_sess/prompt":
            return httpx.Response(200, json={"accepted": True, "sessionId": "pi_sess"})
        if request.url.path == "/sessions/pi_sess/events":
            return httpx.Response(200, text='{"type":"response.delta","text":"hi"}\n{"type":"response.done"}\n')
        return httpx.Response(404)

    client = client_with_transport(handler)

    assert client.health()["status"] == "ok"
    assert client.create_session("sess", system_prompt="通用网页伴读 Chatbot")["sessionId"] == "pi_sess"
    assert client.send_prompt("pi_sess", "hello", "req", "turn", "trace")["accepted"] is True
    assert [event["type"] for event in client.stream_events("pi_sess")] == ["response.delta", "response.done"]
    assert seen[1][2] == {
        "naviaSessionId": "sess",
        "profile": "chat",
        "messages": [],
        "tools": [],
        "toolNames": [],
        "toolPolicy": "disabled",
        "systemPrompt": "通用网页伴读 Chatbot",
    }


def test_sidecar_offline_is_recoverable_error() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, json={"error": "offline"})

    client = client_with_transport(handler)

    try:
        client.health()
    except httpx.HTTPStatusError:
        # The subclass override intentionally exposes raw HTTP for this unit path.
        pass
    except PiSidecarError:
        pass
    else:
        raise AssertionError("Expected sidecar error.")
