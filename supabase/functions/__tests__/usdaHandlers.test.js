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
