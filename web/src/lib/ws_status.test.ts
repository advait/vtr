import { describe, expect, it } from "bun:test";
import { isTerminalStatusCode } from "./ws";

describe("isTerminalStatusCode", () => {
  it("returns true for non-retriable protocol errors", () => {
    expect(isTerminalStatusCode(3)).toBe(true);
    expect(isTerminalStatusCode(5)).toBe(true);
    expect(isTerminalStatusCode(9)).toBe(true);
    expect(isTerminalStatusCode(12)).toBe(true);
  });

  it("returns false for retriable transport/service errors", () => {
    expect(isTerminalStatusCode(14)).toBe(false);
    expect(isTerminalStatusCode(4)).toBe(false);
    expect(isTerminalStatusCode(8)).toBe(false);
  });
});
