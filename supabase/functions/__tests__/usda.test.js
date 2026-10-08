const { createUsdaEnricher, readUsdaMacros } = require('../_shared/usda.ts');
const { findUsdaReference, USDA_REFERENCES } = require('../_shared/usdaCatalog.ts');
const item = (food = 'Arroz blanco cocido', extra = {}) => ({ food, grams: 150, unit: 'g', calories: 999, protein: 20, carbs: 30, fat: 10, confidence: 0.9, ...extra });
const food = (fdcId = 168878) => ({
  fdcId, description: USDA_REFERENCES.find(ref => ref.fdcId === fdcId).description, dataType: 'SR Legacy',
  foodNutrients: [
    { nutrient: { id: 1005, unitName: 'g' }, amount: 28.17 },
    { nutrient: { id: 1008, unitName: 'kcal' }, amount: 130 },
    { nutrient: { id: 1003, unitName: 'g' }, amount: 2.69 },
    { nutrient: { id: 1004, unitName: 'g' }, amount: 0.28 },
  ],
});
const response = foods => new Response(JSON.stringify(foods));
const setup = (fetcher = jest.fn().mockImplementation(async () => response([food()])), now) => ({
  fetcher, enrich: createUsdaEnricher({ apiKey: () => 'private-usda-key', fetcher, now }),
});

test('uses nutrient IDs and units; missing or invalid macros never become zero', () => {
  expect(readUsdaMacros(food())).toEqual({ calories: 130, protein: 2.69, carbs: 28.17, fat: 0.28 });
  const missing = food(); missing.foodNutrients.pop();
  expect(readUsdaMacros(missing)).toBeNull();
  for (const amount of [-1, NaN, Infinity, '130', null, 1001]) {
    const invalid = food(); invalid.foodNutrients[1].amount = amount;
    expect(readUsdaMacros(invalid)).toBeNull();
  }
  const kj = food(); kj.foodNutrients[1].nutrient.unitName = 'kJ';
  expect(readUsdaMacros(kj)).toBeNull();
  const zero = food(); zero.foodNutrients[3].amount = 0;
  expect(readUsdaMacros(zero).fat).toBe(0);
});

test('scales a verified 100 g reference while retaining the name, portion and confidence', async () => {
  const { enrich, fetcher } = setup();
  const [result] = await enrich([item()]);
  expect(result).toMatchObject({ food: 'Arroz blanco cocido', grams: 150, confidence: 0.9, calories: 195, protein: 4, carbs: 42.3, fat: 0.4,
    nutrition_reference: { source: 'USDA FoodData Central', fdc_id: 168878 } });
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ fdcIds: [168878], format: 'full' });
  expect(JSON.stringify(result)).not.toContain('private-usda-key');
});

test('separates raw and cooked foods and rejects preparations outside the reviewed catalog', () => {
  expect(findUsdaReference('Arroz blanco crudo').fdcId).toBe(168877);
  expect(findUsdaReference(' ARROZ  BLANCO COCIDO ').fdcId).toBe(168878);
  expect(findUsdaReference('Plátano').fdcId).toBe(173944);
  for (const name of ['Arroz', 'Arroz integral cocido', 'Arroz blanco graneado', 'Arroz blanco cocido con mantequilla', 'Pollo', 'Pechuga de pollo frita', 'Pechuga de pollo al horno con piel', 'Palta con mayonesa', 'Lentejas con chorizo', 'Pastel de choclo', 'Papas fritas', 'Tomate cherry']) {
    expect(findUsdaReference(name)).toBeUndefined();
  }
});

test('leaves local dishes, liquids, unknown amounts and uncertain identification unchanged', async () => {
  const { enrich, fetcher } = setup();
  const items = [item('Hallulla'), item('Arroz blanco cocido', { unit: 'ml' }), item('Palta', { confidence: 0.7 }), item('Plátano', { grams: 0 })];
  expect(await enrich(items)).toEqual(items);
  expect(fetcher).not.toHaveBeenCalled();
});

test('does not request USDA when a backend key has not been configured', async () => {
  const fetcher = jest.fn();
  const items = [item()];
  expect(await createUsdaEnricher({ apiKey: () => undefined, fetcher })(items)).toBe(items);
  expect(fetcher).not.toHaveBeenCalled();
});

test('batches different foods, deduplicates identical references and caches validated results', async () => {
  const fetcher = jest.fn().mockImplementation(async () => response([food(), food(173424)]));
  const { enrich } = setup(fetcher);
  const result = await enrich([item(), item('Huevo duro', { grams: 50 }), item('Arroz cocido', { grams: 100 })]);
  expect(JSON.parse(fetcher.mock.calls[0][1].body).fdcIds).toEqual([168878, 173424]);
  expect(result[2].calories).toBe(130);
  expect(result[1].nutrition_reference.fdc_id).toBe(173424);
  await enrich([item()]);
  expect(fetcher).toHaveBeenCalledTimes(1);
});

test('concurrent requests share the in-flight lookup', async () => {
  let complete;
  const fetcher = jest.fn().mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  const { enrich } = setup(fetcher);
  const a = enrich([item()]); const b = enrich([item()]);
  complete(response([food()]));
  expect((await a)[0].calories).toBe(195);
  expect((await b)[0].calories).toBe(195);
  expect(fetcher).toHaveBeenCalledTimes(1);
});

test.each([401, 429, 500])('HTTP %i falls back to AI estimates without exposing the key', async status => {
  const fetcher = jest.fn().mockImplementation(async () => new Response('secret upstream private-usda-key', { status }));
  const { enrich } = setup(fetcher);
  const items = [item()];
  expect(await enrich(items)).toEqual(items);
  expect(await enrich([item('Huevo duro')])).toEqual([item('Huevo duro')]);
  expect(fetcher).toHaveBeenCalledTimes(1);
});

test('network timeouts fall back to AI and never log credential-bearing errors', async () => {
  const fetcher = jest.fn().mockRejectedValue(new Error('fetch failed https://USDA?api_key=private-usda-key'));
  const warning = jest.spyOn(console, 'warn'); const error = jest.spyOn(console, 'error');
  try {
    const { enrich } = setup(fetcher);
    expect(await enrich([item()])).toEqual([item()]);
    expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(warning).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled();
  } finally { warning.mockRestore(); error.mockRestore(); }
});

test.each([
  () => ({ message: 'not foods' }),
  () => [{ ...food(), description: 'Different rice' }],
  () => [{ ...food(), dataType: 'Branded' }],
  () => [{ ...food(), foodNutrients: [] }],
  () => [null, 5, {}],
])('invalid or mismatched reference keeps the existing AI data', async invalid => {
  const { enrich } = setup(jest.fn().mockImplementation(async () => response(invalid())));
  expect(await enrich([item()])).toEqual([item()]);
});

test('refreshes expired references and never reuses stale data after a failed refresh', async () => {
  let clock = 1000;
  const fetcher = jest.fn().mockImplementationOnce(async () => response([food()]))
    .mockImplementationOnce(async () => new Response('', { status: 503 }));
  const { enrich } = setup(fetcher, () => clock);
  expect((await enrich([item()]))[0].calories).toBe(195);
  clock += 86400001;
  expect(await enrich([item()])).toEqual([item()]);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

test('429 cooldown lasts an hour and then permits a fresh request', async () => {
  let clock = 1000;
  const fetcher = jest.fn().mockImplementationOnce(async () => new Response('', { status: 429 }))
    .mockImplementationOnce(async () => response([food()]));
  const { enrich } = setup(fetcher, () => clock);
  await enrich([item()]); clock += 60001;
  expect(await enrich([item()])).toEqual([item()]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  clock += 3600000;
  expect((await enrich([item()]))[0].calories).toBe(195);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

test('extreme portions cannot exceed the existing response contract limits', async () => {
  const raw = food(168877); raw.foodNutrients[1].amount = 365;
  const { enrich } = setup(jest.fn().mockImplementation(async () => response([raw])));
  const items = [item('Arroz blanco crudo', { grams: 20000 })];
  expect(await enrich(items)).toEqual(items);
});
