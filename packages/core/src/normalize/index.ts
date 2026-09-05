// 層2: イベント正規化。RawRecordをNormalizedEventに変換し、sidechainを隔離する。
// tool_resultは is_error のみをイベント化し、生データ(content / toolUseResult)は
// この層から先に一切渡さない(ADR-003/005、docs/spec/data-model.md)。

import { z } from "zod";
import type { RawRecord } from "../raw/index.js";

export const SYNTHETIC_MODEL = "<synthetic>" as const;

export type NormalizedEvent =
  | { readonly kind: "user_prompt"; readonly text: string; readonly timestamp?: string }
  | { readonly kind: "assistant_text"; readonly text: string; readonly timestamp?: string }
  | {
      readonly kind: "tool_call";
      readonly toolName: string;
      readonly filePath?: string;
      readonly timestamp?: string;
    }
  | { readonly kind: "tool_result"; readonly isError: boolean; readonly timestamp?: string }
  | {
      readonly kind: "turn_meta";
      readonly model?: string;
      readonly synthetic: boolean;
      readonly inputTokens: number;
      readonly outputTokens: number;
      readonly timestamp?: string;
    };

const textItemSchema = z.looseObject({ type: z.literal("text"), text: z.string() });

const toolUseItemSchema = z.looseObject({
  type: z.literal("tool_use"),
  name: z.string(),
  input: z.looseObject({ file_path: z.string().optional() }).optional(),
});

const toolResultItemSchema = z.looseObject({
  type: z.literal("tool_result"),
  is_error: z.boolean().optional(),
});

const messageSchema = z.looseObject({
  content: z.unknown().optional(),
  model: z.string().optional(),
  usage: z
    .looseObject({
      input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
    })
    .optional(),
});

const recordSchema = z.looseObject({
  type: z.string(),
  isSidechain: z.boolean().optional(),
  isMeta: z.boolean().optional(),
  promptSource: z.string().optional(),
  timestamp: z.string().optional(),
  message: messageSchema.optional(),
});

type ParsedRecord = z.infer<typeof recordSchema>;

const contentItems = (content: unknown): readonly unknown[] =>
  Array.isArray(content) ? content : [];

const promptText = (content: unknown): string | undefined => {
  if (typeof content === "string") {
    return content;
  }
  const texts = contentItems(content)
    .map((item) => textItemSchema.safeParse(item))
    .filter((result) => result.success)
    .map((result) => result.data.text);
  return texts.length > 0 ? texts.join("\n") : undefined;
};

const normalizeUser = (record: ParsedRecord): readonly NormalizedEvent[] => {
  const events: NormalizedEvent[] = [];
  const timestamp = record.timestamp;
  if (record.promptSource === "typed" && record.isMeta !== true) {
    const text = promptText(record.message?.content);
    if (text !== undefined) {
      events.push({ kind: "user_prompt", text, timestamp });
    }
  }
  for (const item of contentItems(record.message?.content)) {
    const toolResult = toolResultItemSchema.safeParse(item);
    if (toolResult.success) {
      events.push({ kind: "tool_result", isError: toolResult.data.is_error === true, timestamp });
    }
  }
  return events;
};

const normalizeAssistant = (record: ParsedRecord): readonly NormalizedEvent[] => {
  const events: NormalizedEvent[] = [];
  const timestamp = record.timestamp;
  for (const item of contentItems(record.message?.content)) {
    const text = textItemSchema.safeParse(item);
    if (text.success && text.data.text !== "") {
      events.push({ kind: "assistant_text", text: text.data.text, timestamp });
      continue;
    }
    const toolUse = toolUseItemSchema.safeParse(item);
    if (toolUse.success) {
      events.push({
        kind: "tool_call",
        toolName: toolUse.data.name,
        filePath: toolUse.data.input?.file_path,
        timestamp,
      });
    }
  }
  const usage = record.message?.usage;
  if (usage !== undefined) {
    const model = record.message?.model;
    events.push({
      kind: "turn_meta",
      model,
      synthetic: model === SYNTHETIC_MODEL,
      inputTokens: usage.input_tokens ?? 0,
      outputTokens: usage.output_tokens ?? 0,
      timestamp,
    });
  }
  return events;
};

export function normalizeRecord(record: RawRecord): readonly NormalizedEvent[] {
  const parsed = recordSchema.safeParse(record);
  if (!parsed.success || parsed.data.isSidechain === true) {
    return [];
  }
  if (parsed.data.type === "user") {
    return normalizeUser(parsed.data);
  }
  if (parsed.data.type === "assistant") {
    return normalizeAssistant(parsed.data);
  }
  return [];
}
