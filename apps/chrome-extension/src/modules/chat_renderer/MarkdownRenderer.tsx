import React from "react";

type Block =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 1 | 2 | 3 | 4; text: string }
  | { type: "blockquote"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; code: string; language?: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "hr" };

export function MarkdownRenderer({ content, isStreaming = false }: { content: string; isStreaming?: boolean }) {
  if (isStreaming) {
    return <pre className="markdown-streaming">{content || "..."}</pre>;
  }
  const blocks = parseBlocks(content);
  return (
    <div className="markdown-renderer">
      {blocks.map((block, index) => (
        <MarkdownBlock block={block} key={`${block.type}-${index}`} />
      ))}
    </div>
  );
}

function MarkdownBlock({ block }: { block: Block }) {
  if (block.type === "heading") {
    if (block.level === 1) return <h1>{renderInline(block.text)}</h1>;
    if (block.level === 2) return <h2>{renderInline(block.text)}</h2>;
    if (block.level === 3) return <h3>{renderInline(block.text)}</h3>;
    return <h4>{renderInline(block.text)}</h4>;
  }
  if (block.type === "paragraph") return <p>{renderInline(block.text)}</p>;
  if (block.type === "blockquote") return <blockquote>{renderInline(block.text)}</blockquote>;
  if (block.type === "ul") return <ul>{block.items.map((item, index) => <li key={index}>{renderInline(item)}</li>)}</ul>;
  if (block.type === "ol") return <ol>{block.items.map((item, index) => <li key={index}>{renderInline(item)}</li>)}</ol>;
  if (block.type === "code") {
    return (
      <pre className="markdown-code-block">
        <code>{block.code}</code>
      </pre>
    );
  }
  if (block.type === "table") {
    return (
      <div className="markdown-table-wrap">
        <table>
          <thead>
            <tr>{block.headers.map((header, index) => <th key={index}>{renderInline(header)}</th>)}</tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{renderInline(cell)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return <hr />;
}

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let index = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      index += 1;
      continue;
    }
    if (trimmed.startsWith("```")) {
      flushParagraph();
      const language = trimmed.slice(3).trim() || undefined;
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", language, code: code.join("\n") });
      continue;
    }
    const heading = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      const level = heading[1].length as 1 | 2 | 3 | 4;
      blocks.push({ type: "heading", level, text: heading[2].replace(/\s+#+$/, "").trim() });
      index += 1;
      continue;
    }
    if (/^---+$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: "hr" });
      index += 1;
      continue;
    }
    if (isTableStart(lines, index)) {
      flushParagraph();
      const headers = splitTableRow(lines[index]);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && isTableRow(lines[index])) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }
    if (/^>\s?/.test(trimmed)) {
      flushParagraph();
      const quotes: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quotes.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "blockquote", text: quotes.join(" ") });
      continue;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }
    paragraph.push(trimmed);
    index += 1;
  }
  flushParagraph();
  return blocks;
}

function isTableStart(lines: string[], index: number): boolean {
  return isTableRow(lines[index]) && index + 1 < lines.length && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1]);
}

function isTableRow(line: string): boolean {
  return line.includes("|") && line.trim().replace(/\|/g, "").trim().length > 0;
}

function splitTableRow(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    const token = match[0];
    const key = `${match.index}-${token}`;
    if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (link) nodes.push(renderLink(link[1], link[2], key));
    }
    cursor = match.index + token.length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function renderLink(label: string, href: string, key: string) {
  const safeHref = sanitizeHref(href);
  if (!safeHref) return <span key={key}>{label}</span>;
  const external = /^https?:\/\//i.test(safeHref);
  return (
    <a href={safeHref} key={key} rel={external ? "noopener noreferrer" : undefined} target={external ? "_blank" : undefined}>
      {label}
    </a>
  );
}

function sanitizeHref(href: string): string | undefined {
  const trimmed = href.trim();
  if (/^javascript:/i.test(trimmed)) return undefined;
  return trimmed;
}
