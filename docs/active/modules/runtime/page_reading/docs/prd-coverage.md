# A PRD Coverage

## Covered PRD Goals

- Current web page can be read by the AI companion.
- Page content can be extracted and summarized.
- Web page facts are grounded in the current page, not fabricated.
- Later summary, QA, and mindmap artifacts can trace back to page content.

## Module Commitments

- Produce high-density structured page data.
- Preserve page metadata: URL, title, domain, captured time, content hash.
- Preserve structural metadata: headings, paragraphs, chunks.
- Add paragraph-level labels and importance signals for downstream modules.

## Not Covered By A

- Chat UI.
- Streaming response.
- Final assistant answer generation.
- Mermaid mindmap generation.
- Artifact persistence.
- Trace emission.

## False-Green Risks

- Passing tests with only raw `cleanedText`.
- Generating plausible summary text without paragraph/chunk traceability.
- Using mock page text that does not resemble real pages.

