# C Fixture Spec

## Required Fixture Files

```text
fixtures/article.structured-page.json
fixtures/docs.structured-page.json
fixtures/github_readme.structured-page.json
fixtures/validation_failure.structured-page.json
```

## Expected Evidence Files

```text
tests/evidence/article.mindmap.json
tests/evidence/docs.mindmap.json
tests/evidence/github_readme.mindmap.json
tests/evidence/validation_failure.mindmap.json
```

## Required Assertions

- normal fixtures produce Mermaid source and `nodeSourceMap`.
- sparse heading fixture still produces grounded nodes.
- validation failure fixture records one repair attempt at most.
- no fixture requires live browser or network access.

