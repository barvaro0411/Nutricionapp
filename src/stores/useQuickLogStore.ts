import { create } from "zustand";

interface QuickLogState {
  isOpen: boolean;
  showTextVoice: boolean;
  showFavorites: boolean;
  openQuickLog: () => void;
  closeQuickLog: () => void;
  openTextVoice: () => void;
  closeTextVoice: () => void;
  openFavorites: () => void;
  closeFavorites: () => void;
}

export const useQuickLogStore = create<QuickLogState>((set) => ({
  isOpen: false,
  showTextVoice: false,
  showFavorites: false,
  openQuickLog: () => set({ isOpen: true }),
  closeQuickLog: () => set({ isOpen: false }),
  openTextVoice: () => set({ showTextVoice: true, isOpen: false }),
  closeTextVoice: () => set({ showTextVoice: false }),
  openFavorites: () => set({ showFavorites: true, isOpen: false }),
  closeFavorites: () => set({ showFavorites: false }),
}));
