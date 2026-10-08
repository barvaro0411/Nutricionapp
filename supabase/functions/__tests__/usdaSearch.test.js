global.Deno = { env: { get: () => undefined }, serve: jest.fn() };
const { createUsdaSearch, compatiblePreparation, validateSelections, gramsPerMl, asSearchFood } = require('../_shared/usdaSearch.ts');
const { readUsdaMacros } = require('../_shared/usda.ts');
const candidate = (fdcId = 2708357, description = 'Pasta, cooked') => ({ fdcId, description, dataType: 'Survey (FNDDS)' });
const detail = (fdcId = 2708357, description = 'Pasta, cooked') => ({ ...candidate(fdcId, description), foodNutrients: [
  {nutrient:{id:1008,unitName:'kcal'},amount:158}, {nutrient:{id:1003,unitName:'g'},amount:5.8},
  {nutrient:{id:1004,unitName:'g'},amount:0.9},{nutrient:{id:1005,unitName:'g'},amount:30.8},
] });
const item = {food:'Fideos cocidos',usda_lookup:{query:'pasta cooked',state:'cooked'}};

test('dynamic lookup searches three USDA datasets, deduplicates requests and caches results', async () => {
  const fetcher = jest.fn(async () => new Response(JSON.stringify({foods:[candidate()]})));
  const client = createUsdaSearch({apiKey:()=> 'server-key',fetcher});
  const [a,b] = await Promise.all([client.search('pasta cooked'),client.search('pasta cooked')]);
  expect(a).toEqual([candidate()]); expect(b).toEqual(a);
  await client.search('pasta cooked'); expect(fetcher).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetcher.mock.calls[0][1].body).dataType).toEqual(['Foundation','SR Legacy','Survey (FNDDS)']);
});
test('batches detail IDs within the upstream limit and rejects unsolicited/incomplete/branded records', async () => {
  const fetcher = jest.fn(async (_url,init) => new Response(JSON.stringify([...JSON.parse(init.body).fdcIds.map(id=>id===1 ? {...detail(id),dataType:'Branded'} : id===2 ? {...detail(id),foodNutrients:[]} : detail(id)),detail(999)])));
  const client = createUsdaSearch({apiKey:()=> 'server-key',fetcher});
  const details = await client.details(Array.from({length:24},(_,i)=>i+1));
  expect(fetcher.mock.calls.map(call=>JSON.parse(call[1].body).fdcIds.length)).toEqual([20,4]);
  expect(details.has(999)).toBe(false); expect(details.has(1)).toBe(false); expect(details.has(2)).toBe(false); expect(details.size).toBe(22);
});
test('rejects invented IDs, low confidence, duplicate selections and raw/cooked conflicts', () => {
  expect(compatiblePreparation(item,'Pasta, dry')).toBe(false);
  expect(compatiblePreparation({food:'Arroz crudo'},'Rice, cooked')).toBe(false);
  expect(compatiblePreparation(item,'Pasta, fried')).toBe(false);
  const match = (fdc_id,confidence=.9)=>({index:0,fdc_id,confidence});
  expect(validateSelections([item],[[candidate()]],{matches:[match(2708357)]}).get(0)).toEqual(candidate());
  for(const matches of [[match(123)],[match(2708357,.84)],[match(null)],[match(2708357),match(2708357)]]) expect(validateSelections([item],[[candidate()]],{matches}).size).toBe(0);
  expect(validateSelections([item],[[candidate(123,'Pasta, raw')]],{matches:[match(123)]}).size).toBe(0);
});
test('uses Foundation Atwater energy and rejects missing macros instead of filling zeros', () => {
  const food = detail(); food.foodNutrients[0].nutrient.id=2048;
  expect(readUsdaMacros(food).calories).toBe(158); food.foodNutrients.pop(); expect(readUsdaMacros(food)).toBeNull();
});
test('scales ml from a weighed USDA portion and never treats a guideline amount as density', () => {
  const milk = {...detail(1,'Milk, whole'),foodPortions:[{gramWeight:2.5,portionDescription:'Guideline amount per fl oz of beverage'},{gramWeight:244,portionDescription:'1 cup'}]};
  expect(gramsPerMl(milk)).toBeCloseTo(244/237);
  expect(asSearchFood(milk,'ml').per100.calories).toBeCloseTo(158*244/237,2);
  expect(asSearchFood(detail(),'ml')).toBeNull();
  expect(gramsPerMl({...milk,foodPortions:[{gramWeight:103,portionDescription:'100 ml'}]})).toBe(1.03);
  expect(gramsPerMl({...milk,foodPortions:[{gramWeight:244,portionDescription:'1 individual school container'}]})).toBeNull();
});
test('rate-limit cooldown, network failure and missing key do not leak credentials or retry immediately', async () => {
  let now=1000; const fetcher=jest.fn(async()=>new Response('secret server-key',{status:429}));
  const client=createUsdaSearch({apiKey:()=> 'server-key',fetcher,now:()=>now});
  expect(await client.search('pasta')).toEqual([]); now+=60001; expect(await client.search('milk')).toEqual([]);
  expect(fetcher).toHaveBeenCalledTimes(1); expect(client.available()).toBe(false);
  now+=3600000; fetcher.mockImplementation(async()=>new Response(JSON.stringify({foods:[candidate()]})));
  expect(await client.search('pasta')).toEqual([candidate()]);
  const missing=createUsdaSearch({apiKey:()=>undefined,fetcher}); expect(await missing.search('x')).toEqual([]); expect(fetcher).toHaveBeenCalledTimes(2);
});
