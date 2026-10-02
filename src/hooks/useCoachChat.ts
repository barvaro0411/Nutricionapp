import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export function useCoachChat() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // 1. Obtener historial de mensajes
  const messagesQuery = useQuery({
    queryKey: ["coachMessages", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<CoachMessage[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("coach_messages")
        .select("id, role, content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) {
        console.error("Error al cargar mensajes del coach:", error);
        return [];
      }

      return (data || []).map((m: any) => ({
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
        throw new Error(error.message || "Error al conectar con el Coach");
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
    sendMessage: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
  };
}
