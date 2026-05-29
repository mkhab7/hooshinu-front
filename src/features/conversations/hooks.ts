"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiData } from "@/lib/api";
import type {
  ConversationSummary,
  ConversationDetail,
  ChatMessage,
} from "@/lib/types";

export const conversationsKey = ["conversations"] as const;

export function useConversations() {
  return useQuery({
    queryKey: conversationsKey,
    queryFn: () => apiData<ConversationSummary[]>("/conversations"),
  });
}

export function useConversation(id: number | null) {
  return useQuery({
    queryKey: [...conversationsKey, id],
    queryFn: () => apiData<ConversationDetail>(`/conversations/${id}`),
    enabled: id != null,
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { model: string; title?: string }) =>
      apiData<ConversationSummary>("/conversations", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: conversationsKey });
    },
  });
}

export function useSendMessage(conversationId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      apiData<ChatMessage>(`/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [...conversationsKey, conversationId],
      });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}
