import React from "react";
import type { DeferredNotice } from "./chatViewTypes";

export function DeferredCapabilityNotice({ notice }: { notice: DeferredNotice }) {
  return (
    <div className="deferred-notice" role="status" aria-live="polite">
      {notice.message}
    </div>
  );
}
