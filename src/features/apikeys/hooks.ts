"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiData } from "@/lib/api";
import type { ApiKey, CreateApiKeyResponse } from "@/lib/types";

export const apiKeysKey = ["api-keys"] as const;

export function useApiKeys() {
  return useQuery({
    queryKey: apiKeysKey,
    queryFn: () => apiData<ApiKey[]>("/api-keys"),
  });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api<CreateApiKeyResponse>("/api-keys", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: apiKeysKey }),
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api<unknown>(`/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: apiKeysKey }),
  });
}
