import { describe, expect, it } from "vitest";
import { buildSessionDigest, normalizeRecord, streamRawLines } from "../src/index.js";

describe("@fathom/core", () => {
  it("3層のAPIが公開されている", () => {
    expect(streamRawLines).toBeTypeOf("function");
    expect(normalizeRecord).toBeTypeOf("function");
    expect(buildSessionDigest).toBeTypeOf("function");
  });
});
