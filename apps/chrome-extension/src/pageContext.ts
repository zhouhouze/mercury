export type ExtractedPageContext = {
  tab_id?: number;
  url: string;
  title: string;
  domain: string;
  captured_at: string;
  headings: Array<{ level: number; text: string }>;
  selected_text?: string;
  visible_text: string;
  cleaned_text: string;
};

export function extractPageContext(documentRef: Document, url: string): ExtractedPageContext {
  const parsedUrl = new URL(url);
  const headings = Array.from(documentRef.querySelectorAll("h1,h2,h3"))
    .slice(0, 80)
    .map((node) => ({
      level: Number(node.tagName.slice(1)),
      text: normalizeText(node.textContent ?? "")
    }))
    .filter((heading) => heading.text.length > 0);
  const selection = documentRef.getSelection()?.toString();
  const body = documentRef.body;
  const rawVisibleText = body ? body.innerText || body.textContent || "" : "";
  const visibleText = normalizeText(rawVisibleText);

  return {
    url,
    title: documentRef.title || parsedUrl.hostname,
    domain: parsedUrl.hostname,
    captured_at: new Date().toISOString(),
    headings,
    selected_text: selection ? normalizeText(selection) : undefined,
    visible_text: visibleText.slice(0, 24000),
    cleaned_text: visibleText.slice(0, 24000)
  };
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
