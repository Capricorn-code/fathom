// fathom summary <jsonlパス>
// JSONL 1ファイル → 層1(raw)→層2(normalize)→層3(digest)→ MDレンダリングの結線。
// ADR-006: 許可リスト(opt-in)にないプロジェクトはファイルを読む前に拒否する。

import { basename, dirname, resolve } from "node:path";
import {
  buildSessionDigest,
  type NormalizedEvent,
  normalizeRecord,
  streamRawLines,
} from "@fathom/core";
import type { Command } from "commander";
import { CONFIG_PATH_HINT, defaultConfigPath, loadConfig } from "../config.js";
import { renderSummaryMarkdown } from "../render.js";

export interface SummaryDeps {
  readonly configPath: string;
  readonly write: (text: string) => void;
  readonly writeError: (text: string) => void;
}

const isFileMissing = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

export async function runSummary(jsonlPath: string, deps: SummaryDeps): Promise<number> {
  const absolutePath = resolve(jsonlPath);
  const projectDir = basename(dirname(absolutePath));

  const config = await loadConfig(deps.configPath);
  if (config === undefined) {
    deps.writeError(
      [
        `設定ファイルが見つかりません: ${deps.configPath}`,
        "fathomはデフォルトですべてのプロジェクトの解析を拒否します(opt-in方式)。",
        `${CONFIG_PATH_HINT} に許可リストを作成してください(今後、初回対話セットアップで自動生成できるようになります)。`,
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
  deps.write(renderSummaryMarkdown(digest));
  return 0;
}

export function registerSummaryCommand(program: Command): void {
  program
    .command("summary")
    .argument("<jsonlPath>", "Claude CodeセッションログのJSONLファイル")
    .description("セッションログからサマリMDを生成する")
    .action(async (jsonlPath: string) => {
      process.exitCode = await runSummary(jsonlPath, {
        configPath: defaultConfigPath(),
        write: (text) => process.stdout.write(`${text}\n`),
        writeError: (text) => process.stderr.write(`${text}\n`),
      });
    });
}
