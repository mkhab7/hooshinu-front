import { describe, it, expect } from "vitest";
import {
  optionValue,
  normalizeSchema,
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
});
