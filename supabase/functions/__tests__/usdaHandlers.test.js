jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let fetchMock, client, textHandler, photoHandler;
const request = body => new Request('https://test/functions/v1/test', { method: 'POST', headers: { Authorization: 'Bearer user-token', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const aiOutput = { meal_type_guess: 'almuerzo', items: [
  { food: 'Arroz blanco cocido', grams: 150, unit: 'g', calories: 999, protein: 20, carbs: 30, fat: 10, confidence: 0.9 },
  { food: 'Hallulla', grams: 100, unit: 'g', calories: 310, protein: 8, carbs: 54, fat: 7, confidence: 0.9 },
] };
beforeEach(() => {
  jest.resetModules();
  const env = { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'server-secret', GEMINI_API_KEY: 'gemini-secret', USDA_API_KEY: 'usda-secret' };
  global.Deno = { env: { get: key => env[key] }, serve: jest.fn() };
  client = { auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: owner } }, error: null }) },
    rpc: jest.fn().mockResolvedValue({ data: { allowed: true }, error: null }),
    storage: { from: jest.fn().mockReturnValue({ download: jest.fn().mockResolvedValue({ data: new Blob(['photo'], { type: 'image/jpeg' }), error: null }) }) } };
  require('@supabase/supabase-js').createClient.mockReturnValue(client);
  global.fetch = fetchMock = jest.fn().mockImplementation(async url => {
    if (String(url).includes('api.nal.usda.gov')) return new Response(JSON.stringify([{ fdcId: 168878, description: 'Rice, white, long-grain, regular, enriched, cooked', dataType: 'SR Legacy', foodNutrients: [
      { nutrient: { id: 1008, unitName: 'kcal' }, amount: 130 }, { nutrient: { id: 1003, unitName: 'g' }, amount: 2.69 },
      { nutrient: { id: 1005, unitName: 'g' }, amount: 28.17 }, { nutrient: { id: 1004, unitName: 'g' }, amount: 0.28 },
    ] }]));
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(aiOutput) }] } }] }));
  });
  textHandler = require('../parse-meal-text/index.ts').handleRequest;
  photoHandler = require('../analyze-meal/index.ts').handleRequest;
});

test.each(['text', 'audio', 'photo'])('%s flow combines Gemini identification with USDA macros and recalculates totals', async flow => {
  const res = flow === 'photo' ? await photoHandler(request({ image_path: owner + '/meal.jpg' }))
    : await textHandler(request(flow === 'audio' ? { audio_base64: 'YXVkaW8=', audio_mime_type: 'audio/m4a' } : { text: '150 g de arroz blanco cocido y una hallulla' }));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.data.items[0]).toMatchObject({ calories: 195, grams: 150, confidence: 0.9, nutrition_reference: { fdc_id: 168878 } });
  expect(body.data.items[1]).toEqual(aiOutput.items[1]);
  expect(body.data.totals).toEqual({ calories: 505, protein: 12, carbs: 96.3, fat: 7.4 });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(client.rpc).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(body)).not.toMatch(/usda-secret|gemini-secret/);
});

test('nutrition labels preserve their actual product values even with a USDA key configured', async () => {
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ ...aiOutput, items: [aiOutput.items[0]] }) }] } }] })));
  const res = await photoHandler(request({ image_path: owner + '/label.jpg', mode: 'nutrition_label' }));
  expect(res.status).toBe(200);
  expect((await res.json()).data.items[0].calories).toBe(999);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('USDA failure still produces a successful Gemini analysis', async () => {
  const original = fetchMock.getMockImplementation();
  fetchMock.mockImplementation(async (url, init) => String(url).includes('api.nal.usda.gov') ? new Response('private usda-secret error', { status: 429 }) : original(url, init));
  const res = await textHandler(request({ text: 'Arroz blanco cocido' }));
  expect(res.status).toBe(200);
  expect((await res.json()).data.items[0]).toEqual(aiOutput.items[0]);
});

test('unauthenticated users never reach either upstream provider', async () => {
  client.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid') });
  expect((await textHandler(request({ text: 'Arroz cocido' }))).status).toBe(401);
  expect(fetchMock).not.toHaveBeenCalled();
});

test.each(['text','audio','photo'])('%s looks up pasta and meat sauce dynamically and keeps them separate', async flow => {
  const candidates = [
    {fdcId:2708357,description:'Pasta, cooked',dataType:'Survey (FNDDS)'},
    {fdcId:2706470,description:'Spaghetti sauce with meat',dataType:'Survey (FNDDS)'},
  ];
  const items = [
    { ...aiOutput.items[0],food:'Fideos cocidos',grams:200,usda_lookup:{query:'pasta cooked',state:'cooked'} },
    { ...aiOutput.items[0],food:'Salsa de tomate con carne molida',grams:100,confidence:.7,usda_lookup:{query:'spaghetti sauce with meat',state:'cooked'} },
  ];
  let geminiCalls=0;
  fetchMock.mockImplementation(async (url,init) => {
    if(String(url).includes('foods/search')) return new Response(JSON.stringify({foods:JSON.parse(init.body).query.includes('pasta') ? [candidates[0]] : [candidates[1]]}));
    if(String(url).includes('api.nal.usda.gov')) return new Response(JSON.stringify(candidates.map((candidate,index)=>({...candidate,foodNutrients:[
      {nutrient:{id:1008,unitName:'kcal'},amount:index===0?158:100},{nutrient:{id:1003,unitName:'g'},amount:5},
      {nutrient:{id:1004,unitName:'g'},amount:2},{nutrient:{id:1005,unitName:'g'},amount:20},
    ]}))));
    const payload=geminiCalls++===0 ? {meal_type_guess:'almuerzo',items} : {matches:[{index:0,fdc_id:2708357,confidence:.99},{index:1,fdc_id:2706470,confidence:.9}]};
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(payload)}]}}]}));
  });
  const res=flow==='photo' ? await photoHandler(request({image_path:owner+'/meal.jpg'})) : await textHandler(request(flow==='audio'?{audio_base64:'YXVkaW8=',audio_mime_type:'audio/m4a'}:{text:'Fideos y salsa con carne'}));
  expect(res.status).toBe(200); const body=await res.json();
  expect(body.data.items.map(item=>item.nutrition_reference.fdc_id)).toEqual([2708357,2706470]);
  expect(body.data.totals.calories).toBe(416); expect(body.data.items[1].confidence).toBe(.7);
  expect(client.rpc).toHaveBeenCalledTimes(1);
});

test('manual USDA search requires a valid session, enforces quota and returns verified details', async () => {
  const searchHandler=require('../search-foods/index.ts').handleRequest;
  client.auth.getUser.mockResolvedValueOnce({data:{user:null},error:null});
  expect((await searchHandler(request({query:'Fideos cocidos'}))).status).toBe(401); expect(fetchMock).not.toHaveBeenCalled();
  expect((await searchHandler(request({query:'x'}))).status).toBe(400); expect(fetchMock).not.toHaveBeenCalled();
  client.rpc.mockResolvedValueOnce({data:{allowed:false},error:null});
  expect((await searchHandler(request({query:'Fideos cocidos'}))).status).toBe(429); expect(fetchMock).not.toHaveBeenCalled();
  let geminiCalls=0;
  fetchMock.mockImplementation(async (url) => {
    if(String(url).includes('foods/search')) return new Response(JSON.stringify({foods:[{fdcId:2708357,description:'Pasta, cooked',dataType:'Survey (FNDDS)'}]}));
    if(String(url).includes('api.nal.usda.gov')) return new Response(JSON.stringify([{fdcId:2708357,description:'Pasta, cooked',dataType:'Survey (FNDDS)',foodNutrients:[
      {nutrient:{id:1008,unitName:'kcal'},amount:158},{nutrient:{id:1003,unitName:'g'},amount:5},{nutrient:{id:1004,unitName:'g'},amount:2},{nutrient:{id:1005,unitName:'g'},amount:30},
    ]}]));
    const output=geminiCalls++===0?{query:'pasta cooked'}:{foods:[{fdc_id:2708357,label:'Fideos cocidos'},{fdc_id:999,label:'Inventado'}]};
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(output)}]}}]}));
  });
  const res=await searchHandler(request({query:'Fideos cocidos'})); expect(res.status).toBe(200);
  const body=await res.json(); expect(body.data.foods).toHaveLength(1);
  expect(body.data.foods[0]).toMatchObject({label:'Fideos cocidos',per100:{calories:158},nutrition_reference:{fdc_id:2708357,basis:'100g'}});
  expect(JSON.stringify(body)).not.toMatch(/usda-secret|gemini-secret/);
});

test('selection bounds its candidates, retains alternative results and verifies the selected detail', async () => {
  const oats = { ...aiOutput.items[0], food: 'Avena cocida', usda_lookup: { query: 'oatmeal cooked', alternative_query: 'oats cooked', state: 'cooked' } };
  let calls = 0;
  fetchMock.mockImplementation(async (url, init) => {
    const body = JSON.parse(init.body);
    if (String(url).includes('foods/search')) return new Response(JSON.stringify({ foods: Array.from({ length: 12 }, (_, i) => ({ fdcId: (body.query === 'oatmeal cooked' ? 100 : 200) + i, description: 'Oats, cooked, variant ' + i, dataType: 'Survey (FNDDS)' })) }));
    if (String(url).includes('api.nal.usda.gov')) return new Response(JSON.stringify([{ fdcId: 200, description: 'Oats, cooked, variant 0', dataType: 'Survey (FNDDS)', foodNutrients: [
      { nutrient: { id: 1008, unitName: 'kcal' }, amount: 70 }, { nutrient: { id: 1003, unitName: 'g' }, amount: 2 },
      { nutrient: { id: 1005, unitName: 'g' }, amount: 12 }, { nutrient: { id: 1004, unitName: 'g' }, amount: 1 },
    ] }]));
    if (calls++ === 0) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ meal_type_guess: 'desayuno', items: [oats] }) }] } }] }));
    const selection = JSON.parse(body.contents[0].parts[0].text.split('\n').at(-1));
    expect(selection[0].candidates.map(c => c.fdcId)).toEqual([100, 200, 101, 201, 102, 202]);
    expect(selection[0].candidates.every(c => c.dataType === undefined)).toBe(true);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ matches: [{ index: 0, fdc_id: 200, confidence: .9 }] }) }] } }] }));
  });
  const res = await textHandler(request({ text: 'Avena cocida' }));
  expect(res.status).toBe(200);
  expect((await res.json()).data.items[0]).toMatchObject({ calories: 105, nutrition_reference: { fdc_id: 200 } });
});

test('a selection quota failure preserves verified references and the remaining AI estimates', async () => {
  const pasta = { ...aiOutput.items[1], food: 'Fideos cocidos', usda_lookup: { query: 'pasta cooked', state: 'cooked' } };
  const original = fetchMock.getMockImplementation(); let geminiCalls = 0;
  fetchMock.mockImplementation(async (url, init) => {
    if (String(url).includes('foods/search')) return new Response(JSON.stringify({ foods: [{ fdcId: 2708357, description: 'Pasta, cooked', dataType: 'Survey (FNDDS)' }] }));
    if (String(url).includes('api.nal.usda.gov')) return original(url, init);
    if (geminiCalls++ > 0) return new Response('quota', { status: 429 });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ ...aiOutput, items: [aiOutput.items[0], pasta] }) }] } }] }));
  });
  const res = await textHandler(request({ text: 'Arroz y fideos cocidos' }));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.data.items[0]).toMatchObject({ calories: 195, nutrition_reference: { fdc_id: 168878 } });
  expect(body.data.items[1]).toEqual(pasta);
  expect(body.data.totals.calories).toBe(505);
});

test('manual meat sauce search recovers from a literal translation and excludes complete dishes', async () => {
  const searchHandler = require('../search-foods/index.ts').handleRequest;
  const sauce = { fdcId: 2706470, description: 'Spaghetti sauce with meat', dataType: 'Survey (FNDDS)' };
  const dish = { fdcId: 2706469, description: 'Meat with tomato-based sauce', dataType: 'Survey (FNDDS)' };
  let geminiCalls = 0;
  fetchMock.mockImplementation(async (url, init) => {
    const body = JSON.parse(init.body);
    if (String(url).includes('foods/search')) return new Response(JSON.stringify({ foods: body.query === 'spaghetti sauce with meat' ? [dish, sauce] : [dish] }));
    if (String(url).includes('api.nal.usda.gov')) return new Response(JSON.stringify([{ ...sauce, foodNutrients: [
      { nutrient: { id: 1008, unitName: 'kcal' }, amount: 90 }, { nutrient: { id: 1003, unitName: 'g' }, amount: 5 },
      { nutrient: { id: 1005, unitName: 'g' }, amount: 7 }, { nutrient: { id: 1004, unitName: 'g' }, amount: 4 },
    ] }]));
    const payload = geminiCalls++ === 0 ? { query: 'tomato sauce with ground meat' } : { foods: [{ fdc_id: 2706470, label: 'Salsa de tomate con carne' }] };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }));
  });
  const response = await searchHandler(request({ query: 'salsa de tomate con carne molida' }));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.data.query).toBe('spaghetti sauce with meat');
  expect(body.data.foods.map(food => food.fdcId)).toEqual([2706470]);
});
