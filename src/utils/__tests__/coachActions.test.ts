import {
  detectWaterAction,
  detectMealAction,
  detectCoachAction,
  embedCoachAction,
  extractCoachAction,
  CoachActionData,
} from "../coachActions";
import { coachSpeechText } from "../coachFormatting";

describe("coachActions", () => {
  describe("detectWaterAction", () => {
    it("detects direct logging commands in ml", () => {
      const res = detectWaterAction("Coach, anota 500 ml de agua");
      expect(res).toEqual({
        type: "water",
        amountMl: 500,
        source: "Coach, anota 500 ml de agua",
      });
    });

    it("detects glass-based water logging", () => {
      const res = detectWaterAction("me tomé 2 vasos de agua");
      expect(res).toEqual({
        type: "water",
        amountMl: 500,
        source: "me tomé 2 vasos de agua",
      });
    });

    it("detects half liter expressions", () => {
      const res = detectWaterAction("registra medio litro de agua por favor");
      expect(res).toEqual({
        type: "water",
        amountMl: 500,
        source: "registra medio litro de agua por favor",
      });
    });

    it("detects liter expressions", () => {
      const res = detectWaterAction("suma 1.5 l de agua");
      expect(res).toEqual({
        type: "water",
        amountMl: 1500,
        source: "suma 1.5 l de agua",
      });
    });

    it("ignores questions about water", () => {
      expect(detectWaterAction("¿cuánta agua tomé hoy?")).toBeNull();
      expect(detectWaterAction("cuanto de agua me falta tomar?")).toBeNull();
    });

    it("ignores unrelated messages", () => {
      expect(detectWaterAction("hola coach como estas")).toBeNull();
      expect(detectWaterAction("dame una receta")).toBeNull();
    });
  });

  describe("detectMealAction", () => {
    it("detects past-tense meal intake commands", () => {
      const res = detectMealAction("comí 2 huevos duros y una marraqueta");
      expect(res).not.toBeNull();
      expect(res?.type).toBe("meal");
      if (res && res.type === "meal") {
        expect(res.description).toBe("2 huevos duros y una marraqueta");
      }
    });

    it("detects specific meal verbs", () => {
      const breakfast = detectMealAction("desayuné avena con leche y plátano");
      expect(breakfast).toEqual({
        type: "meal",
        description: "avena con leche y platano",
        mealType: "desayuno",
        source: "desayuné avena con leche y plátano",
      });

      const lunch = detectMealAction("Coach, anota que almorcé cazuela de vacuno");
      expect(lunch).toEqual({
        type: "meal",
        description: "cazuela de vacuno",
        mealType: "almuerzo",
        source: "Coach, anota que almorcé cazuela de vacuno",
      });
    });

    it("rejects non-food subjective statements", () => {
      expect(detectMealAction("comí poco hoy")).toBeNull();
      expect(detectMealAction("comí mal")).toBeNull();
      expect(detectMealAction("¿qué debería comer?")).toBeNull();
    });
  });

  describe("detectCoachAction entrypoint", () => {
    it("routes water and meals accurately", () => {
      expect(detectCoachAction("anota 300 ml de agua")?.type).toBe("water");
      expect(detectCoachAction("almorcé arroz con pollo")?.type).toBe("meal");
      expect(detectCoachAction("cuéntame un chiste")).toBeNull();
    });
  });

  describe("action tagging and extraction", () => {
    const actionData: CoachActionData = {
      id: "action-123",
      type: "water",
      amountMl: 500,
      status: "confirmed",
      logId: "log-abc",
    };

    it("embeds and extracts structured action tags", () => {
      const rawText = "He anotado 500 ml de agua en tu diario.";
      const embedded = embedCoachAction(rawText, actionData);
      expect(embedded).toContain("<!--coach-action:");

      const { cleanContent, action } = extractCoachAction(embedded);
      expect(cleanContent).toBe(rawText);
      expect(action).toEqual(actionData);
    });

    it("returns null action when no tag is present", () => {
      const normalText = "Hola, ¿en qué te ayudo hoy?";
      const { cleanContent, action } = extractCoachAction(normalText);
      expect(cleanContent).toBe(normalText);
      expect(action).toBeNull();
    });

    it("strips action tag from TTS speech synthesis text", () => {
      const visibleText = "He anotado tu desayuno de hoy.";
      const embedded = embedCoachAction(visibleText, {
        id: "action-456",
        type: "meal",
        description: "Huevos y tostada",
        mealType: "desayuno",
        status: "confirmed",
        items: [],
        totals: { calories: 300, protein: 15, carbs: 20, fat: 10 },
      });

      const speech = coachSpeechText(embedded);
      expect(speech).toBe("He anotado tu desayuno de hoy.");
      expect(speech).not.toContain("coach-action");
      expect(speech).not.toContain("calories");
    });
  });
});
