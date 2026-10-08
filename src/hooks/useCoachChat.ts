import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
    mutationFn: async (messageText: string) => {
      if (!user) throw new Error("No hay usuario autenticado");

      const clientTimeIso = new Date().toISOString();

      const { data, error } = await supabase.functions.invoke("nutrition-coach", {
        body: {
          message: messageText.trim(),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coachMessages", user?.id] });
    },
  });

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    error: messagesQuery.error,
    refetch: messagesQuery.refetch,
    sendMessage: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
  };
}
