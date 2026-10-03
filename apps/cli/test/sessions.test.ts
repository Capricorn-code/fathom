import { mkdir, mkdtemp, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { runSummary } from "../src/commands/summary.js";
import { listSessions } from "../src/sessions.js";

const fixturesDir = fileURLToPath(new URL("./fixtures", import.meta.url));

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

const askQueue = (answers: readonly string[]): (() => Promise<string>) => {
  const queue = [...answers];
  return async () => queue.shift() ?? "";
};

describe("セッション一覧(listSessions)", () => {
  let projectsDir: string;

  beforeEach(async () => {
    projectsDir = await mkdtemp(join(tmpdir(), "fathom-sessions-"));
    await mkdir(join(projectsDir, "-Users-anon-hobby-app"), { recursive: true });
    await mkdir(join(projectsDir, "-Users-anon-secret-work"), { recursive: true });
    const older = join(projectsDir, "-Users-anon-hobby-app", "old-session.jsonl");
    const newer = join(projectsDir, "-Users-anon-hobby-app", "new-session.jsonl");
    await writeFile(older, '{"type":"user"}\n');
    await writeFile(newer, '{"type":"user"}\n');
    await utimes(older, new Date("2026-01-01"), new Date("2026-01-01"));
    await utimes(newer, new Date("2026-06-01"), new Date("2026-06-01"));
    await writeFile(
      join(projectsDir, "-Users-anon-secret-work", "secret.jsonl"),
      '{"type":"user"}\n',
    );
  });

  it("許可プロジェクトのセッションだけが新しい順で得られる", async () => {
    const sessions = await listSessions(projectsDir, ["-Users-anon-hobby-app"]);
    expect(sessions.map((s) => s.path.split("/").pop())).toEqual([
      "new-session.jsonl",
      "old-session.jsonl",
    ]);
    expect(JSON.stringify(sessions)).not.toContain("secret");
  });

  it("読みやすいプロジェクト名(label)が付いている", async () => {
    const sessions = await listSessions(projectsDir, ["-Users-anon-hobby-app"]);
    expect(sessions[0]?.label).toContain("Users/anon/hobby/app");
  });
});

describe("引数なしの fathom summary", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "fathom-argless-"));
  });

  const writeConfig = async (allowedProjects: readonly string[]): Promise<string> => {
    const configPath = join(tempDir, "config.json");
    await writeFile(configPath, JSON.stringify({ allowedProjects }), "utf8");
    return configPath;
  };

  it("セッション一覧が提示され、番号選択でサマリが出力される", async () => {
    const configPath = await writeConfig(["-Users-anon-sample-project"]);
    const io = capture();
    const code = await runSummary(undefined, {
      configPath,
      projectsDir: fixturesDir,
      ask: askQueue(["1"]),
      ...io,
    });
    expect(code).toBe(0);
    const shown = io.out.join("\n");
    expect(shown).toContain("Users/anon/sample/project");
    expect(shown).toContain("# セッションサマリ: sess-001");
  });

  it("設定なしでも初回セットアップ→セッション選択→サマリまで一気通貫で動く", async () => {
    const configPath = join(tempDir, "no-config.json");
    const io = capture();
    const code = await runSummary(undefined, {
      configPath,
      projectsDir: fixturesDir,
      ask: askQueue(["1", "1"]),
      ...io,
    });
    expect(code).toBe(0);
    expect(io.out.join("\n")).toContain("# セッションサマリ: sess-001");
  });

  it("無効な番号選択は非0終了する", async () => {
    const configPath = await writeConfig(["-Users-anon-sample-project"]);
    const io = capture();
    const code = await runSummary(undefined, {
      configPath,
      projectsDir: fixturesDir,
      ask: askQueue(["99"]),
      ...io,
    });
    expect(code).not.toBe(0);
  });

  it("許可プロジェクトにセッションが1つもなければ案内して終了する", async () => {
    const emptyProjects = join(tempDir, "projects");
    await mkdir(join(emptyProjects, "-Users-anon-empty"), { recursive: true });
    const configPath = await writeConfig(["-Users-anon-empty"]);
    const io = capture();
    const code = await runSummary(undefined, {
      configPath,
      projectsDir: emptyProjects,
      ask: askQueue(["1"]),
      ...io,
    });
    expect(code).not.toBe(0);
    expect(io.err.join("\n")).toContain("見つかりません");
  });
});
