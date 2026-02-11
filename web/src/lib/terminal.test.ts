import { describe, expect, it } from "bun:test";
import { applyScreenUpdate } from "./terminal";

function baseState(frame = 10) {
  const next = applyScreenUpdate(null, {
    frame_id: frame,
    is_keyframe: true,
    screen: {
      id: "s-1",
      name: "demo",
      cols: 2,
      rows: 1,
      cursor_x: 0,
      cursor_y: 0,
      screen_rows: [
        {
          cells: [
            { char: "A", fg_color: 0, bg_color: 0, attributes: 0 },
            { char: "B", fg_color: 0, bg_color: 0, attributes: 0 },
          ],
        },
      ],
    },
  } as any);
  if (!next) {
    throw new Error("expected keyframe state");
  }
  return next;
}

describe("applyScreenUpdate", () => {
  it("marks desync when delta base frame is missing", () => {
    const prev = baseState();
    const next = applyScreenUpdate(prev, {
      frame_id: 11,
      base_frame_id: 0,
      is_keyframe: false,
      delta: { cols: 2, rows: 1, row_deltas: [] },
    } as any);
    expect(next?.waitingForKeyframe).toBe(true);
    expect(next?.frameId).toBe(10);
  });

  it("marks desync when delta frame is non-monotonic", () => {
    const prev = baseState();
    const next = applyScreenUpdate(prev, {
      frame_id: 10,
      base_frame_id: 10,
      is_keyframe: false,
      delta: { cols: 2, rows: 1, row_deltas: [] },
    } as any);
    expect(next?.waitingForKeyframe).toBe(true);
    expect(next?.frameId).toBe(10);
  });

  it("marks desync when delta dimensions differ from current screen", () => {
    const prev = baseState();
    const next = applyScreenUpdate(prev, {
      frame_id: 11,
      base_frame_id: 10,
      is_keyframe: false,
      delta: { cols: 3, rows: 1, row_deltas: [] },
    } as any);
    expect(next?.waitingForKeyframe).toBe(true);
    expect(next?.cols).toBe(2);
    expect(next?.rows).toBe(1);
  });

  it("marks desync when row delta index is out of range", () => {
    const prev = baseState();
    const next = applyScreenUpdate(prev, {
      frame_id: 11,
      base_frame_id: 10,
      is_keyframe: false,
      delta: {
        cols: 2,
        rows: 1,
        row_deltas: [{ row: 5, row_data: { cells: [] } }],
      },
    } as any);
    expect(next?.waitingForKeyframe).toBe(true);
    expect(next?.frameId).toBe(10);
  });

  it("applies valid monotonic delta", () => {
    const prev = baseState();
    const next = applyScreenUpdate(prev, {
      frame_id: 11,
      base_frame_id: 10,
      is_keyframe: false,
      delta: {
        cols: 2,
        rows: 1,
        cursor_x: 1,
        cursor_y: 0,
        row_deltas: [
          {
            row: 0,
            row_data: {
              cells: [
                { char: "X", fg_color: 0, bg_color: 0, attributes: 0 },
                { char: "Y", fg_color: 0, bg_color: 0, attributes: 0 },
              ],
            },
          },
        ],
      },
    } as any);
    expect(next?.waitingForKeyframe).toBe(false);
    expect(next?.frameId).toBe(11);
    expect(next?.rowsData[0]?.[0]?.char).toBe("X");
    expect(next?.rowsData[0]?.[1]?.char).toBe("Y");
  });
});
