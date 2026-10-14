import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  getSubscription,
  activateTrial,
  UserSubscription,
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
    mutationFn: async () => {
      if (!user) throw new Error("Inicia sesión para activar tu prueba.");
      return activateTrial(user.id);
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
    aiPhotoScansToday: 0,
    maxFreeScans: MAX_FREE_DAILY_SCANS,
    scansRemaining: MAX_FREE_DAILY_SCANS,
  };

  return {
    subscription,
    isPro: subscription.isPro,
    scansRemaining: subscription.scansRemaining,
    scansToday: subscription.aiPhotoScansToday,
    maxFreeScans: subscription.maxFreeScans,
    isLoading: subQuery.isLoading,
    refetch: subQuery.refetch,
    activateTrial: activateTrialMutation.mutateAsync,
    isActivatingTrial: activateTrialMutation.isPending,
  };
}
