from __future__ import annotations

import json

import httpx
from fastapi.testclient import TestClient

from navia_runtime.app import app, event_store, event_stream, session_store, settings_store
from navia_runtime.modules.agent_loop.runtime.core_types import CoreEvent, CoreEventType
from navia_runtime.modules.agent_loop.runtime.pi_sidecar_client import PiSidecarClient


SECRET = "sk-secret-v13-123456"


client = TestClient(app)


def setup_function() -> None:
    settings_store.clear()
    event_store.events.clear()
    event_stream.drain()
    session_store.sessions.clear()
    session_store.pages.clear()


def import_provider() -> dict[str, object]:
    response = client.post(
        "/v1/llm/providers/import",
        json={
            "type": "deepseek",
            "name": "DeepSeek",
            "baseUrl": "https://api.deepseek.com",
            "apiKey": SECRET,
            "defaultModel": "deepseek-v4-flash",
            "models": ["deepseek-v4-flash", "deepseek-v4-pro", "deepseek-chat"],
        },
    )
    assert response.status_code == 200
    return response.json()["data"]["provider"]


def parse_sse(text: str) -> list[dict[str, object]]:
    return [json.loads(line.removeprefix("data: ")) for line in text.splitlines() if line.startswith("data: ")]


def test_settings_can_save_chat_provider_selection() -> None:
    provider = import_provider()

    response = client.patch(
        "/v1/settings",
        json={
            "coreProvider": "piagent",
            "chatProvider": {
                "coreProvider": "piagent",
                "llmProviderId": provider["id"],
                "model": "deepseek-v4-flash",
            },
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["coreProvider"] == "piagent"
    assert data["chatProvider"]["llmProviderId"] == provider["id"]
    assert data["profiles"]["chat"]["coreProvider"] == "piagent"
    assert data["profiles"]["chat"]["llmProviderId"] == provider["id"]


def test_profiles_chat_is_authoritative_and_chat_provider_is_compat_synced() -> None:
    provider = import_provider()

    response = client.patch(
        "/v1/settings",
        json={
            "profiles": {
                "chat": {
                    "profile": "chat",
                    "coreProvider": "llm_direct",
                    "llmProviderId": provider["id"],
                    "model": "deepseek-v4-flash",
                    "toolPolicy": {"mode": "disabled", "allowedTools": []},
                    "enabled": True,
                }
            },
            "chatProvider": {"coreProvider": "piagent", "llmProviderId": provider["id"], "model": "deepseek-v4-flash"},
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["profiles"]["chat"]["coreProvider"] == "llm_direct"
    assert data["chatProvider"]["coreProvider"] == "llm_direct"
    assert data["coreProvider"] == "llm_direct"


def test_legacy_llm_direct_settings_migrate_to_piagent_once() -> None:
    provider = import_provider()
    now = "2026-06-22T00:00:00Z"
    legacy_profiles = {
        "chat": {
            "profile": "chat",
            "coreProvider": "llm_direct",
            "llmProviderId": provider["id"],
            "model": "deepseek-v4-flash",
            "toolPolicy": {"mode": "disabled", "allowedTools": []},
            "enabled": True,
        },
        "agent": {
            "profile": "agent",
            "coreProvider": "piagent",
            "llmProviderId": provider["id"],
            "model": "deepseek-v4-flash",
            "toolPolicy": {"mode": "disabled", "allowedTools": []},
            "enabled": False,
        },
    }
    with settings_store._lock, settings_store._conn:
        settings_store._conn.execute(
            """
            INSERT OR REPLACE INTO llm_settings(
                id, default_provider_id, default_model, core_provider, chat_provider_json,
                default_profile, profiles_json, settings_migration_json, updated_at
            )
            VALUES ('default', ?, ?, 'llm_direct', ?, 'chat', ?, NULL, ?)
            """,
            (
                provider["id"],
                "deepseek-v4-flash",
                json.dumps({"coreProvider": "llm_direct", "llmProviderId": provider["id"], "model": "deepseek-v4-flash"}),
                json.dumps(legacy_profiles),
                now,
            ),
        )

    response = client.get("/v1/settings")
    data = response.json()["data"]

    assert response.status_code == 200
    assert data["profiles"]["chat"]["coreProvider"] == "piagent"
    assert data["chatProvider"]["coreProvider"] == "piagent"
    assert data["settingsMigration"]["v1_10_piagent_default_applied"] is True

    manual = client.patch(
        "/v1/settings",
        json={"chatProvider": {"coreProvider": "llm_direct", "llmProviderId": provider["id"], "model": "deepseek-v4-flash"}},
    ).json()["data"]
    assert manual["chatProvider"]["coreProvider"] == "llm_direct"

    after = client.get("/v1/settings").json()["data"]
    assert after["profiles"]["chat"]["coreProvider"] == "llm_direct"
    assert after["chatProvider"]["coreProvider"] == "llm_direct"
    assert after["settingsMigration"]["v1_10_piagent_default_applied"] is True


def test_settings_rejects_chat_provider_model_outside_provider_models() -> None:
    provider = import_provider()

    response = client.patch(
        "/v1/settings",
        json={"chatProvider": {"coreProvider": "piagent", "llmProviderId": provider["id"], "model": "missing-model"}},
    )

    assert response.status_code == 400
    assert response.json()["error"]["details"]["code"] == "llm_model_invalid"


def test_delete_provider_clears_chat_provider_reference() -> None:
    provider = import_provider()
    client.patch("/v1/settings", json={"chatProvider": {"coreProvider": "piagent", "llmProviderId": provider["id"], "model": "deepseek-v4-flash"}})

    response = client.delete(f"/v1/llm/providers/{provider['id']}")

    assert response.status_code == 200
    assert response.json()["data"]["chatProvider"]["coreProvider"] == "piagent"
    assert "llmProviderId" not in response.json()["data"]["chatProvider"]


def test_chat_stream_piagent_missing_llm_provider_returns_recoverable_error() -> None:
    session_id = client.post("/v1/sessions", json={"metadata": {"source": "test"}}).json()["data"]["session_id"]

    response = client.post("/v1/chat/stream", json={"session_id": session_id, "message": "hello", "coreProvider": "piagent"})
    events = parse_sse(response.text)

    assert events[0]["type"] == "error"
    assert events[0]["data"]["code"] == "llm_provider_missing"
    assert events[0]["data"]["recoverable"] is True


def test_chat_stream_request_override_wins_and_does_not_leak_api_key(monkeypatch) -> None:
    first = import_provider()
    second = client.post(
        "/v1/llm/providers/import",
        json={
            "type": "deepseek",
            "name": "DeepSeek 2",
            "baseUrl": "https://api.deepseek.com",
            "apiKey": SECRET,
            "defaultModel": "deepseek-v4-pro",
            "models": ["deepseek-v4-flash", "deepseek-v4-pro"],
        },
    ).json()["data"]["provider"]
    client.patch("/v1/settings", json={"chatProvider": {"coreProvider": "piagent", "llmProviderId": first["id"], "model": "deepseek-v4-flash"}})

    captured: dict[str, object] = {}

    class FakeProvider:
        async def run_turn(self, input):
            captured.update(input.provider_config["modelProvider"])
            yield CoreEvent(CoreEventType.RESPONSE_DELTA, input.session_id, input.turn_id, input.trace_id, input.request_id, {"text": "ok"})
            yield CoreEvent(CoreEventType.RESPONSE_DONE, input.session_id, input.turn_id, input.trace_id, input.request_id, {"message_id": "msg_ok"})

    monkeypatch.setattr("navia_runtime.modules.agent_loop.runtime.agentic_turn_runner.create_core_provider", lambda _config: FakeProvider())
    session_id = client.post("/v1/sessions", json={"metadata": {"source": "test"}}).json()["data"]["session_id"]

    response = client.post(
        "/v1/chat/stream",
        json={"session_id": session_id, "message": "hello", "coreProvider": "piagent", "llmProviderId": second["id"], "model": "deepseek-v4-pro"},
    )
    events = parse_sse(response.text)

    assert captured["model"] == "deepseek-v4-pro"
    assert events[0]["data"]["text"] == "ok"
    assert SECRET not in response.text
    assert SECRET not in json.dumps(event_store.list_by_session(session_id), ensure_ascii=False)


def test_pi_sidecar_create_session_receives_model_provider() -> None:
    seen: list[dict[str, object]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/sessions":
            seen.append(json.loads(request.content.decode()))
            return httpx.Response(200, json={"sessionId": "pi_sess", "status": "created"})
        return httpx.Response(200, json={"status": "ok"})

    class TestClient(PiSidecarClient):
        def _text(self, method: str, path: str, body=None) -> str:  # type: ignore[override]
            with httpx.Client(transport=httpx.MockTransport(handler)) as http:
                response = http.request(method, f"{self.base_url}{path}", json=body)
                response.raise_for_status()
                return response.text

    pi_client = TestClient(base_url="http://sidecar.test")
    pi_client.create_session("sess", model_provider={"type": "deepseek", "model": "deepseek-v4-flash", "apiKey": SECRET})

    assert seen[0]["toolNames"] == []
    assert seen[0]["modelProvider"]["model"] == "deepseek-v4-flash"
    assert seen[0]["modelProvider"]["apiKey"] == SECRET
