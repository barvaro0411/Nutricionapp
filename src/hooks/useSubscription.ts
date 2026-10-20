import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  getSubscription,
  activateTrial,
  UserSubscription,
  SubscriptionPlanId,
  MAX_FREE_DAILY_SCANS,
} from "@/services/subscriptionService";

export function useSubscription() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const subQuery = useQuery<UserSubscription>({
    queryKey: ["userSubscription", user?.id],
    enabled: !!user?.id,
    queryFn: () => getSubscription(user!.id),
  });

  const activateTrialMutation = useMutation({
    mutationFn: async (planId?: Exclude<SubscriptionPlanId, "free">) => {
      if (!user) throw new Error("Inicia sesión para activar tu prueba.");
      return activateTrial(user.id, planId || "pro_annual_clp");
    },
    onSuccess: (newSub) => {
      queryClient.setQueryData(["userSubscription", user?.id], newSub);
      queryClient.invalidateQueries({ queryKey: ["userSubscription"] });
    },
  });

  const subscription: UserSubscription = subQuery.data || {
    userId: user?.id || "",
    status: "free",
    planId: "free",
    isPro: false,
    currentPeriodEnd: null,
    trialUsed: false,
    aiPhotoScansToday: 0,
    maxFreeScans: MAX_FREE_DAILY_SCANS,
    scansRemaining: MAX_FREE_DAILY_SCANS,
  };

  return {
    subscription,
    isPro: subscription.isPro,
    trialUsed: Boolean(subscription.trialUsed),
    scansRemaining: subscription.scansRemaining,
    scansToday: subscription.aiPhotoScansToday,
    maxFreeScans: subscription.maxFreeScans,
    isLoading: subQuery.isLoading,
    refetch: subQuery.refetch,
    activateTrial: activateTrialMutation.mutateAsync,
    isActivatingTrial: activateTrialMutation.isPending,
  };
}
