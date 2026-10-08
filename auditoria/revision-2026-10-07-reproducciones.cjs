// Ejecuta código real con servicios simulados; no escribe en Supabase.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { randomUUID } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const mocks = new Map([['expo-crypto', { randomUUID }]]);
const cache = new Map();
function compile(source) {
  return ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
}
function load(relative) {
  let file = path.resolve(root, relative);
  if (!path.extname(file)) file += '.ts';
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const localRequire = name => {
    if (mocks.has(name)) return mocks.get(name);
    if (name.startsWith('@/')) return load('src/' + name.slice(2));
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name));
    return require(name);
  };
  vm.runInNewContext(compile(fs.readFileSync(file, 'utf8')), { module, exports: module.exports, require: localRequire, console, process, Date, Intl, URL, URLSearchParams, AbortSignal, fetch: (...args) => global.fetch(...args) }, { filename: file });
  return module.exports;
}
// Extract the actual handler expression, preserving its body without reimplementing it.
function handler(relative, name, context) {
  const file = path.resolve(root, relative);
  const tree = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name) expression = node.initializer.getText(tree);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.ok(expression, name + ' exists');
  return vm.runInNewContext(compile('const extracted = ' + expression + '; extracted;'), { ...context, console, Math, String }, { filename: file });
}
async function main() {
  const store = load('src/stores/useMealReviewStore.ts').useMealReviewStore;
  const hookStore = Object.assign(() => store.getState(), { getState: store.getState });
  mocks.set('@/stores/useMealReviewStore', { useMealReviewStore: hookStore });
  mocks.set('react', { useState: initial => [initial, () => {}] });
  mocks.set('@/stores/useAuthStore', { useAuthStore: () => ({ user: { id: 'audit-user' } }) });
  const dates = load('src/utils/dates.ts');

  const selectedDate = new Date('2026-10-05T12:00:00Z');
  handler('app/(tabs)/index.tsx', 'beginMeal', { useMealReviewStore: hookStore, loggedAtForDate: dates.loggedAtForDate, selectedDate })();
  const beforeRecord = store.getState().loggedAt;
  handler('app/(tabs)/record.tsx', 'beginMeal', { useMealReviewStore: hookStore, selectedDate, selectedMealType: 'almuerzo', loggedAtForDate: dates.loggedAtForDate })();
  assert.ok(beforeRecord);
  assert.equal(store.getState().loggedAt, beforeRecord);
  console.log(JSON.stringify({ fixed: 'selected_date_preserved', beforeRecord, afterRecord: store.getState().loggedAt }));

  const aiItem = { food: 'Red Bull', grams: 250, unit: 'ml', calories: 110, protein: 0, carbs: 27.5, fat: 0, confidence: 0.9 };
  mocks.set('@/utils/imageCompressor', { compressMealImage: async () => ({ uri: 'memory://image' }) });
  mocks.set('@/services/storageService', { uploadMealPhoto: async () => ({ path: 'audit-user/image.jpg' }), removeMealPhoto: async () => undefined });
  mocks.set('@/services/supabase', { supabase: { functions: { invoke: async () => ({ data: { success: true, data: { items: [aiItem], meal_type_guess: 'snack' } }, error: null }) } } });
  const analysis = load('src/hooks/useMealAnalysis.ts').useMealAnalysis();
  store.getState().initializeReview({ imagePath: null, localImageUri: null, mealType: 'almuerzo', items: [{ food: 'Arroz', grams: 100, unit: 'g', calories: 130, protein: 3, carbs: 28, fat: 0.3 }] });
  const previousFood = store.getState().items[0].food;
  const imagePicker = { launchCameraAsync: async () => ({ canceled: false, assets: [{ uri: 'memory://image' }] }) };
  let chosenProduct;
  const photoContext = {
    ImagePicker: imagePicker,
    BrowserMultiFormatReader: class { async decodeFromImageUrl() { throw new Error('no barcode'); } },
    DecodeHintType: { POSSIBLE_FORMATS: 0 }, BarcodeFormat: {},
    analyzeProductPhoto: analysis.analyzeProductPhoto, isLiquidFood: () => true,
    nutritionPer100: load('src/utils/productNutrition.ts').nutritionPer100,
    setLoading() {}, setProduct(value) { chosenProduct = value; },
    setPortionUnit() {}, setPortionGrams() {}, setBarcodeInput() {}, setActiveTab() {}, showAlert() {},
  };
  await handler('app/meal/barcode.tsx', 'handleTakePhotoOfBarcode', photoContext)();
  assert.equal(store.getState().items.length, 1);
  assert.equal(store.getState().items[0].food, 'Arroz');
  assert.equal(chosenProduct.caloriesPer100g, 44);
  const { parseQuantityInput } = load('src/utils/liquidUnits.ts');
  handler('app/meal/barcode.tsx', 'handleAddProductToMeal', {
    product: chosenProduct, portionGrams: '250', portionUnit: 'ml', parseQuantityInput,
    addItem: store.getState().addItem, router: { push() {} }, showAlert() {},
  })();
  assert.equal(store.getState().items.length, 2);
  assert.equal(store.getState().items[1].calories, 110);
  console.log(JSON.stringify({ fixed: 'barcode_ai_preserves_draft_and_calories', previousFood, resultFoods: store.getState().items.map(i => i.food), expectedDrinkCalories: 110, addedDrinkCalories: store.getState().items[1].calories, totalCalories: store.getState().getTotals().calories }));

  let cached = null;
  const fakeDb = { from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: cached, error: null }) }) }),
    insert: async data => { cached = { ...data, created_by: 'audit-user' }; return { error: null }; },
  }) };
  mocks.set('@/services/supabase', { supabase: fakeDb });
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ status: 1, product: { product_name: 'Gatorade', quantity: '1 L', nutriments: { 'energy-kcal_100g': 24, proteins_100g: 0, carbohydrates_100g: 6, fat_100g: 0 } } }) });
  try {
    const { lookupBarcode } = load('src/services/barcodeService.ts');
    const first = await lookupBarcode('7800000000001');
    const second = await lookupBarcode('7800000000001');
    assert.equal(first.servingSizeG, 1000);
    assert.equal(second.servingSizeG, 1000);
    assert.equal(second.unit, first.unit);
    console.log(JSON.stringify({ fixed: 'barcode_cache_preserves_portion', firstPortion: first.servingSizeG, secondPortion: second.servingSizeG, firstCalories: first.caloriesPer100g * first.servingSizeG / 100, secondCalories: second.caloriesPer100g * second.servingSizeG / 100 }));
  } finally { global.fetch = originalFetch; }

  let source = fs.readFileSync(path.join(root, 'src/components/meal/BarcodeScannerView.native.tsx'), 'utf8');
  assert.match(source, /CameraView/);
  assert.match(source, /useCameraPermissions/);
  assert.match(source, /onBarcodeScanned/);
  console.log(JSON.stringify({ fixed: 'native_barcode_scanner_implemented', verifiedBy: 'source checks; device verification pending', platforms: ['ios', 'android'] }));
  source = fs.readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');
  assert.match(source, /previousUser = useRef<string \| null \| undefined>\(undefined\)/);
  assert.match(source, /void syncAllScheduledReminders\(userId\)/);
  console.log(JSON.stringify({ fixed: 'reminders_restored_on_start', verifiedBy: 'root integration source check; service behavior covered by Jest' }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
