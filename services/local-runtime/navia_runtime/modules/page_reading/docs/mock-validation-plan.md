# A Page Perception Mock Validation Plan

## Fixtures

Use real HTML or real-page fixtures:

- `article.html`
- `docs.html`
- `github_readme.html`
- `image_rich.html` for DOM-readable image metadata.
- `tables_lists_code.html` for table, list, and code block planning / implementation.
- `empty.html` for `PAGE_CONTEXT_REQUIRED`.

Fixtures may be copied or referenced from `docs/navia_v1_project_docs/fixtures/real_pages/`.

## Required Scenarios

- Article page with paragraphs and headings.
- Documentation page with nested sections.
- GitHub README-like page with lists, code-ish content, and headings.
- Image-rich page with alt, caption, title, aria-label, and nearby text.
- Image-rich page with no readable image metadata, which must produce unknown image metadata rather than inferred content.
- Table/list/code page that preserves source order.
- Page with missing optional selector ranges.
- Page with no useful readable text.

## Pass Criteria

- Produces one `StructuredPageContext` per valid fixture.
- `paragraphs.length > 0`.
- `chunks.length > 0`.
- `annotations.length === paragraphs.length` or every unannotated paragraph has explicit fallback.
- Every chunk references `pageId`.
- Every paragraph has `paragraphId`, `order`, `text`, and `headingPath`.
- `contentHash` is stable for identical content.
- Image blocks only contain DOM-readable metadata or approved OCR input.
- Table/list/code blocks do not break paragraph or chunk order.

## Fail Criteria

- A returns a single giant paragraph for a multi-section page.
- A loses source order.
- A creates summary / answer / mindmap artifacts.
- A requires a live Chrome tab for module tests.
- A describes image content without DOM-readable metadata or approved OCR input.
- A directly calls OCR, vision, video, live stream, MCP, Skill, or external API.
- A declares video or live perception complete in V1.2.

## Evidence

Save module validation output under `tests/evidence/` during implementation. Evidence should include JSON output and assertion logs.

Current evidence files:

- `tests/evidence/article.structured-page.json`
- `tests/evidence/docs.structured-page.json`
- `tests/evidence/github_readme.structured-page.json`
- `tests/evidence/image_rich.structured-page.json`
- `tests/evidence/tables_lists_code.structured-page.json`
- `tests/evidence/empty.error.json`

Current validation command:

```bash
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/navia_runtime/modules/page_reading/tests
```

Current result:

```text
8 passed
```
