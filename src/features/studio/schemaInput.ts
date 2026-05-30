// Pure helpers for turning a media model's `schema` into form state and a
// generation `input` payload. Kept framework-free so they're easy to test.
import type { SchemaField, SchemaSelectOption } from "@/lib/types";

/** A universal prompt field used as a fallback when a model exposes no schema. */
export const PROMPT_FIELD: SchemaField = {
  name: "prompt",
  label: "توضیح (Prompt)",
  type: "textarea",
  required: true,
};

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

  // 2) Backend wraps the list as `{ fields: [...] }` — unwrap it.
  if (!Array.isArray(raw) && Array.isArray((raw as { fields?: unknown }).fields)) {
    raw = (raw as { fields: unknown[] }).fields;
  }

  // 3) Array of field objects.
  if (Array.isArray(raw)) {
    return raw
      .filter(isFieldLike)
      .map(coerceField)
      .filter((f) => f.name);
  }

  // 4) Fallback: object map keyed by field name → flatten to an array, using
  //    the key as the field `name` when the entry doesn't carry its own.
  return Object.entries(raw as Record<string, unknown>)
    .filter(([, v]) => v && typeof v === "object")
    .map(([key, v]) => coerceField({ name: key, ...(v as object) }))
    .filter((f) => f.name);
}

/**
 * The fields to actually render for a model. Falls back to a single prompt
 * field when the model exposes no usable schema, so image/video/audio models
 * are always submittable (the backend rejects empty input with "prompt is
 * required"). Also guarantees a prompt field exists if the schema somehow
 * omits it.
 */
export function resolveFields(schema: unknown): SchemaField[] {
  const fields = normalizeSchema(schema);
  // No usable schema → fall back to a single required prompt field so the
  // model stays submittable (the backend rejects empty input with
  // "prompt is required").
  return fields.length === 0 ? [PROMPT_FIELD] : fields;
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
    // Booleans serialize to "true"/"false" strings for our string-based form.
    default: f.default != null ? String(f.default) : undefined,
    options: Array.isArray(f.options)
      ? (f.options as SchemaField["options"])
      : undefined,
    voices: Array.isArray(f.voices)
      ? (f.voices as SchemaField["voices"])
      : undefined,
    default_voice:
      f.default_voice != null ? String(f.default_voice) : undefined,
    accept: f.accept != null ? String(f.accept) : undefined,
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

/**
 * Build the generation `input` payload from form values. Drops empty strings
 * and coerces boolean fields back to real booleans (the form stores them as
 * "true"/"false" strings).
 */
export function buildInput(
  values: Record<string, string>,
  schema: SchemaField[] = []
): Record<string, unknown> {
  const boolNames = new Set(
    schema.filter((f) => f.type === "boolean").map((f) => f.name)
  );
  const input: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (boolNames.has(k)) {
      input[k] = v === "true";
    } else if (v !== "" && v != null) {
      input[k] = v;
    }
  }
  return input;
}

/** First required field missing from `input`, or undefined if all present. */
export function firstMissingRequired(
  schema: SchemaField[],
  input: Record<string, unknown>
): SchemaField | undefined {
  return schema.find((f) => {
    if (!f.required) return false;
    const v = input[f.name];
    // Present-but-false (booleans) counts as filled; empty string / missing does not.
    if (typeof v === "boolean") return false;
    return v == null || v === "";
  });
}
