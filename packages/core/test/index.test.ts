import { describe, expect, it } from "vitest";
import { DIGEST_LAYER, NORMALIZE_LAYER, RAW_LAYER } from "../src/index.js";

describe("@fathom/core", () => {
  it("3層のエントリポイントが公開されている", () => {
    expect(RAW_LAYER).toBe("raw");
    expect(NORMALIZE_LAYER).toBe("normalize");
    expect(DIGEST_LAYER).toBe("digest");
  });
});
