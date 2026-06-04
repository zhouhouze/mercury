import { describe, expect, it } from "vitest";
import {
  clampBubbleTop,
  clampPanelWidth,
  chooseDockEdge,
  getPageShiftWidth,
  resolveLayoutMode
} from "./panelLayout";

describe("PRD A-F panel layout rules", () => {
  it("keeps the default narrow panel at the 440px minimum", () => {
    expect(clampPanelWidth(300, 1280)).toBe(440);
  });

  it("pushes the page before the overlay threshold", () => {
    const mode = resolveLayoutMode(440, 1280, "push");
    expect(mode).toBe("push");
    expect(getPageShiftWidth(mode, 440)).toBe(440);
  });

  it("continues pushing near half screen and snaps to overlay above 52vw", () => {
    expect(resolveLayoutMode(640, 1280, "push")).toBe("push");
    expect(resolveLayoutMode(680, 1280, "push")).toBe("overlay");
  });

  it("uses hysteresis when returning from overlay to push mode", () => {
    expect(resolveLayoutMode(640, 1280, "overlay")).toBe("overlay");
    expect(resolveLayoutMode(600, 1280, "overlay")).toBe("push");
  });

  it("disables page push on small viewports", () => {
    const mode = resolveLayoutMode(440, 860, "push");
    expect(mode).toBe("overlay");
    expect(getPageShiftWidth(mode, 440)).toBe(0);
  });

  it("clamps the draggable bubble and chooses the nearest edge", () => {
    expect(clampBubbleTop(10, 900)).toBe(48);
    expect(clampBubbleTop(1200, 900)).toBe(828);
    expect(chooseDockEdge(300, 1280)).toBe("left");
    expect(chooseDockEdge(900, 1280)).toBe("right");
  });
});
