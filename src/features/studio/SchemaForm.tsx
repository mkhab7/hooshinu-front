"use client";

import { useState } from "react";
import type { SchemaField } from "@/lib/types";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { optionValue, normalizeSchema, defaults } from "./schemaInput";
import type { TFunction } from "@/lib/i18n";

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
  t,
}: {
  schema: SchemaField[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  t: TFunction;
}) {
  return (
    <div className="space-y-4">
      {schema.map((f) => (
        <SchemaFieldInput
          key={f.name}
          field={f}
          value={values[f.name] ?? ""}
          onChange={(v) => onChange(f.name, v)}
          t={t}
        />
      ))}
    </div>
  );
}

function SchemaFieldInput({
  field,
  value,
  onChange,
  t,
}: {
  field: SchemaField;
  value: string;
  onChange: (v: string) => void;
  t: TFunction;
}) {
  // Field labels come from the backend already localized (X-Locale); only the
  // surrounding static UI (hints/placeholders) is translated here.
  const label = `${field.label}${field.required ? " *" : ""}`;

  switch (field.type) {
    case "boolean":
      return (
        <Switch
          label={field.label}
          checked={value === "true"}
          onChange={(c) => onChange(c ? "true" : "false")}
        />
      );
    case "dialogue": {
      const voiceHint = field.voices?.length
        ? t("schema.dialogueVoices", {
            voices: field.voices.map((v) => v.label.split(" — ")[0]).join("، "),
          })
        : t("schema.dialogueHint");
      return (
        <Field label={label} hint={voiceHint}>
          <Textarea
            rows={6}
            value={value}
            required={field.required}
            placeholder={t("schema.dialoguePlaceholder")}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );
    }
    case "textarea":
      return (
        <Field label={label}>
          <Textarea
            rows={3}
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
        <Field label={label} hint={t("schema.audioUrlHint")}>
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
