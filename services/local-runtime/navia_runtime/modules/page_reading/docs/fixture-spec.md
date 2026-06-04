# A Fixture Spec

## Required Fixture Files

```text
fixtures/article.html
fixtures/docs.html
fixtures/github_readme.html
fixtures/empty.html
```

Fixtures may be copied from `docs/navia_v1_project_docs/fixtures/real_pages/`.

## Expected Evidence Files

```text
tests/evidence/article.structured-page.json
tests/evidence/docs.structured-page.json
tests/evidence/github_readme.structured-page.json
tests/evidence/empty.error.json
```

## Required Assertions

- article produces paragraphs, chunks, annotations, and summary draft.
- docs preserves nested heading paths.
- github README preserves list/code-like sections as meaningful paragraphs or chunks.
- empty returns `PAGE_CONTEXT_REQUIRED`.

## Disallowed Fixture Behavior

- live network dependency.
- manually fabricated text unrelated to fixture body.
- one giant `cleanedText` block as only useful output.

