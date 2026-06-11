export type KeyDownSubmitInput = {
  key: string;
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  eventIsComposing?: boolean;
  nativeIsComposing?: boolean;
  composingState: boolean;
};

export type ChatInputSubmitState = {
  value: string;
  canChat: boolean;
  isSubmitting: boolean;
  isStreamingOrExecuting: boolean;
};

export function shouldSubmitOnKeyDown(input: KeyDownSubmitInput): boolean {
  if (input.key !== "Enter") return false;
  const composing = input.composingState || input.eventIsComposing === true || input.nativeIsComposing === true;
  if (composing) return false;
  const hasSendModifier = input.metaKey || input.ctrlKey;
  if (input.shiftKey && !hasSendModifier) return false;
  return true;
}

export function canSubmitChatInput(input: ChatInputSubmitState): boolean {
  return input.value.trim().length > 0 && input.canChat && !input.isSubmitting && !input.isStreamingOrExecuting;
}
