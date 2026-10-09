import type { CoachLiveController, LiveCallbacks } from "./coachLiveTypes";
export const coachLiveSupported = () => false;
export function createCoachLive(callbacks: LiveCallbacks): CoachLiveController {
  return { start: async () => { callbacks.onError("La conversación en vivo está disponible en la versión web de la app."); }, stop: () => { callbacks.onStatus("idle"); } };
}
