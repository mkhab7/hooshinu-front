"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiData } from "@/lib/api";
import type { User, UpdateProfileBody } from "@/lib/types";

export const meKey = ["me"] as const;

export function useMe(enabled = true) {
  return useQuery({
    queryKey: meKey,
    queryFn: () => apiData<User>("/me"),
    enabled,
    staleTime: 30_000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProfileBody) =>
      apiData<User>("/me", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (user) => {
      qc.setQueryData(meKey, user);
    },
  });
}
