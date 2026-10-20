import { test, expect } from "@playwright/test";

test.describe("NutricionApp PWA Smoke Suite", () => {
  test("renderiza la pantalla de bienvenida o inicio sin errores fatales", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/");
    await expect(page).toHaveTitle(/Nutrici[oó]n/i);
    expect(pageErrors).toEqual([]);
  });

  test("permite acceder a la pantalla pública de Privacidad, Términos y Datos de IA (/legal)", async ({
    page,
  }) => {
    await page.goto("/legal");
    await expect(
      page.getByText(/Privacidad, Términos y Consentimiento de IA/i)
    ).toBeVisible();
    await expect(
      page.getByText(/Política de Privacidad \(Ley N° 19\.628 \/ Ley N° 21\.719 Chile\)/i)
    ).toBeVisible();
  });
});
