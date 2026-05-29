"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiData } from "@/lib/api";
import type { GenerationTask, CreateGenerationBody } from "@/lib/types";

export const generationsKey = ["generations"] as const;

export function useGenerations() {
  return useQuery({
    queryKey: generationsKey,
    queryFn: () => apiData<GenerationTask[]>("/generations"),
  });
}

const TERMINAL = new Set(["success", "failed"]);

/** Poll a single generation while it is in a non-terminal state. */
export function useGeneration(id: number | null) {
  return useQuery({
    queryKey: [...generationsKey, id],
    queryFn: () => apiData<GenerationTask>(`/generations/${id}`),
    enabled: id != null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TERMINAL.has(status) ? false : 2500;
    },
  });
}

export function useCreateGeneration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGenerationBody) =>
      apiData<GenerationTask>("/generations", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: generationsKey });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}
