import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  fetchUserSubscription,
  verifyAndConsumeAiQuota,
  purchaseProPlan,
  SubscriptionInfo,
} from "@/services/subscriptionService";

export function useSubscription() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const subQuery = useQuery({
    queryKey: ["subscription", user?.id],
    enabled: !!user?.id,
    queryFn: () => (user ? fetchUserSubscription(user.id) : null),
  });

  const checkQuotaAndProceed = async (): Promise<boolean> => {
    if (!user) return false;

    const result = await verifyAndConsumeAiQuota(user.id);
    if (!result.allowed) {
      // Abre el Paywall si se acabaron los escaneos gratuitos del día
      router.push("/paywall");
      return false;
    }

    queryClient.invalidateQueries({ queryKey: ["subscription", user.id] });
    return true;
  };

  const purchaseMutation = useMutation({
    mutationFn: async (planId: "pro_monthly_clp" | "pro_annual_clp") => {
      if (!user) throw new Error("No hay usuario autenticado");
      return purchaseProPlan(user.id, planId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription", user?.id] });
    },
  });

  const subData: SubscriptionInfo = subQuery.data || {
    status: "free",
    planId: "free",
    isPro: false,
    remainingAiScans: 3,
  };

  return {
    isPro: subData.isPro,
    planId: subData.planId,
    remainingAiScans: subData.remainingAiScans,
    isLoading: subQuery.isLoading,
    checkQuotaAndProceed,
    purchasePlan: purchaseMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
  };
}
