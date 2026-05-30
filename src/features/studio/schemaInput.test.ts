import { describe, it, expect } from "vitest";
import {
  optionValue,
  normalizeSchema,
  resolveFields,
  PROMPT_FIELD,
  defaults,
  buildInput,
  firstMissingRequired,
} from "./schemaInput";
import type { SchemaField } from "@/lib/types";

describe("optionValue", () => {
  it("expands a string option into {value,label}", () => {
    expect(optionValue("1:1")).toEqual({ value: "1:1", label: "1:1" });
  });

  it("passes through an object option unchanged", () => {
    const o = { value: "v1", label: "صدای ۱" };
    expect(optionValue(o)).toEqual(o);
  });
});

describe("normalizeSchema", () => {
  it("returns array fields, coerced", () => {
    const s = [{ name: "p", label: "P", type: "text" as const }];
    expect(normalizeSchema(s)).toEqual([
      { name: "p", label: "P", type: "text", required: false, default: undefined, options: undefined },
    ]);
  });

  it("coerces undefined/null/empty/garbage to an empty array", () => {
    expect(normalizeSchema(undefined)).toEqual([]);
    expect(normalizeSchema(null)).toEqual([]);
    expect(normalizeSchema("")).toEqual([]);
    expect(normalizeSchema("oops")).toEqual([]);
    expect(normalizeSchema(42)).toEqual([]);
    expect(normalizeSchema({})).toEqual([]);
  });

  it("unwraps the backend's { fields: [...] } envelope", () => {
    const raw = {
      fields: [
        { name: "prompt", type: "textarea", label: "توضیح", required: true },
        {
          name: "aspect_ratio",
          type: "select",
          label: "نسبت",
          default: "1:1",
          options: ["1:1", "16:9"],
        },
      ],
    };
    const out = normalizeSchema(raw);
    expect(out.map((f) => f.name)).toEqual(["prompt", "aspect_ratio"]);
    expect(out[0]).toMatchObject({ name: "prompt", required: true });
  });

  it("parses a JSON-string of the { fields: [...] } envelope", () => {
    const json = JSON.stringify({
      fields: [{ name: "prompt", type: "textarea", label: "P", required: true }],
    });
    const out = normalizeSchema(json);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("prompt");
  });

  it("preserves boolean type and dialogue voices/default_voice", () => {
    const out = normalizeSchema({
      fields: [
        { name: "sound", type: "boolean", label: "صدا", default: false },
        {
          name: "dialogue",
          type: "dialogue",
          label: "گفتگو",
          voices: [{ value: "v1", label: "James" }],
          default_voice: "v1",
        },
      ],
    });
    expect(out[0]).toMatchObject({ name: "sound", type: "boolean", default: "false" });
    expect(out[1].voices).toEqual([{ value: "v1", label: "James" }]);
    expect(out[1].default_voice).toBe("v1");
  });

  it("preserves the audio_file accept hint", () => {
    const out = normalizeSchema({
      fields: [{ name: "audio_url", type: "audio_file", label: "فایل", accept: "audio/*" }],
    });
    expect(out[0].accept).toBe("audio/*");
  });

  it("parses a JSON-string schema (array form)", () => {
    const json = JSON.stringify([
      { name: "prompt", label: "متن", type: "textarea", required: true },
    ]);
    const out = normalizeSchema(json);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ name: "prompt", type: "textarea", required: true });
  });

  it("flattens an object-map schema, using keys as field names", () => {
    const map = {
      prompt: { label: "متن", type: "textarea", required: true },
      aspect_ratio: { label: "نسبت", type: "select", options: ["1:1", "16:9"] },
    };
    const out = normalizeSchema(map);
    expect(out.map((f) => f.name).sort()).toEqual(["aspect_ratio", "prompt"]);
    const ar = out.find((f) => f.name === "aspect_ratio")!;
    expect(ar.options).toEqual(["1:1", "16:9"]);
  });

  it("parses a JSON-string schema (object-map form)", () => {
    const json = JSON.stringify({ prompt: { label: "P", type: "text" } });
    const out = normalizeSchema(json);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("prompt");
  });

  it("defaults a missing field type to text and label to the name", () => {
    const out = normalizeSchema([{ name: "seed" }]);
    expect(out[0]).toMatchObject({ name: "seed", label: "seed", type: "text" });
  });

  it("drops entries that have no resolvable name", () => {
    const out = normalizeSchema([{ label: "no name", type: "text" }]);
    expect(out).toEqual([]);
  });

  it("supports `key`/`title` aliases for name/label", () => {
    const out = normalizeSchema([{ key: "prompt", title: "متن", type: "textarea" }]);
    expect(out[0]).toMatchObject({ name: "prompt", label: "متن" });
  });
});

describe("resolveFields", () => {
  it("falls back to a single required prompt field when schema is empty/missing", () => {
    expect(resolveFields(undefined)).toEqual([PROMPT_FIELD]);
    expect(resolveFields(null)).toEqual([PROMPT_FIELD]);
    expect(resolveFields([])).toEqual([PROMPT_FIELD]);
    expect(resolveFields("garbage")).toEqual([PROMPT_FIELD]);
  });

  it("uses the model's own fields when present", () => {
    const out = resolveFields([
      { name: "aspect_ratio", label: "نسبت", type: "select", options: ["1:1"] },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("aspect_ratio");
  });

  it("the prompt fallback is required (so it can't be submitted empty)", () => {
    expect(PROMPT_FIELD.required).toBe(true);
    expect(PROMPT_FIELD.name).toBe("prompt");
  });
});

describe("defaults", () => {
  it("uses explicit field defaults", () => {
    const schema: SchemaField[] = [
      { name: "ratio", label: "نسبت", type: "select", default: "16:9" },
    ];
    expect(defaults(schema)).toEqual({ ratio: "16:9" });
  });

  it("falls back to the first option for selects without a default", () => {
    const schema: SchemaField[] = [
      { name: "ratio", label: "نسبت", type: "select", options: ["1:1", "16:9"] },
    ];
    expect(defaults(schema)).toEqual({ ratio: "1:1" });
  });

  it("resolves object options to their value", () => {
    const schema: SchemaField[] = [
      {
        name: "voice",
        label: "صدا",
        type: "select",
        options: [{ value: "v1", label: "صدای ۱" }],
      },
    ];
    expect(defaults(schema)).toEqual({ voice: "v1" });
  });

  it("leaves non-select fields without defaults out", () => {
    const schema: SchemaField[] = [
      { name: "prompt", label: "متن", type: "textarea", required: true },
    ];
    expect(defaults(schema)).toEqual({});
  });

  it("returns an empty object for an empty schema", () => {
    expect(defaults([])).toEqual({});
  });
});

describe("buildInput", () => {
  it("keeps non-empty values", () => {
    expect(buildInput({ prompt: "گربه", ratio: "1:1" })).toEqual({
      prompt: "گربه",
      ratio: "1:1",
    });
  });

  it("drops empty-string values", () => {
    expect(buildInput({ prompt: "گربه", extra: "" })).toEqual({
      prompt: "گربه",
    });
  });

  it("coerces boolean fields to real booleans", () => {
    const schema: SchemaField[] = [
      { name: "prompt", label: "م", type: "textarea" },
      { name: "sound", label: "صدا", type: "boolean" },
      { name: "instrumental", label: "ساز", type: "boolean" },
    ];
    expect(
      buildInput({ prompt: "x", sound: "true", instrumental: "false" }, schema)
    ).toEqual({ prompt: "x", sound: true, instrumental: false });
  });

  it("keeps a false boolean even though it's falsy", () => {
    const schema: SchemaField[] = [
      { name: "sound", label: "صدا", type: "boolean" },
    ];
    expect(buildInput({ sound: "false" }, schema)).toEqual({ sound: false });
  });
});

describe("firstMissingRequired", () => {
  const schema: SchemaField[] = [
    { name: "prompt", label: "متن", type: "textarea", required: true },
    { name: "ratio", label: "نسبت", type: "select", required: false },
  ];

  it("returns the missing required field", () => {
    const missing = firstMissingRequired(schema, { ratio: "1:1" });
    expect(missing?.name).toBe("prompt");
  });

  it("returns undefined when all required fields are present", () => {
    const missing = firstMissingRequired(schema, { prompt: "گربه" });
    expect(missing).toBeUndefined();
  });

  it("ignores optional fields", () => {
    const missing = firstMissingRequired(schema, { prompt: "x" });
    expect(missing).toBeUndefined();
  });

  it("treats a required boolean=false as present (not missing)", () => {
    const s: SchemaField[] = [
      { name: "agree", label: "موافقت", type: "boolean", required: true },
    ];
    expect(firstMissingRequired(s, { agree: false })).toBeUndefined();
  });
});
