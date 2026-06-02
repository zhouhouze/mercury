import { describe, expect, it } from "vitest";
import { extractPageContext } from "./pageContext";

describe("extractPageContext", () => {
  it("extracts title, domain, headings and cleaned text", () => {
    document.body.innerHTML = `
      <main>
        <h1>Article title</h1>
        <h2>Section</h2>
        <p>This is a realistic page paragraph.</p>
      </main>
    `;
    document.title = "Fixture page";

    const context = extractPageContext(document, "https://example.com/article");
    expect(context.title).toBe("Fixture page");
    expect(context.domain).toBe("example.com");
    expect(context.headings).toEqual([
      { level: 1, text: "Article title" },
      { level: 2, text: "Section" }
    ]);
    expect(context.cleaned_text).toContain("realistic page paragraph");
  });
});
