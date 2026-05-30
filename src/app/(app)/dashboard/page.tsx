"use client";

import Link from "next/link";
import {
  Coins,
  Crown,
  MessageSquare,
  Wand2,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { useMe } from "@/features/profile/hooks";
import { useConversations } from "@/features/conversations/hooks";
import { useGenerations } from "@/features/studio/hooks";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge, EmptyState, Skeleton } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";
import { formatCredits, formatDateTime, relativeFromNow } from "@/lib/utils";

const STATUS_COLOR = {
  success: "green",
  failed: "red",
} as const;

export default function DashboardPage() {
  const { data: me } = useMe();
  const { data: conversations } = useConversations();
  const { data: generations } = useGenerations();
  const { t } = useT();

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader
        title={
          me?.name ? t("dash.greeting", { name: me.name }) : t("dash.greetingNoName")
        }
        description={t("dash.overview")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Credits — hero card */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-brand-500 via-brand-600 to-violet-700 text-white shadow-xl shadow-brand-600/30">
          <div className="absolute -end-6 -top-6 size-28 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-brand-100">
              <Coins className="size-5" />
              <span className="text-sm">{t("dash.walletCredit")}</span>
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums">
              {formatCredits(me?.credits)}
            </p>
            <Link href="/wallet">
              <Button
                variant="secondary"
                size="sm"
                className="mt-4 border-white/20 bg-white/15 text-white backdrop-blur hover:bg-white/25"
              >
                {t("dash.topUp")}
              </Button>
            </Link>
          </div>
        </Card>

        {/* Active plan */}
        <Card>
          <div className="flex items-center gap-2 text-gray-500">
            <Crown className="size-5 text-amber-500" />
            <span className="text-sm">{t("dash.activePlan")}</span>
          </div>
          <p className="mt-3 text-xl font-bold">
            {me?.plan.level && me.plan.level > 0 ? (
              me.plan.name
            ) : (
              <span className="text-gray-400">{t("dash.noPlan")}</span>
            )}
          </p>
          {me?.plan.expires_at ? (
            <p className="mt-1 text-xs text-gray-500">
              {t("dash.expires", { date: formatDateTime(me.plan.expires_at) })}
            </p>
          ) : (
            <Link href="/wallet">
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 px-0 text-brand-500"
              >
                {t("dash.viewPlans")}
                <ArrowLeft className="size-4 rtl:rotate-180" />
              </Button>
            </Link>
          )}
        </Card>

        {/* Quick actions */}
        <Card className="flex flex-col justify-between">
          <p className="flex items-center gap-2 text-sm text-gray-500">
            <Sparkles className="size-4 text-brand-500" />
            {t("dash.quickStart")}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/chat">
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start"
              >
                <MessageSquare className="size-4" />
                {t("dash.newChat")}
              </Button>
            </Link>
            <Link href="/studio">
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start"
              >
                <Wand2 className="size-4" />
                {t("dash.generateMedia")}
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{t("dash.recentChats")}</h2>
            <Link
              href="/chat"
              className="text-sm text-brand-500 hover:underline"
            >
              {t("common.all")}
            </Link>
          </div>
          {!conversations ? (
            <ListSkeleton />
          ) : conversations.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="size-7" />}
              title={t("dash.noChats")}
            />
          ) : (
            <ul className="space-y-1">
              {conversations.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/chat?c=${c.id}`}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.04]"
                  >
                    <span className="truncate text-sm font-medium">
                      {c.title || t("dash.untitledChat")}
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
            <h2 className="font-semibold">{t("dash.recentGenerations")}</h2>
            <Link
              href="/studio"
              className="text-sm text-brand-500 hover:underline"
            >
              {t("common.all")}
            </Link>
          </div>
          {!generations ? (
            <ListSkeleton />
          ) : generations.length === 0 ? (
            <EmptyState
              icon={<Wand2 className="size-7" />}
              title={t("dash.noGenerations")}
            />
          ) : (
            <ul className="space-y-1">
              {generations.slice(0, 5).map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5"
                >
                  <span className="truncate text-sm font-medium">{g.model}</span>
                  <Badge
                    color={
                      STATUS_COLOR[g.status as keyof typeof STATUS_COLOR] ??
                      "yellow"
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

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-10" />
      ))}
    </div>
  );
}
