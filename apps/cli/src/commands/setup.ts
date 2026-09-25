// 初回対話セットアップ(docs/spec/feature-a.md、ADR-006)。
// ~/.claude/projects/ の一覧を読みやすい名前で提示し、選択された
// プロジェクトだけを含む許可リスト(config.json)を生成する。
// ユーザーに隠しディレクトリの存在や構造を意識させない。
// 対話(ask)はDIで注入し、選択の解釈は純関数に分離してテスト可能にする。

import { mkdir, readdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface SetupDeps {
  readonly projectsDir: string;
  readonly configPath: string;
  readonly write: (text: string) => void;
  readonly writeError: (text: string) => void;
  readonly ask: (question: string) => Promise<string>;
}

export const defaultProjectsDir = (): string => join(homedir(), ".claude", "projects");

/** ログのディレクトリ名(cwdのスラッシュをハイフン化したもの)を読みやすい形に戻す(近似)。 */
export const toReadableLabel = (dir: string): string => dir.replace(/^-/, "").replaceAll("-", "/");

/** "1,3" のような入力を0始まりのインデックス列にする。無効な入力は undefined。 */
export const parseSelection = (input: string, count: number): readonly number[] | undefined => {
  const parts = input
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
  if (parts.length === 0) {
    return undefined;
  }
  const indexes = parts.map((part) => (/^\d+$/.test(part) ? Number(part) - 1 : -1));
  if (indexes.some((index) => index < 0 || index >= count)) {
    return undefined;
  }
  return [...new Set(indexes)];
};

const listProjectDirs = async (projectsDir: string): Promise<readonly string[] | undefined> => {
  try {
    const entries = await readdir(projectsDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .toSorted();
  } catch {
    return undefined;
  }
};

export async function runSetup(deps: SetupDeps): Promise<number> {
  const projects = await listProjectDirs(deps.projectsDir);
  if (projects === undefined || projects.length === 0) {
    deps.writeError(
      [
        `Claude Codeのログが見つかりません: ${deps.projectsDir}`,
        "Claude Codeで開発したプロジェクトがあるマシンで実行してください。",
      ].join("\n"),
    );
    return 1;
  }

  deps.write("fathomの初回セットアップです。解析を許可するプロジェクトを選んでください。");
  deps.write("⚠ 業務プロジェクトは選ばないでください(個人リポジトリ/OSSのみ)。");
  deps.write("");
  projects.forEach((dir, index) => {
    deps.write(`${index + 1}. ${toReadableLabel(dir)}`);
  });
  deps.write("");

  const answer = await deps.ask("解析を許可する番号(カンマ区切り): ");
  const selected = parseSelection(answer, projects.length);
  if (selected === undefined) {
    deps.writeError(
      "選択が無効です。1〜" + projects.length + " の番号をカンマ区切りで入力してください。",
    );
    return 1;
  }

  const allowedProjects = selected
    .map((index) => projects[index])
    .filter((dir) => dir !== undefined);
  await mkdir(dirname(deps.configPath), { recursive: true });
  await writeFile(deps.configPath, `${JSON.stringify({ allowedProjects }, null, 2)}\n`, "utf8");
  deps.write(`許可リストを保存しました: ${deps.configPath}`);
  return 0;
}
