# Mercury V1.0 LLM Provider Settings

## Runtime Authority

Mercury V1.0 stores LLM provider settings in the Local Runtime. The Chrome extension must call Runtime settings/provider endpoints and must not call DeepSeek directly.

## Provider Contract

Provider API responses expose only non-secret fields:

```json
{
  "id": "prov_...",
  "type": "deepseek",
  "name": "DeepSeek",
  "baseUrl": "https://api.deepseek.com",
  "models": ["deepseek-v4-flash", "deepseek-v4-pro"],
  "defaultModel": "deepseek-v4-flash",
  "isDefault": true,
  "apiKeyMasked": "sk-****7890",
  "testStatus": null,
  "createdAt": "2026-06-09T00:00:00Z",
  "updatedAt": "2026-06-09T00:00:00Z"
}
```

`apiKey` must only appear in import/update requests. It must not appear in provider GET/list/test responses, SSE events, trace records, or frontend state after save.

## Model Defaults

The recommended default model is `deepseek-v4-flash`. Runtime also accepts configured model lists that include compatibility models such as `deepseek-chat` and `deepseek-reasoner`. Reasoning-oriented `deepseek-v4-pro` is reserved for future thinking/reasoning configuration.

## Secret Storage Debt

V1.0 stores API keys in SQLite plaintext for local-only development. This is technical debt. The stored provider structure reserves `secretStorage`, `apiKeyRef`, and `apiKeyMasked` so the backend can later migrate to OS keychain or encrypted storage without changing frontend API responses.

## Chat Stream Behavior

Generic chat uses the configured default provider and emits only existing AgentEvent types such as `response.delta`, `response.done`, and `error`. Missing, incomplete, or failing providers return recoverable `error` events. Existing reading-tool intents continue to use the existing AgentEvent tool/artifact pipeline.
