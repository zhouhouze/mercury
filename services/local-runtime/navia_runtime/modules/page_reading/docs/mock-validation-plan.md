# A Page Reading Mock Validation Plan

## Fixtures

Use real HTML or real-page fixtures:

- `article.html`
- `docs.html`
- `github_readme.html`

Fixtures may be copied or referenced from `docs/navia_v1_project_docs/fixtures/real_pages/`.

## Required Scenarios

- Article page with paragraphs and headings.
- Documentation page with nested sections.
- GitHub README-like page with lists, code-ish content, and headings.
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

## Fail Criteria

- A returns a single giant paragraph for a multi-section page.
- A loses source order.
- A creates summary / answer / mindmap artifacts.
- A requires a live Chrome tab for module tests.

## Evidence

Save module validation output under `tests/evidence/` during implementation. Evidence should include JSON output and assertion logs.

