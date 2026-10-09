export type LiveStatus = "idle" | "connecting" | "listening" | "speaking";
export interface LiveCallbacks {
  onStatus: (status: LiveStatus) => void;
  onDraft: (user: string, assistant: string) => void;
  onSaved: () => void;
  onError: (message: string) => void;
}
export interface CoachLiveController { start: () => Promise<void>; stop: () => void }
