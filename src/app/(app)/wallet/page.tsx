"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Coins, Crown, ArrowDownToLine, Check } from "lucide-react";
import {
  useWallet,
  usePlans,
  usePayments,
  useTopUp,
  usePurchasePlan,
} from "@/features/wallet/hooks";
import { useMe } from "@/features/profile/hooks";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge, Spinner, EmptyState } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useT, type TranslationKey } from "@/lib/i18n";
import { HooshinuError } from "@/lib/api";
import {
  cn,
  formatCredits,
  formatToman,
  formatDateTime,
} from "@/lib/utils";
import type { TransactionType, PaymentStatus } from "@/lib/types";

const PRESETS = [50000, 100000, 200000, 500000];

const TX_KEY: Record<TransactionType, TranslationKey> = {
  topup: "tx.topup",
  usage: "tx.usage",
  refund: "tx.refund",
  bonus: "tx.bonus",
};

const PAY_META: Record<
  PaymentStatus,
  { key: TranslationKey; color: "green" | "yellow" | "red" }
> = {
  paid: { key: "pay.paid", color: "green" },
  pending: { key: "pay.pending", color: "yellow" },
  failed: { key: "pay.failed", color: "red" },
};

export default function WalletPage() {
  const toast = useToast();
  const qc = useQueryClient();

  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: me } = useMe();
  const { data: plans } = usePlans();
  const { data: payments } = usePayments();
  const topUp = useTopUp();
  const purchase = usePurchasePlan();
  const { t } = useT();

  const [amount, setAmount] = useState(100000);

  // Returning from a payment redirect — refresh balances & plan.
  useEffect(() => {
    qc.invalidateQueries({ queryKey: ["wallet"] });
    qc.invalidateQueries({ queryKey: ["me"] });
    qc.invalidateQueries({ queryKey: ["payments"] });
  }, [qc]);

  async function doTopUp() {
    if (amount < 1000) {
      toast.error(t("wallet.minAmount"));
      return;
    }
    try {
      const { redirect_url } = await topUp.mutateAsync(amount);
      window.location.href = redirect_url;
    } catch (err) {
      toast.error((err as HooshinuError).message);
    }
  }

  async function buyPlan(planId: number) {
    try {
      const { redirect_url } = await purchase.mutateAsync(planId);
      window.location.href = redirect_url;
    } catch (err) {
      toast.error((err as HooshinuError).message);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader title={t("wallet.title")} description={t("wallet.subtitle")} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* Balance + top-up */}
        <div className="space-y-4">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-brand-500 via-brand-600 to-violet-700 text-white shadow-xl shadow-brand-600/30">
            <div className="absolute -end-8 -top-8 size-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-brand-100">
                <Coins className="size-5" />
                <span className="text-sm">{t("wallet.currentCredit")}</span>
              </div>
              <p className="mt-2 text-4xl font-bold tabular-nums">
                {walletLoading ? "…" : formatCredits(wallet?.credits)}
              </p>
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 font-semibold">{t("wallet.topUp")}</h3>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setAmount(p)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-95",
                    amount === p
                      ? "border-brand-500 bg-brand-50 text-brand-600 shadow-sm dark:bg-brand-500/10 dark:text-brand-300"
                      : "border-gray-200 hover:border-brand-300 hover:bg-gray-50 dark:border-white/10 dark:hover:border-brand-500/40 dark:hover:bg-white/[0.03]"
                  )}
                >
                  {formatToman(p)}
                </button>
              ))}
            </div>
            <Input
              type="number"
              dir="ltr"
              min={1000}
              step={1000}
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value || "0", 10))}
              className="mb-3 text-center"
            />
            <Button
              size="lg"
              className="w-full"
              loading={topUp.isPending}
              onClick={doTopUp}
            >
              <ArrowDownToLine className="size-4" />
              {t("wallet.pay")}
            </Button>
            <p className="mt-2 text-center text-xs text-gray-500">
              {t("wallet.gatewayNote")}
            </p>
          </Card>
        </div>

        {/* Plans */}
        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Crown className="size-5 text-amber-500" />
              {t("wallet.plans")}
            </h3>
            {!plans ? (
              <div className="py-8 text-center">
                <Spinner className="text-brand-500" />
              </div>
            ) : plans.length === 0 ? (
              <EmptyState title={t("wallet.noPlans")} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {plans.map((plan) => {
                  const current = me?.plan.level === plan.level && plan.level > 0;
                  return (
                    <div
                      key={plan.id}
                      className={cn(
                        "rounded-xl border p-4",
                        current
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                          : "border-gray-200 dark:border-white/10"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{plan.name}</h4>
                        {current && <Badge color="brand">{t("wallet.planActive")}</Badge>}
                      </div>
                      <p className="mt-2 text-2xl font-bold">
                        {formatToman(plan.price_toman)}
                      </p>
                      <ul className="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                        <li className="flex items-center gap-2">
                          <Check className="size-4 text-green-500" />
                          {t("wallet.planCredits", {
                            credits: formatCredits(plan.credits),
                          })}
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="size-4 text-green-500" />
                          {t("wallet.planDuration", { days: plan.duration_days })}
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="size-4 text-green-500" />
                          {t("wallet.planLevel", { level: plan.level })}
                        </li>
                      </ul>
                      <Button
                        size="sm"
                        variant={current ? "secondary" : "primary"}
                        className="mt-4 w-full"
                        disabled={current || purchase.isPending}
                        onClick={() => buyPlan(plan.id)}
                      >
                        {current ? t("wallet.currentPlan") : t("wallet.buy")}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Transactions */}
      <Card className="mt-6">
        <h3 className="mb-3 font-semibold">{t("wallet.transactions")}</h3>
        {!wallet ? (
          <div className="py-8 text-center">
            <Spinner className="text-brand-500" />
          </div>
        ) : wallet.transactions.length === 0 ? (
          <EmptyState title={t("wallet.noTransactions")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-start text-xs text-gray-500">
                <tr className="border-b border-gray-200 dark:border-white/10">
                  <th className="py-2 text-start font-medium">{t("wallet.colType")}</th>
                  <th className="py-2 text-start font-medium">{t("wallet.colAmount")}</th>
                  <th className="py-2 text-start font-medium">{t("wallet.colBalanceAfter")}</th>
                  <th className="py-2 text-start font-medium">{t("wallet.colDate")}</th>
                </tr>
              </thead>
              <tbody>
                {wallet.transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-gray-100 last:border-0 dark:border-white/5"
                  >
                    <td className="py-2.5">
                      <Badge
                        color={
                          tx.type === "usage"
                            ? "red"
                            : tx.type === "bonus"
                              ? "brand"
                              : "green"
                        }
                      >
                        {t(TX_KEY[tx.type])}
                      </Badge>
                    </td>
                    <td
                      className={cn(
                        "py-2.5 tabular-nums",
                        tx.credits < 0 ? "text-red-500" : "text-green-600"
                      )}
                    >
                      {tx.credits > 0 ? "+" : ""}
                      {formatCredits(tx.credits)}
                    </td>
                    <td className="py-2.5 tabular-nums text-gray-500">
                      {formatCredits(tx.balance_after)}
                    </td>
                    <td className="py-2.5 text-xs text-gray-500">
                      {formatDateTime(tx.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Payments */}
      {payments && payments.length > 0 && (
        <Card className="mt-6">
          <h3 className="mb-3 font-semibold">{t("wallet.payments")}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500">
                <tr className="border-b border-gray-200 dark:border-white/10">
                  <th className="py-2 text-start font-medium">{t("wallet.colAmount")}</th>
                  <th className="py-2 text-start font-medium">{t("wallet.colCredits")}</th>
                  <th className="py-2 text-start font-medium">{t("wallet.colStatus")}</th>
                  <th className="py-2 text-start font-medium">{t("wallet.colDate")}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-100 last:border-0 dark:border-white/5"
                  >
                    <td className="py-2.5">{formatToman(p.amount_toman)}</td>
                    <td className="py-2.5 tabular-nums">
                      {formatCredits(p.credits)}
                    </td>
                    <td className="py-2.5">
                      <Badge color={PAY_META[p.status].color}>
                        {t(PAY_META[p.status].key)}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-xs text-gray-500">
                      {formatDateTime(p.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
