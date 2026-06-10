import React from "react";
import type { InlineStatus } from "./chatViewTypes";

export function InlineStatusRow({ status }: { status: InlineStatus }) {
  return (
    <div className="inline-status-row" role="status" aria-live="polite">
      <span className="inline-status-dot" aria-hidden="true" />
      <span>{status.text}</span>
    </div>
  );
}
