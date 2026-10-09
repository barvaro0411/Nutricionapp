import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { randomUUID } from "expo-crypto";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { extractFunctionErrorMessage } from "@/utils/functionErrors";

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export function useCoachChat() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const lastRequest = useRef<{ userId: string; message: string; id: string } | null>(null);
  const pendingRequest = useRef<Promise<unknown> | null>(null);

  // 1. Obtener historial de mensajes
  const messagesQuery = useQuery({
    queryKey: ["coachMessages", user?.id],
    enabled: !!user?.id,
    queryFn: async ({ signal }): Promise<CoachMessage[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("coach_messages")
        .select("id, role, content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .order("role", { ascending: true })
        .limit(50)
        .abortSignal(signal);

      if (error) {
        console.error("Error al cargar mensajes del coach:", error);
        throw new Error("No se pudo cargar la conversación. Reintenta.");
      }

      return (data || []).reverse().map((m: any) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        created_at: m.created_at,
      }));
    },
  });

  // 2. Enviar mensaje al Coach
  const sendMessageMutation = useMutation({
    mutationFn: async (request: { message: string; id: string; userId: string }) => {
      if (!user || request.userId !== user.id) throw new Error("No hay usuario autenticado");

      const clientTimeIso = new Date().toISOString();

      const { data, error } = await supabase.functions.invoke("nutrition-coach", {
        body: {
          message: request.message,
          request_id: request.id,
          client_time_iso: clientTimeIso,
        },
      });

      if (error) {
        const readableMsg = await extractFunctionErrorMessage(
          error,
          "No pudimos conectar con el Coach. Inténtalo de nuevo."
        );
        throw new Error(readableMsg);
      }

      if (!data || !data.success) {
        throw new Error(data?.error?.message || "El Coach no pudo responder.");
      }

      return data;
    },
    onSuccess: async (_data, request) => {
      lastRequest.current = null;
      await queryClient.invalidateQueries({ queryKey: ["coachMessages", request.userId] });
    },
  });

  const mutateAsync = sendMessageMutation.mutateAsync;
  const sendMessage = useCallback((text: string): Promise<unknown> => {
    if (pendingRequest.current) return pendingRequest.current;
    if (!user) return Promise.reject(new Error("No hay usuario autenticado"));
    const message = text.trim();
    const previous = lastRequest.current;
    const request = previous?.userId === user.id && previous.message === message
      ? previous : { userId: user.id, message, id: randomUUID() };
    lastRequest.current = request;
    const pending = mutateAsync(request).finally(() => {
      if (pendingRequest.current === pending) pendingRequest.current = null;
    });
    pendingRequest.current = pending;
    return pending;
  }, [mutateAsync, user]);

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    error: messagesQuery.error,
    refetch: messagesQuery.refetch,
    sendMessage,
    sendError: sendMessageMutation.error,
    pendingMessage: sendMessageMutation.isPending ? sendMessageMutation.variables?.message : undefined,
    isSending: sendMessageMutation.isPending,
  };
}
