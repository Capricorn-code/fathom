// 許可プロジェクトのセッション一覧(新しい順)。表示用の純粋寄りユーティリティ。
// 利用者はJSONLのパスを知らないため、引数なしのsummaryはここから選ばせる(Issue #53)。

import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { toReadableLabel } from "./commands/setup.js";

export interface SessionCandidate {
  readonly path: string;
  readonly project: string;
  readonly label: string;
  readonly mtime: Date;
}

export async function listSessions(
  projectsDir: string,
  allowedProjects: readonly string[],
): Promise<readonly SessionCandidate[]> {
  // ローカルに閉じた蓄積用配列(CLAUDE.md TS実装ルールの許容例外)
  const candidates: SessionCandidate[] = [];
  for (const project of allowedProjects) {
    let entries: readonly string[];
    try {
      entries = await readdir(join(projectsDir, project));
    } catch {
      continue;
    }
    for (const entry of entries.filter((name) => name.endsWith(".jsonl"))) {
      const path = join(projectsDir, project, entry);
      try {
        const info = await stat(path);
        candidates.push({ path, project, label: toReadableLabel(project), mtime: info.mtime });
      } catch {
        // 列挙と参照の間に消えたファイルは無視する
      }
    }
  }
  return candidates.toSorted((a, b) => b.mtime.getTime() - a.mtime.getTime());
}
