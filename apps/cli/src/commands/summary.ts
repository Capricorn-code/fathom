import type { Command } from "commander";

// fathom summary <jsonlパス>
// JSONL 1ファイルからセッションサマリMDを出力する(docs/spec/feature-a.md)。
// 実装はタスク③(パーサー第1弾)で行う。

export function registerSummaryCommand(program: Command): void {
  program
    .command("summary")
    .argument("<jsonlPath>", "Claude CodeセッションログのJSONLファイル")
    .description("セッションログからサマリMDを生成する")
    .action((jsonlPath: string) => {
      console.log(`(未実装) summary: ${jsonlPath}`);
      process.exitCode = 1;
    });
}
