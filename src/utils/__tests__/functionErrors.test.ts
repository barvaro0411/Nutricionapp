import { extractFunctionErrorMessage } from "../functionErrors";

describe("extractFunctionErrorMessage", () => {
  it("returns fallback message when error is null or undefined", async () => {
    expect(await extractFunctionErrorMessage(null, "Error por defecto")).toBe("Error por defecto");
    expect(await extractFunctionErrorMessage(undefined)).toContain("No se pudo completar");
  });

  it("extracts message from error.context JSON body", async () => {
    const mockError = {
      message: "Edge Function returned a non-2xx status code",
      context: {
        json: async () => ({
          error: { code: "NO_FOOD_DETECTED", message: "No se detectaron alimentos claros." },
        }),
      },
    };

    const msg = await extractFunctionErrorMessage(mockError);
    expect(msg).toBe("No se detectaron alimentos claros.");
  });

  it("extracts message from body.message if error.message is not nested", async () => {
    const mockError = {
      message: "Edge Function returned a non-2xx status code",
      context: {
        json: async () => ({
          message: "Alcanzaste el límite de solicitudes de IA.",
        }),
      },
    };

    const msg = await extractFunctionErrorMessage(mockError);
    expect(msg).toBe("Alcanzaste el límite de solicitudes de IA.");
  });

  it("falls back to text if json parsing fails", async () => {
    const mockError = {
      message: "Edge Function returned a non-2xx status code",
      context: {
        json: async () => {
          throw new Error("Invalid json");
        },
        text: async () => "Gateway Timeout",
      },
    };

    const msg = await extractFunctionErrorMessage(mockError);
    expect(msg).toBe("Gateway Timeout");
  });

  it("preserves standard error.message if not non-2xx generic", async () => {
    const mockError = new Error("Error de conexión a internet");
    const msg = await extractFunctionErrorMessage(mockError);
    expect(msg).toBe("Error de conexión a internet");
  });
});
