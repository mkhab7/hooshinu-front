"use client";

import { useEffect, useMemo, useState } from "react";
import { Wand2, Image as ImageIcon, Video, Music, Lock } from "lucide-react";
import { useModels } from "@/features/models/hooks";
import {
  useCreateGeneration,
  useGeneration,
  useGenerations,
} from "@/features/studio/hooks";
import { useSchemaForm, SchemaFields } from "@/features/studio/SchemaForm";
import { ResultView } from "@/features/studio/ResultView";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge, Spinner, EmptyState } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { HooshinuError } from "@/lib/api";
import { cn, formatCredits, relativeFromNow } from "@/lib/utils";
import type { AiModel, ModelCategory } from "@/lib/types";

const CAT_META: Record<
  Exclude<ModelCategory, "text">,
  { label: string; icon: typeof ImageIcon }
> = {
  image: { label: "تصویر", icon: ImageIcon },
  video: { label: "ویدیو", icon: Video },
  audio: { label: "صدا", icon: Music },
};

export default function StudioPage() {
  const { data: models, isLoading } = useModels();
  const toast = useToast();
  const createGen = useCreateGeneration();
  const { data: history } = useGenerations();

  const [selectedId, setSelectedId] = useState<string>("");
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);

  const mediaModels = useMemo(
    () => (models ?? []).filter((m) => m.category !== "text"),
    [models]
  );

  const selected: AiModel | undefined = useMemo(
    () => mediaModels.find((m) => m.id === selectedId),
    [mediaModels, selectedId]
  );

  useEffect(() => {
    if (!selectedId && mediaModels.length) {
      const first = mediaModels.find((m) => !m.locked) ?? mediaModels[0];
      setSelectedId(first.id);
    }
  }, [mediaModels, selectedId]);

  const form = useSchemaForm(selected?.schema);
  // Reset form values when switching models.
  useEffect(() => {
    form.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const { data: activeTask } = useGeneration(activeTaskId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (selected.locked) {
      toast.error("این مدل با پلن فعلی شما در دسترس نیست.");
      return;
    }
    // Build input from form values, dropping empties.
    const input: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form.values)) {
      if (v !== "" && v != null) input[k] = v;
    }
    // Validate required fields.
    const missing = (selected.schema ?? []).find(
      (f) => f.required && !input[f.name]
    );
    if (missing) {
      toast.error(`فیلد «${missing.label}» الزامی است.`);
      return;
    }

    try {
      const task = await createGen.mutateAsync({ model: selected.id, input });
      setActiveTaskId(task.id);
      toast.success("درخواست تولید ثبت شد.");
    } catch (err) {
      toast.error((err as HooshinuError).message);
    }
  }

  const busy =
    activeTask &&
    ["pending", "queued", "processing"].includes(activeTask.status);

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <PageHeader
        title="استودیو"
        description="تولید تصویر، ویدیو و صدا با مدل‌های هوش مصنوعی"
      />

      {isLoading ? (
        <div className="py-20 text-center">
          <Spinner className="text-brand-500" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Left: model picker + form */}
          <div className="space-y-4">
            <Card>
              <label className="mb-2 block text-sm font-medium">مدل</label>
              <div className="grid grid-cols-2 gap-2">
                {mediaModels.map((m) => {
                  const Icon =
                    CAT_META[m.category as Exclude<ModelCategory, "text">]
                      ?.icon ?? Wand2;
                  const active = m.id === selectedId;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedId(m.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border p-2.5 text-start text-sm transition-colors",
                        active
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                          : "border-gray-200 hover:border-gray-300 dark:border-white/10 dark:hover:border-white/20"
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-brand-500" />
                      <span className="min-w-0 flex-1 truncate">{m.name}</span>
                      {m.locked && (
                        <Lock className="size-3.5 shrink-0 text-amber-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>

            {selected && (
              <Card>
                <form onSubmit={submit} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{selected.name}</h3>
                    <Badge>
                      ~{formatCredits(selected.price)} اعتبار / {selected.unit}
                    </Badge>
                  </div>

                  {selected.locked ? (
                    <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                      این مدل به پلن سطح {selected.min_plan_level} یا بالاتر نیاز
                      دارد.
                    </div>
                  ) : selected.schema && selected.schema.length ? (
                    <SchemaFields
                      schema={selected.schema}
                      values={form.values}
                      onChange={form.set}
                    />
                  ) : (
                    <p className="text-sm text-gray-500">
                      این مدل فیلد ورودی مشخصی ندارد.
                    </p>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    loading={createGen.isPending}
                    disabled={selected.locked || !!busy}
                  >
                    <Wand2 className="size-4" />
                    تولید
                  </Button>
                </form>
              </Card>
            )}
          </div>

          {/* Right: active result + history */}
          <div className="space-y-4">
            <Card>
              <h3 className="mb-3 font-semibold">نتیجه</h3>
              {!activeTask ? (
                <EmptyState
                  icon={<Wand2 className="size-10" />}
                  title="هنوز چیزی تولید نشده"
                  description="یک مدل انتخاب کنید، فرم را پر کنید و دکمهٔ تولید را بزنید."
                />
              ) : busy ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <Spinner className="text-brand-500" />
                  <p className="text-sm text-gray-500">
                    وضعیت: {activeTask.status} — در حال پردازش…
                  </p>
                </div>
              ) : activeTask.status === "failed" ? (
                <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
                  تولید ناموفق بود
                  {activeTask.fail_reason ? `: ${activeTask.fail_reason}` : "."}
                </div>
              ) : (
                <div className="space-y-3">
                  <ResultView task={activeTask} />
                  {activeTask.credits_cost != null && (
                    <p className="text-xs text-gray-500">
                      هزینه: {formatCredits(activeTask.credits_cost)} اعتبار
                    </p>
                  )}
                </div>
              )}
            </Card>

            {history && history.length > 0 && (
              <Card>
                <h3 className="mb-3 font-semibold">تاریخچه</h3>
                <ul className="space-y-1">
                  {history.slice(0, 10).map((g) => (
                    <li key={g.id}>
                      <button
                        onClick={() => setActiveTaskId(g.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2 py-2 text-start hover:bg-gray-100 dark:hover:bg-white/5",
                          g.id === activeTaskId && "bg-gray-100 dark:bg-white/5"
                        )}
                      >
                        <span className="truncate text-sm">{g.model}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">
                            {relativeFromNow(g.created_at)}
                          </span>
                          <Badge
                            color={
                              g.status === "success"
                                ? "green"
                                : g.status === "failed"
                                  ? "red"
                                  : "yellow"
                            }
                          >
                            {g.status}
                          </Badge>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
