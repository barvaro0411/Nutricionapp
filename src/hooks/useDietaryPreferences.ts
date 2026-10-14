import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";
import { DietaryRestriction } from "@/types/profile";
import {
  getDietaryPreferences,
  saveDietaryPreferences,
} from "@/services/dietaryPreferencesService";

export function useDietaryPreferences() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data: restrictions = [], isLoading } = useQuery({
    queryKey: ["dietaryPreferences", userId],
    queryFn: () => getDietaryPreferences(userId),
    staleTime: 1000 * 60 * 10,
  });

  const mutation = useMutation({
    mutationFn: (newRestrictions: DietaryRestriction[]) =>
      saveDietaryPreferences(newRestrictions, userId),
    onSuccess: (updated) => {
      queryClient.setQueryData(["dietaryPreferences", userId], updated);
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  const toggleRestriction = async (restriction: DietaryRestriction) => {
    const exists = restrictions.includes(restriction);
    const updated = exists
      ? restrictions.filter((r) => r !== restriction)
      : [...restrictions, restriction];
    return mutation.mutateAsync(updated);
  };

  const hasRestriction = (restriction: DietaryRestriction) =>
    restrictions.includes(restriction);

  return {
    restrictions,
    isLoading,
    toggleRestriction,
    hasRestriction,
    isSaving: mutation.isPending,
  };
}
