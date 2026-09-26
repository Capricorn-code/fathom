import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { runSummary } from "../src/commands/summary.js";

const fixtureJsonl = fileURLToPath(
  new URL("./fixtures/-Users-anon-sample-project/sess-001.jsonl", import.meta.url),
);
const missingJsonl = fileURLToPath(
  new URL("./fixtures/-Users-anon-sample-project/no-such-session.jsonl", import.meta.url),
);

interface Captured {
  out: string[];
  err: string[];
}

const capture = (): Captured & { write: (t: string) => void; writeError: (t: string) => void } => {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    write: (t: string) => out.push(t),
    writeError: (t: string) => err.push(t),
  };
};

const writeConfig = async (dir: string, allowedProjects: readonly string[]): Promise<string> => {
  const configPath = join(dir, "config.json");
  await writeFile(configPath, JSON.stringify({ allowedProjects }), "utf8");
  return configPath;
};

describe("CLI: summaryコマンド", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "fathom-test-"));
  });

  describe("正常系", () => {
    it("許可リストにあるプロジェクトのJSONLはサマリMDを出力し終了コード0", async () => {
      const configPath = await writeConfig(tempDir, ["-Users-anon-sample-project"]);
      const io = capture();
      const code = await runSummary(fixtureJsonl, { configPath, ...io });
      expect(code).toBe(0);
      const md = io.out.join("");
      expect(md).toContain("# セッションサマリ: sess-001");
      expect(md).toContain("設定読み込みを実装して");
      expect(md).toContain("実装します");
    });
  });

  describe("許可リスト外の拒否(ADR-006)", () => {
    it("許可リストにないプロジェクトは解析を拒否し、追加方法を案内して非0終了する", async () => {
      const configPath = await writeConfig(tempDir, ["-Users-anon-other-project"]);
      const io = capture();
      const code = await runSummary(fixtureJsonl, { configPath, ...io });
      expect(code).not.toBe(0);
      expect(io.out.join("")).not.toContain("# セッションサマリ");
      const message = io.err.join("");
      expect(message).toContain("許可リスト");
      expect(message).toContain("allowedProjects");
      expect(message).toContain("-Users-anon-sample-project");
    });

    it("設定ファイルが存在しない場合も解析せず非0終了する(デフォルト全拒否)", async () => {
      const io = capture();
      const code = await runSummary(fixtureJsonl, {
        configPath: join(tempDir, "no-config.json"),
        ...io,
      });
      expect(code).not.toBe(0);
      expect(io.out.join("")).not.toContain("# セッションサマリ");
    });
  });

  describe("入力エラー", () => {
    it("存在しないパスは人間向けメッセージで非0終了する(スタックトレースを出さない)", async () => {
      const configPath = await writeConfig(tempDir, ["-Users-anon-sample-project"]);
      const io = capture();
      const code = await runSummary(missingJsonl, { configPath, ...io });
      expect(code).not.toBe(0);
      const message = io.err.join("");
      expect(message).toContain("見つかりません");
      expect(message).not.toContain("ENOENT");
      expect(message).not.toContain("at ");
    });
  });
});
