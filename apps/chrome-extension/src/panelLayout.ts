export type DockEdge = "left" | "right";
export type LayoutMode = "push" | "overlay";

export const MIN_PANEL_WIDTH = 440;
export const MOBILE_OVERLAY_BREAKPOINT = 900;
export const OVERLAY_ENTER_RATIO = 0.52;
export const PUSH_RETURN_RATIO = 0.48;
export const MAX_PANEL_RATIO = 0.8;

export function clampPanelWidth(requestedWidth: number, viewportWidth: number): number {
  const mobileMin = Math.max(320, Math.min(viewportWidth, MIN_PANEL_WIDTH));
  const minWidth = viewportWidth < MIN_PANEL_WIDTH ? mobileMin : MIN_PANEL_WIDTH;
  const maxWidth = Math.max(minWidth, Math.floor(viewportWidth * MAX_PANEL_RATIO));
  return Math.min(Math.max(Math.round(requestedWidth), minWidth), maxWidth);
}

export function resolveLayoutMode(
  panelWidth: number,
  viewportWidth: number,
  previousMode: LayoutMode = "push"
): LayoutMode {
  if (viewportWidth < MOBILE_OVERLAY_BREAKPOINT) return "overlay";
  const ratio = panelWidth / viewportWidth;
  if (previousMode === "overlay") {
    return ratio < PUSH_RETURN_RATIO ? "push" : "overlay";
  }
  return ratio > OVERLAY_ENTER_RATIO ? "overlay" : "push";
}

export function getPageShiftWidth(mode: LayoutMode, panelWidth: number): number {
  return mode === "push" ? panelWidth : 0;
}

export function clampBubbleTop(requestedTop: number, viewportHeight: number): number {
  const minTop = 48;
  const maxTop = Math.max(minTop, viewportHeight - 72);
  return Math.min(Math.max(Math.round(requestedTop), minTop), maxTop);
}

export function chooseDockEdge(pointerX: number, viewportWidth: number): DockEdge {
  return pointerX < viewportWidth / 2 ? "left" : "right";
}
