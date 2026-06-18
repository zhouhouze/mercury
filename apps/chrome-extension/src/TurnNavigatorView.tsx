import React, { useEffect, useRef } from "react";
import type { ConversationTurnAnchor } from "./turnNavigator";
import { turnMetaLabel } from "./turnNavigator";

export function TurnNavigatorView({
  turns,
  visible,
  open,
  onToggle,
  onClose,
  onSelect
}: {
  turns: ConversationTurnAnchor[];
  visible: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (turnId: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const closeAndRestoreFocus = () => {
      onClose();
      window.setTimeout(() => triggerRef.current?.focus(), 0);
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target || rootRef.current?.contains(target)) return;
      closeAndRestoreFocus();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeAndRestoreFocus();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!visible) return null;
  return (
    <div className="turn-navigator" data-testid="turn-navigator" ref={rootRef}>
      <button
        ref={triggerRef}
        className={`turn-navigator-trigger ${open ? "active" : ""}`}
        type="button"
        aria-expanded={open}
        aria-label="本会话目录"
        title="本会话目录"
        onClick={onToggle}
      >
        <span aria-hidden="true">☰</span>
        <span>目录 {turns.length}</span>
      </button>
      {open ? (
        <div className="turn-navigator-popover" data-testid="turn-navigator-popover">
          <div className="turn-navigator-heading">本会话目录</div>
          <div className="turn-navigator-list">
            {turns.length === 0 ? (
              <div className="turn-navigator-empty">
                <strong>本会话还没有对话</strong>
                <span>开始提问后，会自动生成目录。</span>
              </div>
            ) : null}
            {turns.map((turn, index) => (
              <button className="turn-navigator-item" type="button" key={turn.turnId} onClick={() => onSelect(turn.turnId)}>
                <span className="turn-navigator-index">{index + 1}</span>
                <span className="turn-navigator-copy">
                  <span className="turn-navigator-title">{turn.title}</span>
                  <span className="turn-navigator-meta">{turnMetaLabel(turn)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
