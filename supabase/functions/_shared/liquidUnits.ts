const LIQUID_KEYWORDS = [
  "red bull",
  "gatorade",
  "powerade",
  "monster",
  "agua",
  "bebida",
  "jugo",
  "leche",
  "cafe",
  "te",
  "cerveza",
  "energizante",
  "nectar",
  "refresco",
  "soda",
  "gaseosa",
  "kombucha",
  "batido",
  "isotonica",
  "vino",
  "sprite",
  "coca cola",
  "fanta",
];

const SOLID_EXCEPTIONS = [
  "en polvo",
  "molido",
  "molida",
  "hojas",
  "granulado",
  "capsula",
  "capsulas",
  "cápsula",
  "cápsulas",
  "barra",
  "galleta",
];

export function isLiquidFood(foodName: string): boolean {
  if (!foodName) return false;
  const normalized = foodName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  for (const exception of SOLID_EXCEPTIONS) {
    const normException = exception
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes(normException)) {
      return false;
    }
  }

  for (const keyword of LIQUID_KEYWORDS) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
    if (regex.test(normalized)) {
      return true;
    }
  }

  return false;
}

export function resolveItemUnit(item: { food: string; unit?: string }): "g" | "ml" {
  if (item.unit === "ml") return "ml";
  if (item.unit === "g" && isLiquidFood(item.food)) return "ml";
  if (!item.unit && isLiquidFood(item.food)) return "ml";
  return "g";
}
