import { describe, expect, it } from "vitest";
import { CONFIG_PATH_HINT } from "../src/config.js";

describe("@fathom/cli", () => {
  it("設定ファイルのパスが定義されている", () => {
    expect(CONFIG_PATH_HINT).toBe("~/.config/fathom/config.json");
  });
});
