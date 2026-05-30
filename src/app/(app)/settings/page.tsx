"use client";

import { useEffect, useState } from "react";
import { useMe, useUpdateProfile } from "@/features/profile/hooks";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { useT, useI18nStore } from "@/lib/i18n";
import { HooshinuError } from "@/lib/api";
import type { Locale } from "@/lib/types";

export default function SettingsPage() {
  const toast = useToast();
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();
  const { t } = useT();
  const applyLocale = useI18nStore((s) => s.setLocale);

  const [name, setName] = useState("");
  const [profession, setProfession] = useState("");
  const [locale, setLocale] = useState<Locale>("fa");

  useEffect(() => {
    if (me) {
      setName(me.name ?? "");
      setProfession(me.profession ?? "");
      setLocale(me.locale);
    }
  }, [me]);

  // Switch the UI language immediately (server sync happens on save).
  function onLocaleChange(v: string) {
    const next = v as Locale;
    setLocale(next);
    applyLocale(next);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({
        name: name.trim(),
        profession: profession.trim() || null,
        locale,
      });
      applyLocale(locale);
      toast.success(t("settings.saved"));
    } catch (err) {
      const e2 = err as HooshinuError;
      if (e2.fieldErrors) {
        toast.error(Object.values(e2.fieldErrors)[0]?.[0] ?? e2.message);
      } else {
        toast.error(e2.message);
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <PageHeader title={t("settings.title")} description={t("settings.subtitle")} />

      <div className="space-y-6">
        <Card>
          <h3 className="mb-4 font-semibold">{t("settings.profile")}</h3>
          <form onSubmit={saveProfile} className="space-y-4">
            <Field label={t("settings.phone")}>
              <Input dir="ltr" value={me?.phone ?? ""} disabled />
            </Field>
            <Field label={t("settings.name")}>
              <Input
                value={name}
                maxLength={100}
                placeholder={t("settings.namePlaceholder")}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label={t("settings.profession")} hint={t("common.optional")}>
              <Input
                value={profession}
                placeholder={t("settings.professionPlaceholder")}
                onChange={(e) => setProfession(e.target.value)}
              />
            </Field>
            <Field label={t("settings.language")}>
              <Select
                value={locale}
                onChange={onLocaleChange}
                options={[
                  { value: "fa", label: t("settings.langFa") },
                  { value: "en", label: t("settings.langEn") },
                ]}
              />
            </Field>
            <Button type="submit" loading={updateProfile.isPending}>
              {t("common.save")}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
