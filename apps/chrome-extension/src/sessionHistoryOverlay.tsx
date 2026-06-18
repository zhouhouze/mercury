import React, { useEffect } from "react";
import type { ChatSession } from "./runtimeClient";
import { SessionHistoryList } from "./sessionHistoryView";

export function SessionHistoryOverlay({
  sessions,
  currentSessionId,
  switchingSession,
  creatingSession,
  canCreateSession,
  error,
  onClose,
  onSelect,
  onCreate
}: {
  sessions: ChatSession[];
  currentSessionId?: string;
  switchingSession: boolean;
  creatingSession: boolean;
  canCreateSession: boolean;
  error: string | null;
  onClose: () => void;
  onSelect: (sessionId: string) => void;
  onCreate: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <>
      <button
        className="session-history-backdrop"
        type="button"
        aria-label="关闭聊天历史记录"
        data-testid="session-history-backdrop"
        onClick={onClose}
      />
      <div
        className="session-menu session-history-panel"
        data-testid="session-menu"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-history-title"
      >
        <div className="session-menu-header">
          <span id="session-history-title">聊天历史记录</span>
          <button className="session-menu-close" type="button" aria-label="关闭会话菜单" onClick={onClose}>
            ×
          </button>
        </div>
        {error ? <div className="session-menu-error">{error}</div> : null}
        {switchingSession ? <div className="session-menu-loading">正在加载会话……</div> : null}
        <div className="session-menu-list">
          <SessionHistoryList sessions={sessions} currentSessionId={currentSessionId} disabled={switchingSession} onSelect={onSelect} />
        </div>
        <div className="session-menu-footer">
          <button
            className="session-menu-new"
            type="button"
            disabled={!canCreateSession || creatingSession}
            onClick={onCreate}
          >
            <span>+ 新会话</span>
            <kbd>⌘N</kbd>
          </button>
        </div>
      </div>
    </>
  );
}
