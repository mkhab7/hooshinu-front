"use client";

import Link from "next/link";
import {
  Coins,
  Crown,
  MessageSquare,
  Wand2,
  ArrowLeft,
} from "lucide-react";
import { useMe } from "@/features/profile/hooks";
import { useConversations } from "@/features/conversations/hooks";
import { useGenerations } from "@/features/studio/hooks";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge, EmptyState, Spinner } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCredits, formatDateTime, relativeFromNow } from "@/lib/utils";

export default function DashboardPage() {
  const { data: me } = useMe();
  const { data: conversations } = useConversations();
  const { data: generations } = useGenerations();

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader
        title={`سلام${me?.name ? `، ${me.name}` : ""} 👋`}
        description="نمای کلی حساب شما در هوشینو"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-brand-600 to-brand-800 text-white">
          <div className="flex items-center gap-2 text-brand-100">
            <Coins className="size-5" />
            <span className="text-sm">اعتبار کیف پول</span>
          </div>
          <p className="mt-3 text-3xl font-bold tabular-nums">
            {formatCredits(me?.credits)}
          </p>
          <Link href="/wallet">
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 bg-white/20 text-white hover:bg-white/30"
            >
              افزایش اعتبار
            </Button>
          </Link>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-gray-500">
            <Crown className="size-5 text-amber-500" />
            <span className="text-sm">اشتراک فعال</span>
          </div>
          <p className="mt-3 text-xl font-bold">
            {me?.plan.level && me.plan.level > 0 ? (
              me.plan.name
            ) : (
              <span className="text-gray-400">بدون اشتراک</span>
            )}
          </p>
          {me?.plan.expires_at ? (
            <p className="mt-1 text-xs text-gray-500">
              انقضا: {formatDateTime(me.plan.expires_at)}
            </p>
          ) : (
            <Link href="/wallet">
              <Button variant="ghost" size="sm" className="mt-3 px-0 text-brand-500">
                مشاهده پلن‌ها
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
          )}
        </Card>

        <Card className="flex flex-col justify-between">
          <p className="text-sm text-gray-500">شروع سریع</p>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/chat">
              <Button variant="secondary" size="sm" className="w-full justify-start">
                <MessageSquare className="size-4" />
                گفتگوی جدید
              </Button>
            </Link>
            <Link href="/studio">
              <Button variant="secondary" size="sm" className="w-full justify-start">
                <Wand2 className="size-4" />
                تولید رسانه
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">گفتگوهای اخیر</h2>
            <Link href="/chat" className="text-sm text-brand-500 hover:underline">
              همه
            </Link>
          </div>
          {!conversations ? (
            <div className="py-8 text-center">
              <Spinner className="text-brand-500" />
            </div>
          ) : conversations.length === 0 ? (
            <EmptyState title="هنوز گفتگویی ندارید" />
          ) : (
            <ul className="space-y-1">
              {conversations.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/chat?c=${c.id}`}
                    className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-gray-100 dark:hover:bg-white/5"
                  >
                    <span className="truncate text-sm">
                      {c.title || "گفتگوی بدون عنوان"}
                    </span>
                    <span className="shrink-0 text-xs text-gray-400">
                      {relativeFromNow(c.updated_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">تولیدهای اخیر</h2>
            <Link href="/studio" className="text-sm text-brand-500 hover:underline">
              همه
            </Link>
          </div>
          {!generations ? (
            <div className="py-8 text-center">
              <Spinner className="text-brand-500" />
            </div>
          ) : generations.length === 0 ? (
            <EmptyState title="هنوز تولیدی ندارید" />
          ) : (
            <ul className="space-y-1">
              {generations.slice(0, 5).map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between rounded-lg px-2 py-2"
                >
                  <span className="truncate text-sm">{g.model}</span>
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
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
