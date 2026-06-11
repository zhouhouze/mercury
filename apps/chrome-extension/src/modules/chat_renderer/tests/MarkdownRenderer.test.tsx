import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarkdownRenderer } from "../MarkdownRenderer";

function html(content: string, isStreaming = false): string {
  return renderToStaticMarkup(<MarkdownRenderer content={content} isStreaming={isStreaming} />);
}

describe("MarkdownRenderer", () => {
  it("renders bold, italic, lists, inline code and blockquotes", () => {
    const output = html(["**强势** 和 *风险*", "- 年轻核心", "- 防守", "`cap space`", "> 无实时搜索"].join("\n"));

    expect(output).toContain("<strong>强势</strong>");
    expect(output).toContain("<em>风险</em>");
    expect(output).toContain("<ul>");
    expect(output).toContain("<li>年轻核心</li>");
    expect(output).toContain("<code>cap space</code>");
    expect(output).toContain("<blockquote>");
  });

  it("renders markdown tables inside an overflow wrapper", () => {
    const output = html("| 维度 | 优势 |\n| --- | --- |\n| 阵容 | 年轻 |");

    expect(output).toContain("markdown-table-wrap");
    expect(output).toContain("<table>");
    expect(output).toContain("<th>维度</th>");
    expect(output).toContain("<td>年轻</td>");
  });

  it("renders code blocks and hr", () => {
    const output = html("```ts\nconst x = 1;\n```\n---");

    expect(output).toContain("markdown-code-block");
    expect(output).toContain("const x = 1;");
    expect(output).toContain("<hr/>");
  });

  it("sanitizes javascript links and protects external links", () => {
    const unsafe = html("[bad](javascript:alert(1))");
    const external = html("[site](https://example.com)");

    expect(unsafe).not.toContain("javascript:");
    expect(unsafe).toContain("<span>bad</span>");
    expect(external).toContain('rel="noopener noreferrer"');
    expect(external).toContain('target="_blank"');
  });

  it("uses a single plain block while streaming", () => {
    const output = html("**马", true);

    expect(output).toContain("markdown-streaming");
    expect(output).not.toContain("<strong>");
  });
});
