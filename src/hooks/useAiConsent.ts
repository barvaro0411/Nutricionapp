import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  getAiConsentStatus,
  setAiConsentStatus,
  AiConsentState,
} from "@/services/privacyService";

export function useAiConsent() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const queryClient = useQueryClient();

  const consentQuery = useQuery<AiConsentState>({
    queryKey: ["aiConsent", user?.id, profile?.ai_consent_at],
    enabled: !!user?.id,
    queryFn: () => getAiConsentStatus(user?.id, profile?.ai_consent_at),
  });

  const mutation = useMutation({
    mutationFn: async (granted: boolean) => {
      if (!user) throw new Error("Inicia sesión para actualizar tu consentimiento.");
      return setAiConsentStatus(user.id, granted);
    },
    onSuccess: (next) => {
      queryClient.setQueryData(["aiConsent", user?.id, next.consentedAt], next);
      queryClient.invalidateQueries({ queryKey: ["aiConsent"] });
    },
  });

  const state: AiConsentState = consentQuery.data || {
    granted: Boolean(profile?.ai_consent_at),
    consentedAt: profile?.ai_consent_at || null,
  };

  return {
    hasConsent: state.granted,
    consentedAt: state.consentedAt,
    isLoading: consentQuery.isLoading,
    setConsent: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
