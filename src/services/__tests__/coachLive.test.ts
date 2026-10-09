jest.mock('../supabase', () => ({ supabase: { functions: { invoke: jest.fn() } } }));
import { supabase } from '../supabase';
import { createCoachLive } from '../coachLive.web';
let tracks: { stop: jest.Mock }[], microphone: jest.Mock, connections: any[], contexts: any[], input: any, playback: any[];
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
beforeEach(() => {
  jest.useFakeTimers(); connections = []; contexts = []; playback = []; tracks = [{ stop: jest.fn() }];
  microphone = jest.fn().mockResolvedValue({ getTracks: () => tracks });
  Object.defineProperty(global, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: microphone } } });
  (global as any).document = { addEventListener: jest.fn(), removeEventListener: jest.fn(), visibilityState: 'visible' };
  (global as any).AudioContext = jest.fn().mockImplementation(() => {
    const context = { sampleRate: 48000, currentTime: 0, destination: {}, resume: jest.fn().mockResolvedValue(undefined), close: jest.fn().mockResolvedValue(undefined), audioWorklet: { addModule: jest.fn().mockResolvedValue(undefined) }, createMediaStreamSource: () => ({ connect: jest.fn(), disconnect: jest.fn() }), createBuffer: (_: number, length: number, rate: number) => ({ duration: length / rate, copyToChannel: jest.fn() }), createBufferSource: () => { const node = { connect: jest.fn(), disconnect: jest.fn(), start: jest.fn(), stop: jest.fn(), onended: null }; playback.push(node); return node; } };
    contexts.push(context); return context;
  });
  (global as any).AudioWorkletNode = jest.fn().mockImplementation(() => { input = { connect: jest.fn(), disconnect: jest.fn(), port: { onmessage: null, close: jest.fn() } }; return input; });
  (global as any).window = { AudioContext: (global as any).AudioContext, AudioWorkletNode: (global as any).AudioWorkletNode };
  (global as any).WebSocket = class { static OPEN = 1; readyState = 1; send = jest.fn(); close = jest.fn(); constructor(public url: string) { connections.push(this); } };
  URL.createObjectURL = jest.fn().mockReturnValue('blob:audio-worklet'); URL.revokeObjectURL = jest.fn();
  (supabase.functions.invoke as jest.Mock).mockReset().mockResolvedValue({ data: { success: true, token: 'ephemeral', proof: 'signed-proof', model: 'gemini-3.8-live', duration_ms: 120000 }, error: null });
});
afterEach(() => { jest.useRealTimers(); });
const callbacks = () => ({ onStatus: jest.fn(), onDraft: jest.fn(), onSaved: jest.fn(), onError: jest.fn() });
test('cancel while microphone permission is pending closes eventual stream without requesting a token', async () => {
  let resolve!: (value: unknown) => void; microphone.mockReturnValue(new Promise(r => { resolve = r; }));
  const cb = callbacks(), controller = createCoachLive(cb); const starting = controller.start(); await settle();
  controller.stop(); resolve({ getTracks: () => tracks }); await starting;
  expect(tracks[0].stop).toHaveBeenCalled(); expect(supabase.functions.invoke).not.toHaveBeenCalled(); expect(contexts[0].close).toHaveBeenCalled();
});
test('cancel before audio activation finishes never requests microphone permission', async () => {
  let resolve!: () => void;
  (global as any).AudioContext.mockImplementationOnce(() => { const context = { resume: () => new Promise<void>(r => { resolve = r; }), close: jest.fn().mockResolvedValue(undefined) }; contexts.push(context); return context; });
  const controller = createCoachLive(callbacks()); const starting = controller.start(); controller.stop(); resolve(); await starting;
  expect(microphone).not.toHaveBeenCalled(); expect(supabase.functions.invoke).not.toHaveBeenCalled(); expect(contexts[0].close).toHaveBeenCalled();
});
test('single-use handshake streams PCM and completed transcripts save once', async () => {
  const cb = callbacks(), controller = createCoachLive(cb); await controller.start();
  const connection = connections[0]; expect(connection.url).toContain('BidiGenerateContentConstrained?access_token=ephemeral');
  connection.onopen(); expect(JSON.parse(connection.send.mock.calls[0][0]).setup.model).toBe('models/gemini-3.8-live');
  await connection.onmessage({ data: JSON.stringify({ setupComplete: {} }) });
  input.port.onmessage({ data: new Float32Array(2048) });
  expect(JSON.parse(connection.send.mock.calls[1][0]).realtimeInput.audio.mimeType).toBe('audio/pcm;rate=16000');
  await connection.onmessage({ data: JSON.stringify({ serverContent: { inputTranscription: { text: '¿Qué ' } } }) });
  await connection.onmessage({ data: JSON.stringify({ serverContent: { inputTranscription: { text: 'cenar?' }, outputTranscription: { text: 'Prueba pescado.' }, turnComplete: true } }) });
  await settle();
  expect(supabase.functions.invoke).toHaveBeenLastCalledWith('coach-live-session', { body: { action: 'save', proof: 'signed-proof', turn: 1, user_text: '¿Qué cenar?', assistant_text: 'Prueba pescado.' } });
  expect(cb.onSaved).toHaveBeenCalledTimes(1);
  controller.stop(); expect(tracks[0].stop).toHaveBeenCalled(); expect(connection.close).toHaveBeenCalled(); expect(input.port.close).toHaveBeenCalled();
});
test('automatic limit and leaving foreground release the microphone', async () => {
  const controller = createCoachLive(callbacks()); await controller.start();
  await connections[0].onmessage({ data: JSON.stringify({ setupComplete: {} }) });
  jest.advanceTimersByTime(120000); expect(tracks[0].stop).toHaveBeenCalled(); expect(contexts[0].close).toHaveBeenCalled();
  const next = createCoachLive(callbacks()); await next.start();
  const visibility = (document.addEventListener as jest.Mock).mock.calls.at(-1)[1];
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); visibility();
  expect(connections[1].close).toHaveBeenCalled();
});
test('permission denial never requests provider tokens', async () => {
  microphone.mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
  const cb = callbacks(); await createCoachLive(cb).start();
  expect(cb.onError).toHaveBeenCalledWith(expect.stringContaining('Permite el micrófono'));
  expect(supabase.functions.invoke).not.toHaveBeenCalled(); expect(contexts[0].close).toHaveBeenCalled();
});
test('barge-in cancels queued model audio without saving an incomplete turn', async () => {
  const cb = callbacks(), controller = createCoachLive(cb); await controller.start(); const connection = connections[0];
  await connection.onmessage({ data: JSON.stringify({ serverContent: { modelTurn: { parts: [{ inlineData: { data: btoa('\0\0\0\0'), mimeType: 'audio/pcm;rate=24000' } }] } } }) });
  expect(playback[0].start).toHaveBeenCalled();
  await connection.onmessage({ data: JSON.stringify({ serverContent: { interrupted: true } }) });
  expect(playback[0].stop).toHaveBeenCalled(); expect(cb.onStatus).toHaveBeenLastCalledWith('listening'); expect(supabase.functions.invoke).toHaveBeenCalledTimes(1); controller.stop();
});
test('asynchronous Blob decoding preserves server transcript order', async () => {
  const cb = callbacks(), controller = createCoachLive(cb); await controller.start(); const connection = connections[0];
  let resolve!: (value: string) => void; const decoded = new Promise<string>(r => { resolve = r; });
  const first = connection.onmessage({ data: { text: () => decoded } });
  const second = connection.onmessage({ data: JSON.stringify({ serverContent: { inputTranscription: { text: 'cenar?' }, outputTranscription: { text: 'Pescado.' }, turnComplete: true } }) });
  await settle(); expect(cb.onSaved).not.toHaveBeenCalled();
  resolve(JSON.stringify({ serverContent: { inputTranscription: { text: '¿Qué ' } } })); await Promise.all([first, second]); await settle();
  expect(supabase.functions.invoke).toHaveBeenLastCalledWith('coach-live-session', { body: expect.objectContaining({ user_text: '¿Qué cenar?' }) }); controller.stop();
});
