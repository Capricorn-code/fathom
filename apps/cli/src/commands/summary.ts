// fathom summary <jsonlパス>
// JSONL 1ファイル → 層1(raw)→層2(normalize)→層3(digest)→ MDレンダリングの結線。
// ADR-006: 許可リスト(opt-in)にないプロジェクトはファイルを読む前に拒否する。

import { writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import {
  buildSessionDigest,
  type NormalizedEvent,
  normalizeRecord,
  streamRawLines,
} from "@fathom/core";
import type { Command } from "commander";
import { CONFIG_PATH_HINT, defaultConfigPath, loadConfig } from "../config.js";
import { buildConversationTurns } from "../conversation.js";
import { renderSummaryMarkdown } from "../render.js";
import { renderSummaryHtml } from "../render-html.js";
import { defaultProjectsDir, runSetup } from "./setup.js";

export interface SummaryDeps {
  readonly configPath: string;
  readonly write: (text: string) => void;
  readonly writeError: (text: string) => void;
  /** 対話入力。省略時は非対話モード(設定なしなら案内のみで終了)。 */
  readonly ask?: (question: string) => Promise<string>;
  readonly projectsDir?: string;
  /** 指定時はMDの代わりに自己完結HTMLをこのディレクトリへ出力する(Issue #36) */
  readonly htmlOutDir?: string;
}

const isFileMissing = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

export async function runSummary(jsonlPath: string, deps: SummaryDeps): Promise<number> {
  const absolutePath = resolve(jsonlPath);
  const projectDir = basename(dirname(absolutePath));

  let config = await loadConfig(deps.configPath);
  if (config === undefined && deps.ask !== undefined) {
    // 設定なし → 初回対話セットアップを起動し、生成された許可リストで続行する
    const setupCode = await runSetup({
      projectsDir: deps.projectsDir ?? defaultProjectsDir(),
      configPath: deps.configPath,
      write: deps.write,
      writeError: deps.writeError,
      ask: deps.ask,
    });
    if (setupCode !== 0) {
      return setupCode;
    }
    config = await loadConfig(deps.configPath);
  }
  if (config === undefined) {
    deps.writeError(
      [
        `設定ファイルが見つかりません: ${deps.configPath}`,
        "fathomはデフォルトですべてのプロジェクトの解析を拒否します(opt-in方式)。",
        `${CONFIG_PATH_HINT} に許可リストを作成してください(対話環境で実行すると初回セットアップが起動します)。`,
      ].join("\n"),
    );
    return 1;
  }

  if (!config.allowedProjects.includes(projectDir)) {
    deps.writeError(
      [
        `このプロジェクトは許可リストにないため解析しません: ${projectDir}`,
        `許可するには ${deps.configPath} の allowedProjects に "${projectDir}" を追加してください。`,
        "(業務プロジェクトは追加しないでください)",
      ].join("\n"),
    );
    return 1;
  }

  const events: NormalizedEvent[] = [];
  try {
    for await (const line of streamRawLines(absolutePath)) {
      if (line.kind === "record") {
        events.push(...normalizeRecord(line.record));
      }
    }
  } catch (error) {
    if (isFileMissing(error)) {
      deps.writeError(`ファイルが見つかりません: ${absolutePath}`);
      return 1;
    }
    throw error;
  }

  const sessionId = basename(absolutePath, ".jsonl");
  const digest = buildSessionDigest(events, { sessionId });
  const turns = buildConversationTurns(events);
  if (deps.htmlOutDir !== undefined) {
    const htmlPath = join(deps.htmlOutDir, `fathom-summary-${sessionId}.html`);
    await writeFile(htmlPath, renderSummaryHtml(digest, turns), "utf8");
    deps.write(`HTMLサマリを出力しました: ${htmlPath}`);
    deps.write("ブラウザで開いて確認してください。");
    return 0;
  }
  deps.write(renderSummaryMarkdown(digest, turns));
  return 0;
}

export function registerSummaryCommand(program: Command): void {
  program
    .command("summary")
    .argument("<jsonlPath>", "Claude CodeセッションログのJSONLファイル")
    .option("--html", "サマリを自己完結HTMLファイルとして出力する(暫定の画面)")
    .description("セッションログからサマリを生成する(既定: MD、--htmlでHTML)")
    .action(async (jsonlPath: string, options: { html?: boolean }) => {
      // 対話セットアップは端末から実行されたときだけ有効(パイプ・CI等では非対話)
      const interactive = process.stdin.isTTY === true && process.stdout.isTTY === true;
      const rl = interactive
        ? createInterface({ input: process.stdin, output: process.stdout })
        : undefined;
      try {
        process.exitCode = await runSummary(jsonlPath, {
          configPath: defaultConfigPath(),
          write: (text) => process.stdout.write(`${text}\n`),
          writeError: (text) => process.stderr.write(`${text}\n`),
          ask: rl === undefined ? undefined : (question) => rl.question(question),
          htmlOutDir: options.html === true ? process.cwd() : undefined,
        });
      } finally {
        rl?.close();
      }
    });
}
