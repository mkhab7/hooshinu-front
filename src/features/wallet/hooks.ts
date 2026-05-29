"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { api, apiData } from "@/lib/api";
import type {
  Wallet,
  Payment,
  Plan,
  RedirectResponse,
} from "@/lib/types";

export const walletKey = ["wallet"] as const;
export const paymentsKey = ["payments"] as const;
export const plansKey = ["plans"] as const;

export function useWallet() {
  return useQuery({
    queryKey: walletKey,
    queryFn: () => api<Wallet>("/wallet"),
  });
}

export function usePayments() {
  return useQuery({
    queryKey: paymentsKey,
    queryFn: () => apiData<Payment[]>("/payments"),
  });
}

export function usePlans() {
  return useQuery({
    queryKey: plansKey,
    queryFn: () => apiData<Plan[]>("/plans"),
    staleTime: 5 * 60_000,
  });
}

export function useTopUp() {
  return useMutation({
    mutationFn: (amount: number) =>
      api<RedirectResponse>("/payments", {
        method: "POST",
        body: JSON.stringify({ amount }),
      }),
  });
}

export function usePurchasePlan() {
  return useMutation({
    mutationFn: (planId: number) =>
      api<RedirectResponse>(`/plans/${planId}/purchase`, { method: "POST" }),
  });
}
