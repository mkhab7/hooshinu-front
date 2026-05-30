"use client";

import { useEffect, useState } from "react";
import { useMe, useUpdateProfile } from "@/features/profile/hooks";
import { setLocaleStorage } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Field, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { HooshinuError } from "@/lib/api";
import type { Locale } from "@/lib/types";

export default function SettingsPage() {
  const toast = useToast();
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();

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

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({
        name: name.trim(),
        profession: profession.trim() || null,
        locale,
      });
      setLocaleStorage(locale);
      toast.success("پروفایل بروزرسانی شد.");
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
      <PageHeader title="تنظیمات" description="پروفایل کاربری" />

      <div className="space-y-6">
        <Card>
          <h3 className="mb-4 font-semibold">پروفایل</h3>
          <form onSubmit={saveProfile} className="space-y-4">
            <Field label="شماره موبایل">
              <Input dir="ltr" value={me?.phone ?? ""} disabled />
            </Field>
            <Field label="نام">
              <Input
                value={name}
                maxLength={100}
                placeholder="نام شما"
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="حرفه / تخصص" hint="اختیاری">
              <Input
                value={profession}
                placeholder="مثلاً: پزشک، برنامه‌نویس…"
                onChange={(e) => setProfession(e.target.value)}
              />
            </Field>
            <Field label="زبان">
              <Select
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
              >
                <option value="fa">فارسی</option>
                <option value="en">English</option>
              </Select>
            </Field>
            <Button type="submit" loading={updateProfile.isPending}>
              ذخیره تغییرات
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
