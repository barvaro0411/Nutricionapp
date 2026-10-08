jest.mock("react-native", () => ({ Platform: { OS: "android" } }));
jest.mock("expo-secure-store", () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/stores/useAuthStore", () => ({ useAuthStore: { getState: () => ({ user: mockUser }) } }));
jest.mock("expo-notifications", () => ({
  getAllScheduledNotificationsAsync: jest.fn(), cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn(), requestPermissionsAsync: jest.fn(), setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn().mockResolvedValue("scheduled"),
  AndroidImportance: { DEFAULT: 3 }, SchedulableTriggerInputTypes: { DAILY: "daily" },
}));
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { syncAllScheduledReminders, toggleReminder } from "../notificationService";
let mockUser: { id: string } | null = { id: "owner" };

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { id: "owner" };
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({ reminder_breakfast: true }));
  (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([{ identifier: "reminder_breakfast" }, { identifier: "unrelated" }]);
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
  (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
  (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue("scheduled");
});
test("restores enabled reminders at startup without asking for permission again", async () => {
  await syncAllScheduledReminders("owner");
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({ identifier: "reminder_breakfast" }));
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(SecureStore.getItemAsync).toHaveBeenCalledWith("reminders_owner");
});
test("logout cancels meal reminders while preserving unrelated notifications", async () => {
  mockUser = null;
  await syncAllScheduledReminders(null);
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("reminder_breakfast");
  expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith("unrelated");
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});
test("a logout during startup prevents the former account from rescheduling", async () => {
  let finishPermission!: (value: { granted: boolean }) => void;
  (Notifications.getPermissionsAsync as jest.Mock).mockReturnValue(new Promise(resolve => { finishPermission = resolve; }));
  const starting = syncAllScheduledReminders("owner");
  await new Promise(resolve => setImmediate(resolve));
  mockUser = null;
  const leaving = syncAllScheduledReminders(null);
  finishPermission({ granted: true });
  await Promise.all([starting, leaving]);
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});
test("revoked permission does not prompt or reschedule at startup", async () => {
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
  await syncAllScheduledReminders("owner");
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
});
test("scheduling failures do not mark the preference as enabled", async () => {
  (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(new Error("schedule failed"));
  const warning = jest.spyOn(console, "warn").mockImplementation(() => {});
  try {
    await expect(toggleReminder("reminder_lunch", true)).rejects.toThrow("No se pudo programar");
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  } finally { warning.mockRestore(); }
});
