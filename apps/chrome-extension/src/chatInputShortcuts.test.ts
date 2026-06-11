import { describe, expect, it } from "vitest";
import { canSubmitChatInput, shouldSubmitOnKeyDown } from "./chatInputShortcuts";

const baseKey = {
  key: "Enter",
  shiftKey: false,
  metaKey: false,
  ctrlKey: false,
  composingState: false
};

describe("chat input shortcuts", () => {
  it("submits on plain Enter", () => {
    expect(shouldSubmitOnKeyDown(baseKey)).toBe(true);
  });

  it("does not submit on Shift+Enter without a send modifier", () => {
    expect(shouldSubmitOnKeyDown({ ...baseKey, shiftKey: true })).toBe(false);
  });

  it("submits on Cmd+Enter and Ctrl+Enter", () => {
    expect(shouldSubmitOnKeyDown({ ...baseKey, metaKey: true })).toBe(true);
    expect(shouldSubmitOnKeyDown({ ...baseKey, ctrlKey: true })).toBe(true);
  });

  it("does not submit on non-Enter keys", () => {
    expect(shouldSubmitOnKeyDown({ ...baseKey, key: "a" })).toBe(false);
  });

  it("does not submit while IME composition is active", () => {
    expect(shouldSubmitOnKeyDown({ ...baseKey, composingState: true })).toBe(false);
    expect(shouldSubmitOnKeyDown({ ...baseKey, eventIsComposing: true })).toBe(false);
    expect(shouldSubmitOnKeyDown({ ...baseKey, nativeIsComposing: true })).toBe(false);
  });

  it("allows Shift+Cmd/Ctrl+Enter to submit because a send modifier is present", () => {
    expect(shouldSubmitOnKeyDown({ ...baseKey, shiftKey: true, metaKey: true })).toBe(true);
    expect(shouldSubmitOnKeyDown({ ...baseKey, shiftKey: true, ctrlKey: true })).toBe(true);
  });

  it("blocks empty and whitespace-only values", () => {
    for (const value of ["", "   ", "\n\n"]) {
      expect(canSubmitChatInput({ value, canChat: true, isSubmitting: false, isStreamingOrExecuting: false })).toBe(false);
    }
  });

  it("allows non-empty values when chat is ready", () => {
    expect(canSubmitChatInput({ value: "你好", canChat: true, isSubmitting: false, isStreamingOrExecuting: false })).toBe(true);
  });

  it("blocks when chat is unavailable, submitting, streaming, or executing", () => {
    expect(canSubmitChatInput({ value: "你好", canChat: false, isSubmitting: false, isStreamingOrExecuting: false })).toBe(false);
    expect(canSubmitChatInput({ value: "你好", canChat: true, isSubmitting: true, isStreamingOrExecuting: false })).toBe(false);
    expect(canSubmitChatInput({ value: "你好", canChat: true, isSubmitting: false, isStreamingOrExecuting: true })).toBe(false);
  });
});
