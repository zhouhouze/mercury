# V1.2-AC Real Chrome/Chromium E2E Evidence

Status: passed_with_direct_extension_page_fallback

Command:

```bash
pnpm --dir apps/chrome-extension e2e:chrome
```

Previous blocker:

```text
MANUAL_REQUIRED: extension service worker was not exposed. pages=["about:blank"] workers=[]
```

ChromeCli / DevTools follow-up:

```text
Started Google Chrome with:
--remote-debugging-port=9223
--disable-extensions-except=apps/chrome-extension/chrome-mv3-unpacked
--load-extension=apps/chrome-extension/chrome-mv3-unpacked

DevTools /json/list showed:
- page: http://127.0.0.1:18080/article.html
- service_worker: chrome-extension://fignfifoniblkonapihmkfakmlgkbkcf/service_worker.js

Then opened:
chrome-extension://fignfifoniblkonapihmkfakmlgkbkcf/sidepanel.html
```

ChromeCli conclusion:

- Extension loading is verified in a real Chrome debugging instance.
- The extension service worker can be exposed through Chrome DevTools when Chrome is started manually with extension flags.
- Full Side Panel UI operation is still not completed automatically because CDP WebSocket / DevTools target access was unstable in this environment.

Follow-up implementation:

- Default E2E browser mode was switched to Playwright Chromium because it exposes MV3 service workers reliably in this environment.
- The script still tries `chrome.sidePanel.open` first.
- If the real browser Side Panel target is not exposed to automation, the script opens the same extension `sidepanel.html` directly with an E2E-only `naviaE2ETabId` query parameter.
- The direct extension page still runs the real Side Panel application, real Chrome extension APIs, real content extraction against a real fixture tab, and the real local Runtime.
- Page-reading intents no longer send `coreProvider` overrides, so summary / page QA / mindmap route through Runtime tool adapters instead of bypassing A/C via CoreProvider.
- The script patches Runtime settings to `mock` only as a deterministic default for non-page general chat, avoiding any external LLM API key dependency.

Passing result:

```json
{
  "status": "passed",
  "runtimeUrl": "http://127.0.0.1:17861",
  "browserMode": "chromium",
  "sidePanelMode": "direct_extension_page",
  "checks": [
    "online",
    "page context",
    "summary",
    "question",
    "mindmap",
    "refresh recovery"
  ]
}
```

Current acceptance meaning:

- Automated backend and frontend contract tests passed.
- Real extension UI application E2E passed in Chromium with direct extension page fallback.
- The test covers page context capture, Runtime submission, summary, page QA, C Mindmap rendering, and refresh recovery.
- Native Chrome Side Panel window automation is still environment-sensitive because `chrome.sidePanel.open` can require a browser-managed user gesture and may not expose `sidepanel.html` as a Playwright page.

Decision:

- V1.2-AC can claim automated extension UI E2E coverage through the stable direct extension page fallback.
- Do not claim that native browser Side Panel window automation is fully solved.
- Visual screenshot acceptance has been executed through `pnpm --dir apps/chrome-extension e2e:chrome:visual`.
- Visual report: `docs/active/project/evidence/v1_2_ac/visual-chrome-cli/index.html`.
- For manual product acceptance, the user should still verify the installed Chrome extension opens as a normal native Side Panel.
