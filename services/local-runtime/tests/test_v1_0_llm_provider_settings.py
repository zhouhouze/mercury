from __future__ import annotations

import json
from pathlib import Path

import httpx
from fastapi.testclient import TestClient

import navia_runtime.app as app_module
from navia_runtime.provider_settings import ProviderRegistry


ROOT = Path(__file__).resolve().parents[3]
CONTRACTS = ROOT / "docs/navia_v1_project_docs/contracts"
SECRET = "sk-secret-1234567890"


def parse_sse(raw: str) -> list[dict]:
    events = []
    for block in [block for block in raw.strip().split("\n\n") if block.strip()]:
        data_line = next(line for line in block.splitlines() if line.startswith("data:"))
        events.append(json.loads(data_line.split(":", 1)[1].strip()))
    return events


def create_session_with_page(client: TestClient) -> str:
    session = client.post("/v1/sessions", json={"client": "chrome-extension", "metadata": {}}).json()
    session_id = session["data"]["session_id"]
    sample = json.loads((CONTRACTS / "samples/page-context-article.json").read_text())
    sample["session_id"] = session_id
    client.post("/v1/page/context", json=sample)
    app_module.event_store.events.clear()
    app_module.event_stream.published.clear()
    return session_id


def install_mock_provider(monkeypatch, handler) -> None:
    monkeypatch.setattr(
        app_module,
        "provider_registry",
        ProviderRegistry(app_module.settings_store, lambda: httpx.Client(transport=httpx.MockTransport(handler))),
    )


def import_provider(client: TestClient) -> dict:
    response = client.post(
        "/v1/llm/providers/import",
        json={
            "type": "deepseek",
            "name": "DeepSeek",
            "baseUrl": "https://api.deepseek.com",
            "apiKey": SECRET,
            "models": ["deepseek-v4-flash", "deepseek-v4-pro", "deepseek-chat", "deepseek-reasoner"],
            "defaultModel": "deepseek-v4-flash",
        },
    )
    assert response.status_code == 200
    return response.json()["data"]["provider"]


def setup_function() -> None:
    app_module.settings_store.clear()
    app_module.event_store.events.clear()
    app_module.event_stream.published.clear()


def test_provider_import_get_and_test_do_not_return_api_key(monkeypatch) -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"choices": [{"message": {"content": "ok"}}]})

    install_mock_provider(monkeypatch, handler)
    client = TestClient(app_module.app)
    provider = import_provider(client)
    assert provider["id"]
    assert "apiKey" not in provider
    assert provider["apiKeyMasked"].startswith("sk-s")
    assert SECRET not in json.dumps(provider)

    settings = client.get("/v1/settings").json()
    listed = client.get("/v1/llm/providers").json()
    assert SECRET not in json.dumps(settings)
    assert SECRET not in json.dumps(listed)

    tested = client.post(f"/v1/llm/providers/{provider['id']}/test").json()
    assert tested["data"]["result"]["status"] == "ok"
    assert SECRET not in json.dumps(tested)


def test_patch_settings_rejects_model_outside_provider_models() -> None:
    client = TestClient(app_module.app)
    provider = import_provider(client)
    response = client.patch("/v1/settings", json={"defaultProviderId": provider["id"], "defaultModel": "not-a-model"})
    body = response.json()
    assert response.status_code == 400
    assert body["ok"] is False
    assert body["error"]["details"]["code"] == "model_invalid"


def test_delete_default_provider_clears_default_settings() -> None:
    client = TestClient(app_module.app)
    provider = import_provider(client)
    settings = client.delete(f"/v1/llm/providers/{provider['id']}").json()["data"]
    assert settings["providers"] == []
    assert settings["defaultProviderId"] is None
    assert settings["defaultModel"] is None


def test_provider_missing_chat_stream_returns_recoverable_error() -> None:
    client = TestClient(app_module.app)
    session_id = create_session_with_page(client)
    response = client.post("/v1/chat/stream", json={"session_id": session_id, "message": "hello"})
    events = parse_sse(response.text)
    assert events[0]["type"] == "error"
    assert events[0]["data"]["code"] == "provider_missing"
    assert events[0]["data"]["recoverable"] is True


def test_deepseek_stream_chunks_become_response_delta_and_do_not_leak_secret(monkeypatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["authorization"] == f"Bearer {SECRET}"
        body = b'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\ndata: {"choices":[{"delta":{"content":" world"}}]}\n\ndata: [DONE]\n\n'
        return httpx.Response(200, content=body, headers={"content-type": "text/event-stream"})

    install_mock_provider(monkeypatch, handler)
    client = TestClient(app_module.app)
    import_provider(client)
    session_id = create_session_with_page(client)
    response = client.post("/v1/chat/stream", json={"session_id": session_id, "message": "hello", "request_id": "req_test"})
    events = parse_sse(response.text)
    assert [event["type"] for event in events] == ["response.delta", "response.delta", "response.done"]
    assert "".join(event["data"].get("text", "") for event in events) == "Hello world"
    assert SECRET not in response.text

    trace = client.get(f"/v1/sessions/{session_id}/trace").json()
    assert SECRET not in json.dumps(trace)


def test_deepseek_test_error_is_wrapped_without_secret(monkeypatch) -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": {"message": "bad key"}})

    install_mock_provider(monkeypatch, handler)
    client = TestClient(app_module.app)
    provider = import_provider(client)
    response = client.post(f"/v1/llm/providers/{provider['id']}/test").json()
    assert response["data"]["result"]["status"] == "error"
    assert "DeepSeek connection test failed" in response["data"]["result"]["message"]
    assert SECRET not in json.dumps(response)
