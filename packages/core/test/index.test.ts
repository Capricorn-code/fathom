import { describe, expect, it } from "vitest";
import { DIGEST_LAYER, normalizeRecord, streamRawLines } from "../src/index.js";

describe("@fathom/core", () => {
  it("層1/層2のAPIと未実装層(層3)のエントリポイントが公開されている", () => {
    expect(streamRawLines).toBeTypeOf("function");
    expect(normalizeRecord).toBeTypeOf("function");
    expect(DIGEST_LAYER).toBe("digest");
  });
});
