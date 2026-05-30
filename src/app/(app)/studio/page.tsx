"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Wand2,
  Image as ImageIcon,
  Video,
  Music,
  Lock,
  Sparkles,
  AlertTriangle,
  Coins,
  Clock,
} from "lucide-react";
import { useModels } from "@/features/models/hooks";
import {
  useCreateGeneration,
  useGeneration,
  useGenerations,
} from "@/features/studio/hooks";
import { useSchemaForm, SchemaFields } from "@/features/studio/SchemaForm";
import {
  resolveFields,
  buildInput,
  firstMissingRequired,
} from "@/features/studio/schemaInput";
import { ResultView } from "@/features/studio/ResultView";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge, Skeleton, EmptyState } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { HooshinuError } from "@/lib/api";
import { cn, formatCredits, relativeFromNow } from "@/lib/utils";
import type { AiModel, ModelCategory } from "@/lib/types";

type MediaCategory = Exclude<ModelCategory, "text">;

const CAT_META: Record<
  MediaCategory,
  { label: string; icon: typeof ImageIcon }
> = {
  image: { label: "تصویر", icon: ImageIcon },
  video: { label: "ویدیو", icon: Video },
  audio: { label: "صدا", icon: Music },
};

const ALL_CATS: MediaCategory[] = ["image", "video", "audio"];

const STATUS_META: Record<
  string,
  { label: string; color: "green" | "yellow" | "red" | "gray" }
> = {
  success: { label: "موفق", color: "green" },
  failed: { label: "ناموفق", color: "red" },
  processing: { label: "در حال پردازش", color: "yellow" },
  queued: { label: "در صف", color: "yellow" },
  pending: { label: "در انتظار", color: "gray" },
};

export default function StudioPage() {
  const { data: models, isLoading } = useModels();
  const toast = useToast();
  const createGen = useCreateGeneration();
  const { data: history } = useGenerations();

  const [category, setCategory] = useState<MediaCategory>("image");
  const [selectedId, setSelectedId] = useState<string>("");
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);

  const mediaModels = useMemo(
    () => (models ?? []).filter((m) => m.category !== "text"),
    [models]
  );

  // Which categories actually have models — used to show/hide tabs.
  const availableCats = useMemo(
    () => ALL_CATS.filter((c) => mediaModels.some((m) => m.category === c)),
    [mediaModels]
  );

  const catModels = useMemo(
    () => mediaModels.filter((m) => m.category === category),
    [mediaModels, category]
  );

  const selected: AiModel | undefined = useMemo(
    () => mediaModels.find((m) => m.id === selectedId),
    [mediaModels, selectedId]
  );

  // Default the active category to the first one that has models.
  useEffect(() => {
    if (availableCats.length && !availableCats.includes(category)) {
      setCategory(availableCats[0]);
    }
  }, [availableCats, category]);

  // Default selection to the first unlocked model in the active category.
  useEffect(() => {
    if (catModels.length && !catModels.some((m) => m.id === selectedId)) {
      const first = catModels.find((m) => !m.locked) ?? catModels[0];
      setSelectedId(first.id);
    }
  }, [catModels, selectedId]);

  // Resolve once — the backend may send the schema as an array, a JSON
  // string, or an object map (or omit it). Falls back to a prompt field.
  // Everything downstream uses this.
  const fields = useMemo(
    () => resolveFields(selected?.schema),
    [selected]
  );

  const form = useSchemaForm(fields);
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
    const input = buildInput(form.values);
    const missing = firstMissingRequired(fields, input);
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

  const hasSchema = fields.length > 0;

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <span className="bg-gradient-to-l from-brand-500 to-violet-500 bg-clip-text text-transparent">
              استودیو
            </span>
            <Sparkles className="size-5 text-brand-500" />
          </span>
        }
        description="تولید تصویر، ویدیو و صدا با مدل‌های هوش مصنوعی"
      />

      {/* Category tabs */}
      {availableCats.length > 1 && (
        <div className="mb-6 inline-flex rounded-2xl border border-gray-200 bg-gray-50 p-1 dark:border-white/[0.06] dark:bg-white/[0.03]">
          {availableCats.map((c) => {
            const { label, icon: Icon } = CAT_META[c];
            const active = c === category;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
                  active
                    ? "bg-white text-brand-600 shadow-sm dark:bg-white/10 dark:text-brand-300"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <StudioSkeleton />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          {/* Left: model picker + form */}
          <div className="space-y-4">
            <Card>
              <label className="mb-3 block text-sm font-medium">
                انتخاب مدل
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {catModels.map((m) => {
                  const Icon = CAT_META[m.category as MediaCategory]?.icon ?? Wand2;
                  const active = m.id === selectedId;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedId(m.id)}
                      className={cn(
                        "group relative flex items-center gap-2.5 overflow-hidden rounded-xl border p-3 text-start text-sm transition-all",
                        active
                          ? "border-brand-500 bg-brand-50 shadow-sm dark:bg-brand-500/10"
                          : "border-gray-200 hover:border-brand-300 hover:bg-gray-50 dark:border-white/[0.08] dark:hover:border-brand-500/40 dark:hover:bg-white/[0.03]"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                          active
                            ? "bg-gradient-to-br from-brand-400 to-brand-600 text-white"
                            : "bg-gray-100 text-gray-500 group-hover:text-brand-500 dark:bg-white/[0.06]"
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {m.name}
                        </span>
                        <span className="block truncate text-xs text-gray-400">
                          ~{formatCredits(m.price)} / {m.unit}
                        </span>
                      </span>
                      {m.locked && (
                        <Lock className="size-4 shrink-0 text-amber-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>

            {selected && (
              <Card className="animate-fade-in">
                <form onSubmit={submit} className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold">{selected.name}</h3>
                    <Badge color="brand">
                      <Coins className="size-3" />~
                      {formatCredits(selected.price)} / {selected.unit}
                    </Badge>
                  </div>

                  {selected.locked ? (
                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                      <Lock className="mt-0.5 size-4 shrink-0" />
                      <span>
                        این مدل به پلن سطح {selected.min_plan_level} یا بالاتر نیاز
                        دارد. برای دسترسی، پلن خود را ارتقا دهید.
                      </span>
                    </div>
                  ) : hasSchema ? (
                    <SchemaFields
                      schema={fields}
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
                    {busy ? "در حال تولید…" : "تولید کن"}
                  </Button>
                </form>
              </Card>
            )}
          </div>

          {/* Right: active result + history */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <Sparkles className="size-4 text-brand-500" />
                نتیجه
              </h3>
              {!activeTask ? (
                <EmptyState
                  icon={<Wand2 className="size-7" />}
                  title="هنوز چیزی تولید نشده"
                  description="یک مدل انتخاب کنید، فرم را پر کنید و دکمهٔ تولید را بزنید."
                />
              ) : busy ? (
                <GeneratingState status={activeTask.status} />
              ) : activeTask.status === "failed" ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    تولید ناموفق بود
                    {activeTask.fail_reason
                      ? `: ${activeTask.fail_reason}`
                      : "."}
                  </span>
                </div>
              ) : (
                <div className="animate-fade-in space-y-3">
                  <ResultView task={activeTask} />
                  {activeTask.credits_cost != null && (
                    <p className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Coins className="size-3.5" />
                      هزینه: {formatCredits(activeTask.credits_cost)} اعتبار
                    </p>
                  )}
                </div>
              )}
            </Card>

            {history && history.length > 0 && (
              <Card>
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <Clock className="size-4 text-gray-400" />
                  تاریخچه
                </h3>
                <ul className="space-y-1">
                  {history.slice(0, 10).map((g) => {
                    const meta = STATUS_META[g.status] ?? STATUS_META.pending;
                    return (
                      <li key={g.id}>
                        <button
                          onClick={() => setActiveTaskId(g.id)}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-start transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.04]",
                            g.id === activeTaskId &&
                              "bg-brand-50 dark:bg-brand-500/10"
                          )}
                        >
                          <span className="truncate text-sm font-medium">
                            {g.model}
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="text-xs text-gray-400">
                              {relativeFromNow(g.created_at)}
                            </span>
                            <Badge color={meta.color}>{meta.label}</Badge>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GeneratingState({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="relative flex size-16 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/20" />
        <span className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white">
          <Sparkles className="size-7 animate-pulse" />
        </span>
      </div>
      <div className="text-center">
        <p className="font-medium">در حال تولید…</p>
        <p className="mt-1 text-sm text-gray-500">وضعیت: {meta.label}</p>
      </div>
    </div>
  );
}

function StudioSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      <div className="space-y-4">
        <Card>
          <Skeleton className="mb-3 h-4 w-24" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </Card>
        <Card>
          <Skeleton className="mb-4 h-5 w-32" />
          <Skeleton className="mb-3 h-24" />
          <Skeleton className="h-11" />
        </Card>
      </div>
      <Card>
        <Skeleton className="mb-3 h-5 w-20" />
        <Skeleton className="h-64" />
      </Card>
    </div>
  );
}
