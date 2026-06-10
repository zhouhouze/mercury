import React from "react";
import { ArtifactInlineCard } from "./ArtifactInlineCard";
import type { ChatMessageView } from "./chatViewTypes";

export function AssistantMessage({ message }: { message: Extract<ChatMessageView, { role: "assistant" }> }) {
  return (
    <article className="message assistant">
      <pre>{message.text || (message.status === "streaming" ? "..." : "")}</pre>
      {message.artifacts.map((artifact) => (
        <ArtifactInlineCard artifact={artifact} key={artifact.artifactId} />
      ))}
    </article>
  );
}
