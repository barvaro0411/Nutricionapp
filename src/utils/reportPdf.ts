import { NutritionistReportData } from "@/services/nutritionistReportService";

function escapeHtml(text: string | number | null | undefined): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const OBJECTIVE_LABELS: Record<string, string> = {
  lose_weight: "Reducir grasa corporal",
  maintain: "Mantener peso",
  gain_muscle: "Ganar masa muscular",
};

interface ParsedDayLine {
  date: string;
  energyText: string;
  waterText: string;
}

function parseDailyRows(formattedText: string): ParsedDayLine[] {
  const lines = formattedText.split("\n");
  const rows: ParsedDayLine[] = [];
  for (const line of lines) {
    const match = /^(\d{4}-\d{2}-\d{2}):\s*(.+?)\s*\|\s*(.+)$/.exec(line.trim());
    if (match) {
      rows.push({
        date: match[1],
        energyText: match[2],
        waterText: match[3],
      });
    }
  }
  return rows;
}

/**
 * Construye un documento HTML A4 autocontenido optimizado para imprimir o guardar como PDF.
 */
export function buildNutritionistReportHtml(report: NutritionistReportData): string {
  const objectiveLabel = OBJECTIVE_LABELS[report.objective] || report.objective || "Sin definir";
  const dailyRows = parseDailyRows(report.formattedText);
  const generatedAt = new Date().toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const rowsHtml = dailyRows.length
    ? dailyRows
        .map(
          (row) => `
          <tr>
            <td><strong>${escapeHtml(row.date)}</strong></td>
            <td>${escapeHtml(row.energyText)}</td>
            <td>${escapeHtml(row.waterText)}</td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="3" style="text-align:center;color:#64748B;">Sin registros detallados en el período.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Informe Nutricional - ${escapeHtml(report.patientName)}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      background: #FFFFFF;
      line-height: 1.5;
      padding: 24px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #10B981;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .brand {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #047857;
      margin-bottom: 4px;
    }
    h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      color: #0F172A;
    }
    .meta {
      text-align: right;
      font-size: 12px;
      color: #475569;
    }
    .patient-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 18px;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }
    .patient-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748B;
      margin-bottom: 2px;
    }
    .patient-val {
      font-size: 14px;
      font-weight: 700;
      color: #0F172A;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 20px;
    }
    .kpi {
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 12px;
      text-align: center;
      background: #FFFFFF;
    }
    .kpi-num {
      font-size: 19px;
      font-weight: 800;
      color: #0F172A;
    }
    .kpi-num.cal { color: #047857; }
    .kpi-num.prot { color: #3B82F6; }
    .kpi-num.carb { color: #F59E0B; }
    .kpi-num.fat { color: #EC4899; }
    .kpi-num.water { color: #0EA5E9; }
    .kpi-lbl {
      font-size: 11px;
      color: #64748B;
      margin-top: 2px;
    }
    h2 {
      font-size: 15px;
      font-weight: 800;
      margin: 0 0 10px 0;
      color: #0F172A;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      font-size: 13px;
    }
    th, td {
      padding: 9px 10px;
      border-bottom: 1px solid #E2E8F0;
      text-align: left;
    }
    th {
      background: #F1F5F9;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #475569;
    }
    .footnote {
      font-size: 11px;
      color: #64748B;
      border-top: 1px solid #E2E8F0;
      padding-top: 12px;
      margin-top: 16px;
    }
    .no-print {
      margin-top: 16px;
      display: flex;
      gap: 10px;
    }
    .print-btn {
      background: #10B981;
      color: #FFFFFF;
      border: none;
      border-radius: 10px;
      padding: 10px 18px;
      font-weight: 700;
      cursor: pointer;
      font-size: 13px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Nutrición IA Chile · Reporte Clínico</div>
      <h1>Informe de Seguimiento Nutricional</h1>
    </div>
    <div class="meta">
      <div><strong>Período:</strong> ${escapeHtml(report.startDate)} al ${escapeHtml(report.endDate)}</div>
      <div><strong>Emitido:</strong> ${escapeHtml(generatedAt)}</div>
    </div>
  </div>

  <div class="patient-card">
    <div>
      <div class="patient-label">Paciente</div>
      <div class="patient-val">${escapeHtml(report.patientName)}</div>
    </div>
    <div>
      <div class="patient-label">Objetivo</div>
      <div class="patient-val">${escapeHtml(objectiveLabel)}</div>
    </div>
    <div>
      <div class="patient-label">Peso / Estatura</div>
      <div class="patient-val">${report.weightKg ? `${escapeHtml(report.weightKg)} kg` : "—"} · ${report.heightCm ? `${escapeHtml(report.heightCm)} cm` : "—"}</div>
    </div>
    <div>
      <div class="patient-label">Días con datos</div>
      <div class="patient-val">${escapeHtml(report.totalDaysLogged)} días</div>
    </div>
  </div>

  <h2>Promedios diarios (sobre días registrados)</h2>
  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-num cal">${escapeHtml(report.avgCalories)}</div>
      <div class="kpi-lbl">kcal / día</div>
    </div>
    <div class="kpi">
      <div class="kpi-num prot">${escapeHtml(report.avgProtein)} g</div>
      <div class="kpi-lbl">Proteína</div>
    </div>
    <div class="kpi">
      <div class="kpi-num carb">${escapeHtml(report.avgCarbs)} g</div>
      <div class="kpi-lbl">Carbohidratos</div>
    </div>
    <div class="kpi">
      <div class="kpi-num fat">${escapeHtml(report.avgFat)} g</div>
      <div class="kpi-lbl">Grasas</div>
    </div>
    <div class="kpi">
      <div class="kpi-num water">${escapeHtml(report.avgWaterMl)} ml</div>
      <div class="kpi-lbl">Agua / día</div>
    </div>
  </div>

  <h2>Detalle diario</h2>
  <table>
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Energía registrada</th>
        <th>Hidratación</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="footnote">
    Los promedios se calculan exclusivamente sobre los días con registros en la app; los días sin datos no equivalen a consumo cero. Documento informativo de apoyo para consulta nutricional (Chile · Ley 19.628).
  </div>

  <div class="no-print">
    <button class="print-btn" onclick="window.print()">Imprimir / Guardar como PDF</button>
  </div>
</body>
</html>`;
}
