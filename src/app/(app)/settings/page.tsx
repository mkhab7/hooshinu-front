"use client";

import { useEffect, useState } from "react";
import { Copy, Trash2, Plus, KeyRound, Check } from "lucide-react";
import { useMe, useUpdateProfile } from "@/features/profile/hooks";
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
} from "@/features/apikeys/hooks";
import { setLocaleStorage } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge, Spinner, EmptyState } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Field, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { HooshinuError } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
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
      <PageHeader title="تنظیمات" description="پروفایل و کلیدهای توسعه‌دهنده" />

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

        <ApiKeysSection />
      </div>
    </div>
  );
}

function ApiKeysSection() {
  const toast = useToast();
  const { data: keys, isLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();

  const [name, setName] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const res = await createKey.mutateAsync(name.trim());
      setNewToken(res.token);
      setName("");
    } catch (err) {
      toast.error((err as HooshinuError).message);
    }
  }

  async function copy() {
    if (!newToken) return;
    try {
      await navigator.clipboard.writeText(newToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("کپی ناموفق بود.");
    }
  }

  async function revoke(id: number) {
    try {
      await revokeKey.mutateAsync(id);
      toast.success("کلید باطل شد.");
    } catch (err) {
      toast.error((err as HooshinuError).message);
    }
  }

  return (
    <Card>
      <h3 className="mb-1 flex items-center gap-2 font-semibold">
        <KeyRound className="size-5 text-brand-500" />
        کلیدهای API
      </h3>
      <p className="mb-4 text-sm text-gray-500">
        برای دسترسی برنامه‌نویسی به API هوشینو.
      </p>

      {newToken && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="mb-2 text-xs text-amber-700 dark:text-amber-300">
            این توکن فقط همین یک‌بار نمایش داده می‌شود. آن را کپی و ذخیره کنید.
          </p>
          <div className="flex items-center gap-2">
            <code
              dir="ltr"
              className="flex-1 overflow-x-auto rounded-lg bg-black/10 px-2 py-1.5 text-xs dark:bg-black/30"
            >
              {newToken}
            </code>
            <Button size="sm" variant="secondary" onClick={copy}>
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={create} className="mb-4 flex gap-2">
        <Input
          value={name}
          placeholder="نام کلید (مثلاً: my-app)"
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" loading={createKey.isPending} className="shrink-0">
          <Plus className="size-4" />
          ساخت
        </Button>
      </form>

      {isLoading ? (
        <div className="py-6 text-center">
          <Spinner className="text-brand-500" />
        </div>
      ) : !keys || keys.length === 0 ? (
        <EmptyState title="هنوز کلیدی نساخته‌اید" />
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-white/5">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center justify-between py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  {k.name}
                  {k.revoked && <Badge color="red">باطل‌شده</Badge>}
                </p>
                <p dir="ltr" className="text-xs text-gray-500">
                  {k.prefix}··· · ساخت: {formatDateTime(k.created_at)}
                </p>
              </div>
              {!k.revoked && (
                <button
                  onClick={() => revoke(k.id)}
                  disabled={revokeKey.isPending}
                  className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
