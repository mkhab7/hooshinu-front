// Pure helpers for turning a media model's `schema` into form state and a
// generation `input` payload. Kept framework-free so they're easy to test.
import type { SchemaField, SchemaSelectOption } from "@/lib/types";

export function optionValue(o: SchemaSelectOption): {
  value: string;
  label: string;
} {
  return typeof o === "string" ? { value: o, label: o } : o;
}

/**
 * Normalize a model's `schema` into an array of fields.
 *
 * The backend isn't guaranteed to send a clean array — observed/likely shapes:
 *  - a proper `SchemaField[]`
 *  - a JSON **string** that must be parsed first
 *  - an **object map** keyed by field name: `{ prompt: {label,type,...}, ... }`
 * Anything unrecognized degrades to an empty array.
 */
export function normalizeSchema(schema: unknown): SchemaField[] {
  let raw = schema;

  // 1) JSON string → parse.
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return [];
    try {
      raw = JSON.parse(s);
    } catch {
      return [];
    }
  }

  if (!raw || typeof raw !== "object") return [];

  // 2) Already an array of field objects.
  if (Array.isArray(raw)) {
    return raw
      .filter(isFieldLike)
      .map(coerceField)
      .filter((f) => f.name);
  }

  // 3) Object map keyed by field name → flatten to an array, using the key
  //    as the field `name` when the entry doesn't carry its own.
  return Object.entries(raw as Record<string, unknown>)
    .filter(([, v]) => v && typeof v === "object")
    .map(([key, v]) => coerceField({ name: key, ...(v as object) }))
    .filter((f) => f.name);
}

function isFieldLike(v: unknown): boolean {
  return !!v && typeof v === "object";
}

/** Fill in sane defaults so a partially-specified field still renders. */
function coerceField(v: Record<string, unknown> | object): SchemaField {
  const f = v as Record<string, unknown>;
  const name = String(f.name ?? f.key ?? f.id ?? "");
  return {
    name,
    label: String(f.label ?? f.title ?? name),
    type: (f.type as SchemaField["type"]) ?? "text",
    required: Boolean(f.required),
    default: f.default != null ? String(f.default) : undefined,
    options: Array.isArray(f.options)
      ? (f.options as SchemaField["options"])
      : undefined,
  };
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
