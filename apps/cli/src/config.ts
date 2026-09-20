// 許可リスト読み込み(ADR-006: opt-in方式、デフォルト全拒否)。
// 設定ファイル: ~/.config/fathom/config.json
//
// この設定はユーザーが手で書くものではない。設定なしで実行された場合、
// fathomが ~/.claude/projects/ を列挙して読みやすいプロジェクト名で提示し、
// 対話的に選ばせて自動生成する(docs/spec/feature-a.md の初回対話セットアップ。Issue #16)。
// ユーザーは隠しディレクトリの存在や構造を知らなくてよい。
// opt-in自体は「業務プロジェクトを誤って解析しない」を仕組みで担保するための
// 意図的な摩擦(ADR-004/006)。

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

const configSchema = z.looseObject({
  allowedProjects: z.array(z.string()).readonly(),
});

export type FathomConfig = z.infer<typeof configSchema>;

export const CONFIG_PATH_HINT = "~/.config/fathom/config.json";

export const defaultConfigPath = (): string => join(homedir(), ".config", "fathom", "config.json");

/** 設定を読む。存在しない・壊れている場合は undefined(=全拒否)。 */
export async function loadConfig(configPath: string): Promise<FathomConfig | undefined> {
  let raw: string;
  try {
    raw = await readFile(configPath, "utf8");
  } catch {
    return undefined;
  }
  try {
    const result = configSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}
