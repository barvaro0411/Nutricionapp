export type CoachBlock =
  | { type: "paragraph" | "heading"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "divider" };
export type CoachInline = { text: string; style?: "strong" | "emphasis" | "code" };

const tableCells = (line: string) => line.trim().replace(/\\\|/g, "\u0000").replace(/^\||\|$/g, "").split("|").map(cell => cell.trim().replace(/\u0000/g, "|"));
const isTable = (lines: string[], index: number) => lines[index].includes("|") && !!lines[index + 1]
  && tableCells(lines[index + 1]).length >= 2 && tableCells(lines[index + 1]).every(cell => /^:?-{3,}:?$/.test(cell));
const listLine = (line: string) => line.match(/^\s*(-|\*|\+|\d+[.)])\s+(.+)$/);

export function parseCoachBlocks(content: string): CoachBlock[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: CoachBlock[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index++; continue; }
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(line)) { blocks.push({ type: "divider" }); index++; continue; }
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) { blocks.push({ type: "heading", text: heading[1] }); index++; continue; }
    if (isTable(lines, index)) {
      const headers = tableCells(line), rows: string[][] = []; index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(tableCells(lines[index]).slice(0, headers.length)); index++;
      }
      blocks.push({ type: "table", headers, rows }); continue;
    }
    const list = listLine(line);
    if (list) {
      const ordered = /^\d/.test(list[1]), items: string[] = [];
      while (index < lines.length) {
        const next = listLine(lines[index]);
        if (!next || /^\d/.test(next[1]) !== ordered) break;
        items.push(next[2]); index++;
      }
      blocks.push({ type: "list", ordered, items }); continue;
    }
    const paragraph: string[] = [line]; index++;
    while (index < lines.length && lines[index].trim() && !/^#{1,6}\s/.test(lines[index]) && !listLine(lines[index])
      && !isTable(lines, index) && !/^(?:-{3,}|\*{3,}|_{3,})$/.test(lines[index].trim())) {
      paragraph.push(lines[index].trim()); index++;
    }
    blocks.push({ type: "paragraph", text: paragraph.join("\n") });
  }
  return blocks;
}

export function parseCoachInline(text: string): CoachInline[] {
  const parts: CoachInline[] = [], pattern = /\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|\*([^*\n]+)\*|\[([^\]]+)\]\([^)]+\)/g;
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > offset) parts.push({ text: text.slice(offset, match.index) });
    parts.push({ text: match[1] || match[2] || match[3] || match[4] || match[5],
      style: match[1] || match[2] ? "strong" : match[3] ? "code" : match[4] ? "emphasis" : undefined });
    offset = match.index! + match[0].length;
  }
  if (offset < text.length) parts.push({ text: text.slice(offset) });
  return parts;
}

export function coachSpeechText(content: string): string {
  const plain = (text: string) => parseCoachInline(text).map(part => part.text).join("");
  return parseCoachBlocks(content).flatMap(block => {
    if (block.type === "divider") return [];
    if (block.type === "list") return block.items.map(plain);
    if (block.type === "table") return block.rows.map(row => row.map((cell, index) => `${plain(block.headers[index])}: ${plain(cell)}`).join(". "));
    return [plain(block.text)];
  }).join(". ").replace(/\bkcal\b/gi, "kilocalorías").replace(/\bml\b/gi, "mililitros").replace(/\bg\b/g, "gramos")
    .replace(/%/g, " por ciento").replace(/≈|~/g, "aproximadamente ").replace(/→/g, ". ").replace(/\s+/g, " ").trim();
}

export function chunkCoachSpeech(text: string, maximum = 3000): string[] {
  const limit = Math.max(1, Math.floor(maximum)), chunks: string[] = [];
  while (text.length > limit) {
    const space = text.lastIndexOf(" ", limit), end = space > limit / 2 ? space : limit;
    chunks.push(text.slice(0, end)); text = text.slice(end).trimStart();
  }
  if (text) chunks.push(text);
  return chunks;
}
