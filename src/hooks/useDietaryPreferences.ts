import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  DietaryPreferences,
  DietaryRestriction,
  normalizeCustomAllergies,
  normalizeDietaryRestrictions,
} from "@/types/profile";
import {
  getDietaryPreferencesSnapshot,
  saveDietaryPreferencesSnapshot,
} from "@/services/dietaryPreferencesService";

const EMPTY_SNAPSHOT: DietaryPreferences = {
  restrictions: [],
  customAllergies: [],
};

export function useDietaryPreferences() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data = EMPTY_SNAPSHOT, isLoading } = useQuery({
    queryKey: ["dietaryPreferences", userId],
    queryFn: () => getDietaryPreferencesSnapshot(userId),
    staleTime: 1000 * 60 * 10,
  });

  const restrictions = data.restrictions;
  const customAllergies = data.customAllergies;

  const mutation = useMutation({
    mutationFn: (next: DietaryPreferences) =>
      saveDietaryPreferencesSnapshot(next, userId),
    onSuccess: (updated) => {
      queryClient.setQueryData(["dietaryPreferences", userId], updated);
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  const saveAllPreferences = async (next: DietaryPreferences) => {
    return mutation.mutateAsync({
      restrictions: normalizeDietaryRestrictions(next.restrictions),
      customAllergies: normalizeCustomAllergies(next.customAllergies),
    });
  };

  const toggleRestriction = async (restriction: DietaryRestriction) => {
    const exists = restrictions.includes(restriction);
    const updatedRestrictions = exists
      ? restrictions.filter((r) => r !== restriction)
      : [...restrictions, restriction];
    return saveAllPreferences({
      restrictions: updatedRestrictions,
      customAllergies,
    });
  };

  const addCustomAllergy = async (rawTerm: string) => {
    const normalized = normalizeCustomAllergies([...customAllergies, rawTerm]);
    return saveAllPreferences({
      restrictions,
      customAllergies: normalized,
    });
  };

  const removeCustomAllergy = async (term: string) => {
    const updatedAllergies = customAllergies.filter((item) => item !== term);
    return saveAllPreferences({
      restrictions,
      customAllergies: updatedAllergies,
    });
  };

  const hasRestriction = (restriction: DietaryRestriction) =>
    restrictions.includes(restriction);

  return {
    restrictions,
    customAllergies,
    isLoading,
    toggleRestriction,
    addCustomAllergy,
    removeCustomAllergy,
    saveAllPreferences,
    hasRestriction,
    isSaving: mutation.isPending,
  };
}
