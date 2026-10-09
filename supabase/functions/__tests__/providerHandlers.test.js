jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const meal = { meal_type_guess: 'snack', items: [{ food: 'Manzana', grams: 100, unit: 'g', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, confidence: 0.9 }] };
const request = body => new Request('https://test/functions/v1/test', { method: 'POST', headers: { Authorization: 'Bearer user-token', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const groqReply = text => new Response(JSON.stringify({ choices: [{ message: { content: typeof text === 'string' ? text : JSON.stringify(text) } }] }));
const geminiReply = text => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: typeof text === 'string' ? text : JSON.stringify(text) }] } }] }));
let env, client, fetchMock, inserted, tableData, queries;
beforeEach(() => {
  jest.resetModules();
  env = { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'server-secret', GROQ_API_KEY: 'groq-secret', GEMINI_API_KEY: 'gemini-secret', OPENAI_API_KEY: 'unused-paid-key' };
  global.Deno = { env: { get: key => env[key] }, serve: jest.fn() };
  inserted = []; queries = [];
  tableData = {
    profiles: { full_name: 'Nombre privado', objective: 'maintain', current_weight_kg: 75, height_cm: 175 },
    goals: { calories: 2000, protein_g: 120, carbs_g: 250, fat_g: 60, user_id: owner },
    meals: [{ meal_type: 'almuerzo', total_calories: 450, total_protein: 30, total_carbs: 55, total_fat: 10, meal_items: [{ food_name: 'Arroz', grams: 150 }] }],
    coach_messages: [{ role: 'assistant', content: 'Respuesta anterior' }, { role: 'user', content: 'Consulta anterior' }],
    personal_plans: null, activity_logs: { active_calories_burned: 100, steps: 4000 }, water_logs: [{ amount_ml: 250 }],
  };
  client = {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: owner } }, error: null }) },
    rpc: jest.fn().mockResolvedValue({ data: { allowed: true }, error: null }),
    from: jest.fn(table => {
      const query = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), gte: jest.fn().mockReturnThis(), lt: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), single: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockReturnThis(),
        then(resolve, reject) { return Promise.resolve({ data: tableData[table], error: null }).then(resolve, reject); },
        insert: jest.fn(async rows => { inserted.push(...rows); return { error: null }; }),
      }; queries.push({ table, query }); return query;
    }),
    storage: { from: jest.fn().mockReturnValue({ download: jest.fn().mockResolvedValue({ data: new Blob(['synthetic-photo'], { type: 'image/jpeg' }), error: null }) }) },
  };
  require('@supabase/supabase-js').createClient.mockReturnValue(client);
  global.fetch = fetchMock = jest.fn();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test('coach keeps user context, chronological history and saved messages with Groq', async () => {
  fetchMock.mockResolvedValue(groqReply('Te faltan 90 g de proteína.'));
  const { handleRequest } = require('../nutrition-coach/index.ts');
  const response = await handleRequest(request({ message: '¿Cómo voy con mi proteína?' }));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.context).toEqual({ remainingCalories: 1650, remainingProtein: 90, consumedCalories: 450 });
  expect(body.meta.model).toBe('openai/gpt-oss-120b');
  const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(sent.messages.slice(1).map(m => [m.role, m.content])).toEqual([['user', 'Consulta anterior'], ['assistant', 'Respuesta anterior'], ['user', '¿Cómo voy con mi proteína?']]);
  const context = JSON.parse(sent.messages[0].content.split('Contexto JSON: ')[1]);
  expect(context.remaining.protein).toBe(90); expect(context.waterMl).toBe(250);
  expect(sent.messages[0].content).not.toContain('Nombre privado'); expect(context.target.user_id).toBeUndefined();
  expect(inserted.map(m => [m.role, m.content])).toEqual([['user', '¿Cómo voy con mi proteína?'], ['assistant', 'Te faltan 90 g de proteína.']]);
  expect(inserted.every(m => m.user_id === owner)).toBe(true);
  expect(queries.filter(q => q.table !== 'profiles' && q.query.select.mock.calls.length).every(q => q.query.eq.mock.calls.some(([name, id]) => name === 'user_id' && id === owner))).toBe(true);
  expect(client.rpc).toHaveBeenCalledTimes(1);
});

test('coach falls back to Gemini without double charging user quota', async () => {
  fetchMock.mockResolvedValueOnce(new Response('private quota details', { status: 429 })).mockResolvedValueOnce(geminiReply('Respuesta de respaldo'));
  const response = await require('../nutrition-coach/index.ts').handleRequest(request({ message: 'Dame una idea de cena.' }));
  expect(response.status).toBe(200); expect((await response.json()).meta.model).toBe('gemini-3.5-flash-lite');
  expect(inserted).toHaveLength(2); expect(client.rpc).toHaveBeenCalledTimes(1);
});

test('unauthenticated coach access never reads private data or calls providers', async () => {
  client.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Invalid') });
  expect((await require('../nutrition-coach/index.ts').handleRequest(request({ message: 'Hola' }))).status).toBe(401);
  expect(client.from).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
});

test('coach quota rejection leaves history unchanged', async () => {
  client.rpc.mockResolvedValue({ data: { allowed: false }, error: null });
  expect((await require('../nutrition-coach/index.ts').handleRequest(request({ message: 'Hola' }))).status).toBe(429);
  expect(inserted).toHaveLength(0); expect(fetchMock).not.toHaveBeenCalled();
});

test('provider failures do not save incomplete conversations or leak credentials', async () => {
  fetchMock.mockImplementation(async () => new Response('groq-secret gemini-secret private conversation', { status: 429 }));
  const response = await require('../nutrition-coach/index.ts').handleRequest(request({ message: 'Hola' }));
  expect(response.status).toBe(429); expect(await response.text()).not.toMatch(/groq-secret|gemini-secret|private conversation/);
  expect(inserted).toHaveLength(0);
});

test('text prefers Groq and preserves the structured meal contract', async () => {
  fetchMock.mockResolvedValue(groqReply(meal));
  const response = await require('../parse-meal-text/index.ts').handleRequest(request({ text: 'Una manzana de 100 gramos' }));
  expect(response.status).toBe(200);
  const body = await response.json(); expect(body.data.totals.calories).toBe(52); expect(body.meta.provider_used).toBe('openai/gpt-oss-20b');
  expect(fetchMock).toHaveBeenCalledTimes(1); expect(client.rpc).toHaveBeenCalledTimes(1);
});

test('audio combines Whisper transcription with Groq structured extraction', async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ text: 'Una manzana de 100 gramos' }))).mockResolvedValueOnce(groqReply(meal));
  const response = await require('../parse-meal-text/index.ts').handleRequest(request({ audio_base64: btoa('synthetic-audio'), audio_mime_type: 'audio/wav' }));
  expect(response.status).toBe(200);
  const body = await response.json(); expect(body.meta.transcription_provider).toBe('whisper-large-v3-turbo'); expect(body.meta.provider_used).toBe('openai/gpt-oss-20b');
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).messages[1].content).toContain('Una manzana de 100 gramos');
  expect(client.rpc).toHaveBeenCalledTimes(1);
});

test('failed transcription is handled by Gemini with the original audio', async () => {
  fetchMock.mockResolvedValueOnce(new Response('quota', { status: 429 })).mockResolvedValueOnce(geminiReply(meal));
  const response = await require('../parse-meal-text/index.ts').handleRequest(request({ audio_base64: btoa('synthetic-audio'), audio_mime_type: 'audio/mp4' }));
  expect(response.status).toBe(200); expect((await response.json()).meta.provider_used).toBe('gemini-3.5-flash-lite');
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).contents[0].parts[1].inline_data.data).toBe(btoa('synthetic-audio'));
  expect(client.rpc).toHaveBeenCalledTimes(1);
});

test('images fall back to Groq after a Gemini quota error, never to paid OpenAI', async () => {
  fetchMock.mockResolvedValueOnce(new Response('quota', { status: 429 })).mockResolvedValueOnce(groqReply(meal));
  const response = await require('../analyze-meal/index.ts').handleRequest(request({ image_path: owner + '/photo.jpg', provider: 'openai' }));
  expect(response.status).toBe(200); expect((await response.json()).meta.provider_used).toBe('qwen/qwen3.8-27b');
  const body = JSON.parse(fetchMock.mock.calls[1][1].body);
  expect(body.messages[1].content[1].image_url.url).toBe('data:image/jpeg;base64,' + btoa('synthetic-photo'));
  expect(fetchMock.mock.calls.some(([url]) => url.includes('api.openai.com'))).toBe(false);
  expect(client.rpc).toHaveBeenCalledTimes(1);
});

test('all image providers exhausted returns a safe error without paid requests', async () => {
  fetchMock.mockImplementation(async () => new Response('private details', { status: 429 }));
  const response = await require('../analyze-meal/index.ts').handleRequest(request({ image_path: owner + '/photo.jpg' }));
  expect(response.status).toBe(429); expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls.some(([url]) => url.includes('api.openai.com'))).toBe(false);
});

test('all Gemini keys are deduplicated and retain the existing primary order', async () => {
  env.GEMINI_API_KEY_FALLBACK = 'old-backup,gemini-secret'; env.GEMINI_API_KEY_BACKUP = 'other-backup'; env.GEMINI_API_KEY_ADDITIONAL = 'new-google-key';
  expect(await require('../_shared/gemini.ts').getGeminiKey(client)).toBe('gemini-secret,old-backup,other-backup,new-google-key');
});
