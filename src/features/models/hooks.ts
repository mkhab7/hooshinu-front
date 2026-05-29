"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AiModel, ModelsResponse, ModelCategory } from "@/lib/types";

export const modelsKey = ["models"] as const;

export function useModels() {
  return useQuery({
    queryKey: modelsKey,
    queryFn: () => api<ModelsResponse>("/models"),
    select: (res) => res.data,
    staleTime: 5 * 60_000,
  });
}

export function useModelsByCategory(category: ModelCategory) {
  return useQuery({
    queryKey: [...modelsKey, category],
    queryFn: () => api<ModelsResponse>("/models"),
    select: (res): AiModel[] =>
      res.data.filter((m) => m.category === category),
    staleTime: 5 * 60_000,
  });
}
