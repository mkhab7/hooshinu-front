"use client";

import { useState } from "react";
import type { SchemaField, SchemaSelectOption } from "@/lib/types";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";

function optionValue(o: SchemaSelectOption): { value: string; label: string } {
  return typeof o === "string" ? { value: o, label: o } : o;
}

function defaults(schema: SchemaField[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of schema) {
    if (f.default != null) out[f.name] = f.default;
    else if (f.type === "select" && f.options?.length)
      out[f.name] = optionValue(f.options[0]).value;
  }
  return out;
}

export function useSchemaForm(schema: SchemaField[] | undefined) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    schema ? defaults(schema) : {}
  );
  const set = (name: string, value: string) =>
    setValues((v) => ({ ...v, [name]: value }));
  const reset = () => setValues(schema ? defaults(schema) : {});
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
          <Select value={value} onChange={(e) => onChange(e.target.value)}>
            {field.options?.map((o) => {
              const { value: v, label: l } = optionValue(o);
              return (
                <option key={v} value={v}>
                  {l}
                </option>
              );
            })}
          </Select>
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
