import { describe, expect, it } from "vitest";
import { MASKING_LAYER } from "../src/index.js";

describe("@fathom/masking", () => {
  it("エントリポイントが公開されている", () => {
    expect(MASKING_LAYER).toBe("masking");
  });
});
