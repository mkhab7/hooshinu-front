"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import type {
  OtpVerifyResponse,
} from "@/lib/types";

export function useRequestOtp() {
  return useMutation({
    mutationFn: (phone: string) =>
      api<{ message: string }>("/auth/otp/request", {
        method: "POST",
        body: JSON.stringify({ phone }),
      }),
  });
}

export function useVerifyOtp() {
  const login = useAuthStore((s) => s.login);
  return useMutation({
    mutationFn: (vars: { phone: string; code: string }) =>
      api<OtpVerifyResponse>("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify(vars),
      }),
    onSuccess: (res) => {
      login(res.token);
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  return useMutation({
    mutationFn: () => api<unknown>("/auth/logout", { method: "POST" }),
    // Clear local token regardless of server outcome.
    onSettled: () => logout(),
  });
}
