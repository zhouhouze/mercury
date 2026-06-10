import React from "react";
import type { ChatMessageView } from "./chatViewTypes";

export function UserMessage({ message }: { message: Extract<ChatMessageView, { role: "user" }> }) {
  return (
    <article className="message user">
      <pre>{message.text}</pre>
    </article>
  );
}
