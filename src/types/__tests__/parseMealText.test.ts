import { ParseMealTextRequestSchema } from "../../../supabase/functions/parse-meal-text/types";

describe("ParseMealTextRequestSchema", () => {
  test("validates valid text input", () => {
    const input = {
      text: "Dos marraquetas con palta y huevo",
      client_time_iso: "2026-10-02T12:00:00.000Z",
    };

    const parsed = ParseMealTextRequestSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  test("validates valid audio base64 input", () => {
    const input = {
      audio_base64: "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
      audio_mime_type: "audio/m4a",
    };

    const parsed = ParseMealTextRequestSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  test("rejects when neither text nor audio is provided", () => {
    const input = {
      client_time_iso: "2026-10-02T12:00:00.000Z",
    };

    const parsed = ParseMealTextRequestSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });
});
