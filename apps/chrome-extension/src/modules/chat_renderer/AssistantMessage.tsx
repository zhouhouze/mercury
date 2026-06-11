import React from "react";
import { ArtifactInlineCard } from "./ArtifactInlineCard";
import { MarkdownRenderer } from "./MarkdownRenderer";
import type { ChatMessageView } from "./chatViewTypes";

export function AssistantMessage({ message }: { message: Extract<ChatMessageView, { role: "assistant" }> }) {
  return (
    <article className="message assistant">
      <MarkdownRenderer content={message.text} isStreaming={message.status === "streaming"} />
      {message.artifacts.map((artifact) => (
        <ArtifactInlineCard artifact={artifact} key={artifact.artifactId} />
      ))}
    </article>
  );
}
