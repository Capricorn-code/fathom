import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { runSetup } from "../src/commands/setup.js";

interface Io {
  out: string[];
  err: string[];
  write: (t: string) => void;
  writeError: (t: string) => void;
}

const capture = (): Io => {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    write: (t: string) => out.push(t),
    writeError: (t: string) => err.push(t),
  };
};

describe("CLI: 初回対話セットアップ", () => {
  let tempDir: string;
  let projectsDir: string;
  let configPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "fathom-setup-"));
    projectsDir = join(tempDir, "projects");
    configPath = join(tempDir, "config", "fathom", "config.json");
    await mkdir(join(projectsDir, "-Users-anon-hobby-app"), { recursive: true });
    await mkdir(join(projectsDir, "-Users-anon-oss-tool"), { recursive: true });
  });

  describe("セットアップ起動", () => {
    it("プロジェクト一覧が読みやすい名前で提示され、業務プロジェクトへの注意が表示される", async () => {
      const io = capture();
      await runSetup({ projectsDir, configPath, ...io, ask: async () => "1" });
      const shown = io.out.join("\n");
      expect(shown).toContain("Users/anon/hobby/app");
      expect(shown).toContain("Users/anon/oss/tool");
      expect(shown).toContain("業務プロジェクトは選ばないでください");
    });
  });

  describe("許可リスト生成", () => {
    it("選択したプロジェクトだけを含むconfig.jsonが生成される", async () => {
      const io = capture();
      const code = await runSetup({ projectsDir, configPath, ...io, ask: async () => "1" });
      expect(code).toBe(0);
      const config: unknown = JSON.parse(await readFile(configPath, "utf8"));
      expect(config).toEqual({ allowedProjects: ["-Users-anon-hobby-app"] });
    });

    it("カンマ区切りで複数選択できる", async () => {
      const io = capture();
      const code = await runSetup({ projectsDir, configPath, ...io, ask: async () => "1,2" });
      expect(code).toBe(0);
      const config: unknown = JSON.parse(await readFile(configPath, "utf8"));
      expect(config).toEqual({
        allowedProjects: ["-Users-anon-hobby-app", "-Users-anon-oss-tool"],
      });
    });

    it("無効な選択(範囲外・数字以外)は許可リストを生成せず非0終了する", async () => {
      const io = capture();
      const code = await runSetup({ projectsDir, configPath, ...io, ask: async () => "99" });
      expect(code).not.toBe(0);
      await expect(readFile(configPath, "utf8")).rejects.toThrow();
    });
  });

  describe("候補なし", () => {
    it("projectsディレクトリが存在しない場合、ログが見つからない旨を案内して終了する", async () => {
      const io = capture();
      const code = await runSetup({
        projectsDir: join(tempDir, "no-such-dir"),
        configPath,
        ...io,
        ask: async () => "1",
      });
      expect(code).not.toBe(0);
      expect(io.err.join("\n")).toContain("見つかりません");
    });

    it("projectsディレクトリが空でも破綻しない", async () => {
      const emptyDir = join(tempDir, "empty-projects");
      await mkdir(emptyDir, { recursive: true });
      const io = capture();
      const code = await runSetup({
        projectsDir: emptyDir,
        configPath,
        ...io,
        ask: async () => "1",
      });
      expect(code).not.toBe(0);
      expect(io.err.join("\n")).toContain("見つかりません");
    });
  });
});

describe("summaryコマンドとの統合(設定なし実行でセットアップが起動する)", () => {
  it("設定なしでsummaryを実行するとセットアップ後にそのまま解析まで完了する", async () => {
    const { fileURLToPath } = await import("node:url");
    const { runSummary } = await import("../src/commands/summary.js");
    const tempDir = await mkdtemp(join(tmpdir(), "fathom-integrate-"));
    const configPath = join(tempDir, "config.json");
    const fixturesDir = fileURLToPath(new URL("./fixtures", import.meta.url));
    const fixtureJsonl = join(fixturesDir, "-Users-anon-sample-project", "sess-001.jsonl");
    const io = capture();
    const code = await runSummary(fixtureJsonl, {
      configPath,
      projectsDir: fixturesDir,
      ask: async () => "1",
      ...io,
    });
    expect(code).toBe(0);
    expect(io.out.join("\n")).toContain("# セッションサマリ: sess-001");
    const config: unknown = JSON.parse(await readFile(configPath, "utf8"));
    expect(config).toEqual({ allowedProjects: ["-Users-anon-sample-project"] });
  });
});
