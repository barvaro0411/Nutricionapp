// Reproducciones de auditoría: ejecutan el código existente con servicios simulados.
// No realizan solicitudes de red ni modifican datos de Supabase.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function loadSource(relative, globals = {}, overrides = {}) {
  const file = path.resolve(root, relative);
  const module = { exports: {} };
  const source = fs.readFileSync(file, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: file,
  }).outputText;
  const context = vm.createContext({
    module, exports: module.exports, Request, Response, Blob, Uint8Array,
    btoa, setTimeout, clearTimeout, console: { log() {}, warn() {}, error() {} },
    ...globals,
    require(specifier) {
      if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
      if (specifier === 'zod' || specifier === 'npm:zod@3.24.1') return require('zod');
      let imported;
      if (specifier.startsWith('.')) imported = path.resolve(path.dirname(file), specifier);
      else if (specifier.startsWith('@/')) imported = path.join(root, 'src', specifier.slice(2));
      else throw new Error(`Dependencia no simulada: ${specifier}`);
      if (!path.extname(imported)) imported += '.ts';
      return loadSource(path.relative(root, imported), globals, overrides);
    },
  });
  vm.runInContext(compiled, context, { filename: file });
  return module.exports;
}

function queryResult(data, error = null) {
  const value = { data, error };
  const chain = {};
  for (const method of ['select', 'eq', 'gte', 'lte', 'order', 'limit', 'single', 'maybeSingle']) {
    chain[method] = () => chain;
  }
  chain.then = (resolve, reject) => Promise.resolve(value).then(resolve, reject);
  return chain;
}

async function run() {
  const evidence = [];
  for (const configuredKey of [true, false]) {
    let handler;
    let networkCalls = 0;
    loadSource('supabase/functions/parse-meal-text/index.ts', {
      Deno: { env: { get: (key) => key === 'GEMINI_API_KEY' && configuredKey ? 'mock-key' : undefined } },
      fetch: async () => { networkCalls++; throw new Error('No se permite red en esta reproducción'); },
    }, { 'https://deno.land/std@0.168.0/http/server.ts': { serve: (value) => { handler = value; } } });
    const response = await handler(new Request('https://audit.invalid/parse-meal-text', {
      method: 'POST', headers: { Authorization: 'Bearer mock', 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Comí dos huevos', client_time_iso: '2026-10-02T12:00:00.000Z' }),
    }));
    const body = await response.json();
    evidence.push({ case: configuredKey ? 'Texto con API key configurada' : 'Texto con fallback Vault',
      status: response.status, message: body.error?.message, networkCalls });
  }

  let photoHandler;
  let downloadedPath;
  let authChecks = 0;
  let quotaChecks = 0;
  class MockVisionProvider {
    name = 'mock';
    async analyzeImage() {
      return { data: { meal_type_guess: 'almuerzo', items: [
        { food: 'Alimento de prueba', grams: 100, calories: 100, protein: 5, carbs: 10, fat: 4, confidence: 0.8 },
      ] }, providerName: 'mock' };
    }
  }
  loadSource('supabase/functions/analyze-meal/index.ts', {
    Deno: { env: { get: () => 'mock-value' } },
  }, {
    'https://deno.land/std@0.168.0/http/server.ts': { serve: (value) => { photoHandler = value; } },
    'npm:@supabase/supabase-js@2.48.1': { createClient: () => ({
      auth: { getUser: async () => { authChecks++; return { data: { user: null } }; } },
      rpc: async () => { quotaChecks++; return { data: null }; },
      storage: { from: () => ({ download: async (requestedPath) => {
        downloadedPath = requestedPath; return { data: new Blob(['mock-image'], { type: 'image/jpeg' }) };
      } }) },
    }) },
    './providers/gemini.ts': { GeminiVisionProvider: MockVisionProvider },
    './providers/openai.ts': { OpenAIVisionProvider: MockVisionProvider },
  });
  const photoResponse = await photoHandler(new Request('https://audit.invalid/analyze-meal', {
    method: 'POST', headers: { Authorization: 'Bearer mock-invalid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_path: 'different-user/123.jpg' }),
  }));
  evidence.push({ case: 'Handler de foto con ruta de otro usuario (gateway no simulado)',
    status: photoResponse.status, downloadedPath, authChecks, quotaChecks });

  const fixtures = {
    profiles: { full_name: 'Paciente de prueba', current_weight_kg: 75, height_cm: 175, objective: 'maintain' },
    meals: [{ meal_type: 'cena', logged_at: '2026-10-02T01:30:00+00:00', total_calories: 100,
      total_protein: 5, total_carbs: 10, total_fat: 4, meal_items: [{ food_name: 'Pan "integral"' }] }],
    water_logs: [],
  };
  const service = loadSource('src/services/nutritionistReportService.ts', {}, {
    '@/services/supabase': { supabase: { from: (table) => queryResult(fixtures[table]) } },
  });
  const report = await service.generateNutritionistReport('mock-user');
  evidence.push({ case: 'Informe con comida a las 22:30 de Chile del día anterior y comillas',
    csv: report.csvContent.trim(), totalDaysLogged: report.totalDaysLogged });
  const empty = loadSource('src/services/nutritionistReportService.ts', {}, {
    '@/services/supabase': { supabase: { from: () => queryResult(null, { message: 'mock database failure' }) } },
  });
  const emptyReport = await empty.generateNutritionistReport('mock-user');
  evidence.push({ case: 'Informe cuando fallan las tres consultas',
    returnsReport: !!emptyReport, totalDaysLogged: emptyReport.totalDaysLogged, avgCalories: emptyReport.avgCalories });

  const nutrition = loadSource('src/utils/nutritionCalculator.ts');
  const goals = nutrition.calculateNutritionGoals({ fullName: 'Prueba', gender: 'female', age: 100,
    weightKg: 250, heightCm: 100, activityLevel: 'sedentary', objective: 'lose_weight' });
  evidence.push({ case: 'Extremo permitido por formulario: coherencia de metas', goals,
    energyFromMacros: goals.proteinG * 4 + goals.carbsG * 4 + goals.fatG * 9 });
  console.log(JSON.stringify(evidence, null, 2));
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
