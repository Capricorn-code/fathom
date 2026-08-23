#!/usr/bin/env node
import { Command } from "commander";
import { registerSummaryCommand } from "./commands/summary.js";

const program = new Command();

program.name("fathom").description("AIとの開発履歴を言語化し、理解を検証するツール");

registerSummaryCommand(program);

program.parse();
