// Pure helpers for turning a media model's `schema` into form state and a
// generation `input` payload. Kept framework-free so they're easy to test.
import type { SchemaField, SchemaSelectOption } from "@/lib/types";

export function optionValue(o: SchemaSelectOption): {
  value: string;
  label: string;
} {
  return typeof o === "string" ? { value: o, label: o } : o;
}

/** Normalize a possibly-missing/invalid schema into an array of fields. */
export function normalizeSchema(schema: unknown): SchemaField[] {
  return Array.isArray(schema) ? (schema as SchemaField[]) : [];
}

/** Initial form values: explicit defaults, else the first select option. */
export function defaults(schema: SchemaField[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of schema) {
    if (f.default != null) out[f.name] = f.default;
    else if (f.type === "select" && f.options?.length)
      out[f.name] = optionValue(f.options[0]).value;
  }
  return out;
}

/** Drop empty/nullish values so we only submit meaningful input. */
export function buildInput(
  values: Record<string, string>
): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v !== "" && v != null) input[k] = v;
  }
  return input;
}

/** First required field missing from `input`, or undefined if all present. */
export function firstMissingRequired(
  schema: SchemaField[],
  input: Record<string, unknown>
): SchemaField | undefined {
  return schema.find((f) => f.required && !input[f.name]);
}
