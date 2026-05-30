"use client";

import { useState } from "react";
import type { SchemaField } from "@/lib/types";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { optionValue, normalizeSchema, defaults } from "./schemaInput";

export function useSchemaForm(schema: SchemaField[] | undefined) {
  // The backend may omit `schema` or send a non-array value, so normalize.
  const fields = normalizeSchema(schema);
  const [values, setValues] = useState<Record<string, string>>(() =>
    defaults(fields)
  );
  const set = (name: string, value: string) =>
    setValues((v) => ({ ...v, [name]: value }));
  const reset = () => setValues(defaults(fields));
  return { values, set, reset };
}

export function SchemaFields({
  schema,
  values,
  onChange,
}: {
  schema: SchemaField[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {schema.map((f) => (
        <SchemaFieldInput
          key={f.name}
          field={f}
          value={values[f.name] ?? ""}
          onChange={(v) => onChange(f.name, v)}
        />
      ))}
    </div>
  );
}

function SchemaFieldInput({
  field,
  value,
  onChange,
}: {
  field: SchemaField;
  value: string;
  onChange: (v: string) => void;
}) {
  const label = `${field.label}${field.required ? " *" : ""}`;

  switch (field.type) {
    case "textarea":
    case "dialogue":
      return (
        <Field label={label}>
          <Textarea
            rows={field.type === "dialogue" ? 5 : 3}
            value={value}
            required={field.required}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );
    case "select":
      return (
        <Field label={label}>
          <Select
            value={value}
            onChange={onChange}
            options={(field.options ?? []).map((o) => optionValue(o))}
          />
        </Field>
      );
    case "audio_file":
      return (
        <Field
          label={label}
          hint="آدرس فایل صوتی (URL) را وارد کنید."
        >
          <Input
            dir="ltr"
            placeholder="https://.../audio.mp3"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );
    case "text":
    default:
      return (
        <Field label={label}>
          <Input
            value={value}
            required={field.required}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );
  }
}
