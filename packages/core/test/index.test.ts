import { describe, expect, it } from "vitest";
import { DIGEST_LAYER, NORMALIZE_LAYER, streamRawLines } from "../src/index.js";

describe("@fathom/core", () => {
  it("層1のAPIと未実装層(層2/層3)のエントリポイントが公開されている", () => {
    expect(streamRawLines).toBeTypeOf("function");
    expect(NORMALIZE_LAYER).toBe("normalize");
    expect(DIGEST_LAYER).toBe("digest");
  });
});
