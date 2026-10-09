import { parseCoachBlocks, parseCoachInline, coachSpeechText, chunkCoachSpeech } from "../coachFormatting";
const legacy = "### Desayuno ideal (≈07:00 h)\n\n**Objetivo del día:** 2150–2200 kcal\n\n| Alimento | Cantidad | kcal |\n| --- | ---: | ---: |\n| Avena | 60 g | 230 |\n| Leche | 200 ml | 70 |\n| Plátano | 100 g | 90 |\n\n**Total:** 390 kcal\n\n- Usa fruta de temporada\n- Toma agua";
test("legacy coach table becomes labeled food rows without changing quantities", () => {
  const blocks = parseCoachBlocks(legacy);
  expect(blocks[0]).toEqual({ type: "heading", text: "Desayuno ideal (≈07:00 h)" });
  expect(blocks.find(b => b.type === "table")).toEqual({ type: "table", headers: ["Alimento", "Cantidad", "kcal"], rows: [["Avena", "60 g", "230"], ["Leche", "200 ml", "70"], ["Plátano", "100 g", "90"]] });
  expect(blocks.at(-1)).toEqual({ type: "list", ordered: false, items: ["Usa fruta de temporada", "Toma agua"] });
  expect(parseCoachInline("**Total:** 390 kcal")).toEqual([{ text: "Total:", style: "strong" }, { text: " 390 kcal" }]);
});
test("speech preserves nutrition and expands units while omitting formatting", () => {
  const speech = coachSpeechText(legacy);
  expect(speech).toContain("Cantidad: 60 gramos. kilocalorías: 230");
  expect(speech).toContain("200 mililitros"); expect(speech).toContain("Total: 390 kilocalorías");
  expect(speech).not.toMatch(/\*\*|###|\|/);
});
test("escaped pipes and malformed tables retain readable text", () => {
  expect(parseCoachBlocks("| Alimento | Nota |\n| --- | --- |\n| Pan \\| integral | 50 g |")[0]).toEqual({ type: "table", headers: ["Alimento", "Nota"], rows: [["Pan | integral", "50 g"]] });
  expect(parseCoachBlocks("Pan | Leche\n50 g | 200 ml")[0].type).toBe("paragraph");
});
test("generated links and HTML remain inert text", () => {
  const parts = parseCoachInline("[Receta](javascript:alert(1)) <script>bad()</script>");
  expect(parts[0].text).toBe("Receta"); expect(parts.every(p => !('href' in p))).toBe(true);
  expect(parts.at(-1)?.text).toContain("<script>");
});
test("long speech splits without dropping content or exceeding device limits", () => {
  const text = Array.from({ length: 50 }, (_, i) => `alimento${i}`).join(" ");
  const chunks = chunkCoachSpeech(text, 80);
  expect(chunks.length).toBeGreaterThan(1); expect(chunks.every(c => c.length <= 80)).toBe(true); expect(chunks.join(" ")).toBe(text);
  expect(chunkCoachSpeech("")).toEqual([]);
});
