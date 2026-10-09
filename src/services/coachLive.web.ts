import { supabase } from "@/services/supabase";
import { extractFunctionErrorMessage } from "@/utils/functionErrors";
import { Pcm16Encoder, decodePcm16 } from "@/utils/coachAudio";
import type { CoachLiveController, LiveCallbacks } from "./coachLiveTypes";
export const coachLiveSupported = () => typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && "AudioContext" in window && "AudioWorkletNode" in window;
const workletSource = `class CoachInput extends AudioWorkletProcessor {
  constructor(){super();this.buffer=new Float32Array(2048);this.offset=0;}
  process(inputs){const input=inputs[0]?.[0];if(input)for(const value of input){this.buffer[this.offset++]=value;if(this.offset===2048){this.port.postMessage(this.buffer,[this.buffer.buffer]);this.buffer=new Float32Array(2048);this.offset=0;}}return true;}
}registerProcessor('coach-input',CoachInput);`;

export function createCoachLive(callbacks: LiveCallbacks): CoachLiveController {
  let active = false, stream: MediaStream | null = null, audio: AudioContext | null = null;
  let socket: WebSocket | null = null, inputNode: AudioWorkletNode | null = null, source: MediaStreamAudioSourceNode | null = null;
  let limitTimer: ReturnType<typeof setTimeout> | undefined, setupTimer: ReturnType<typeof setTimeout> | undefined;
  let playbackAt = 0, userDraft = "", assistantDraft = "", turn = 0;
  const outputs = new Set<AudioBufferSourceNode>();
  let saving = Promise.resolve();
  const clearPlayback = () => {
    for (const node of outputs) { node.onended = null; try { node.stop(); } catch {} node.disconnect(); }
    outputs.clear(); playbackAt = 0;
  };
  const stop = () => {
    active = false;
    clearTimeout(limitTimer); clearTimeout(setupTimer);
    document.removeEventListener("visibilitychange", visibility);
    stream?.getTracks().forEach(track => track.stop()); stream = null;
    source?.disconnect(); source = null;
    if (inputNode) { inputNode.port.onmessage = null; inputNode.port.close(); inputNode.disconnect(); inputNode = null; }
    clearPlayback();
    socket?.close(); socket = null;
    if (audio) void audio.close().catch(() => {}); audio = null;
    callbacks.onStatus("idle"); callbacks.onDraft("", "");
  };
  const visibility = () => { if (document.visibilityState === "hidden") stop(); };
  const fail = (message: string) => { stop(); callbacks.onError(message); };
  const invoke = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("coach-live-session", { body });
    if (error) throw new Error(await extractFunctionErrorMessage(error, "No se pudo conectar la voz. Puedes seguir escribiendo."));
    if (!data?.success) throw new Error(data?.error?.message || "No se pudo iniciar la voz.");
    return data;
  };
  const start = async () => {
    if (active) return;
    if (!coachLiveSupported()) { callbacks.onError("Abre la app en un navegador con micrófono para conversar por voz."); return; }
    active = true; userDraft = ""; assistantDraft = ""; turn = 0;
    callbacks.onStatus("connecting");
    document.addEventListener("visibilitychange", visibility);
    try {
      audio = new AudioContext();
      await audio.resume();
      if (!active) return;
      const microphone = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (!active) { microphone.getTracks().forEach(track => track.stop()); return; }
      stream = microphone;
      const session = await invoke({ action: "start" });
      if (!active || !audio) return;
      const blobUrl = URL.createObjectURL(new Blob([workletSource], { type: "application/javascript" }));
      try { await audio.audioWorklet.addModule(blobUrl); } finally { URL.revokeObjectURL(blobUrl); }
      if (!active || !audio) return;
      const encoder = new Pcm16Encoder(audio.sampleRate);
      source = audio.createMediaStreamSource(stream);
      inputNode = new AudioWorkletNode(audio, "coach-input");
      source.connect(inputNode); inputNode.connect(audio.destination);
      const connection = new WebSocket("wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=" + encodeURIComponent(session.token));
      socket = connection;
      let ready = false;
      let receiving = Promise.resolve();
      setupTimer = setTimeout(() => { if (active) fail("La voz tardó demasiado en conectar. Reintenta."); }, 20000);
      limitTimer = setTimeout(() => stop(), Math.min(Number(session.duration_ms) || 120000, 120000));
      inputNode.port.onmessage = event => {
        if (!active || !ready || connection.readyState !== WebSocket.OPEN) return;
        const pcm = encoder.encode(event.data as Float32Array);
        if (pcm) connection.send(JSON.stringify({ realtimeInput: { audio: { data: pcm, mimeType: "audio/pcm;rate=16000" } } }));
      };
      connection.onopen = () => { if (active) connection.send(JSON.stringify({ setup: { model: "models/" + session.model, generationConfig: { responseModalities: ["AUDIO"] }, inputAudioTranscription: {}, outputAudioTranscription: {} } })); };
      connection.onmessage = event => {
        // Blob decoding is asynchronous; preserve the server's audio/transcript order.
        receiving = receiving.then(async () => {
        if (!active) return;
        try {
          const payload = JSON.parse(typeof event.data === "string" ? event.data : await event.data.text());
          if (!active) return;
          if (payload.setupComplete) { ready = true; clearTimeout(setupTimer); callbacks.onStatus("listening"); }
          if (payload.error) { fail("La voz no está disponible ahora. Puedes seguir usando el chat y Escuchar."); return; }
          const content = payload.serverContent;
          if (!content || !audio) return;
          if (content.interrupted) { clearPlayback(); callbacks.onStatus("listening"); }
          userDraft = (userDraft + (content.inputTranscription?.text || "")).slice(0, 4000);
          assistantDraft = (assistantDraft + (content.outputTranscription?.text || "")).slice(0, 6000);
          callbacks.onDraft(userDraft, assistantDraft);
          for (const part of content.modelTurn?.parts || []) {
            if (!part.inlineData?.data || !part.inlineData.mimeType?.startsWith("audio/pcm")) continue;
            const samples = decodePcm16(part.inlineData.data);
            const rate = Number(part.inlineData.mimeType.match(/rate=(\d+)/)?.[1] || 24000);
            if (!samples.length || rate !== 24000) continue;
            const buffer = audio.createBuffer(1, samples.length, rate); buffer.copyToChannel(samples, 0);
            const output = audio.createBufferSource(); output.buffer = buffer; output.connect(audio.destination);
            playbackAt = Math.max(audio.currentTime + 0.02, playbackAt);
            output.start(playbackAt); playbackAt += buffer.duration; outputs.add(output);
            callbacks.onStatus("speaking");
            output.onended = () => { output.disconnect(); outputs.delete(output); if (active && !outputs.size) callbacks.onStatus("listening"); };
          }
          if (content.turnComplete) {
            if (userDraft.trim() && assistantDraft.trim()) {
              const body = { action: "save", proof: session.proof, turn: ++turn, user_text: userDraft.trim(), assistant_text: assistantDraft.trim() };
              saving = saving.then(async () => { await invoke(body); callbacks.onSaved(); }).catch(() => callbacks.onError("No se pudo guardar un turno por voz. Revisa tu conexión."));
            }
            userDraft = ""; assistantDraft = ""; callbacks.onDraft("", "");
            if (!outputs.size) callbacks.onStatus("listening");
            if (turn >= 20) stop();
          }
        } catch { if (active) fail("Se interrumpió la conexión de voz. Puedes volver a conectarte."); }
        });
        return receiving;
      };
      connection.onerror = () => { if (active) fail("No se pudo conectar la voz. Revisa tu conexión."); };
      connection.onclose = () => { if (active) fail("La conversación por voz terminó. Puedes iniciar otra o seguir escribiendo."); };
    } catch (error) {
      if (!active) return;
      const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "NotFoundError");
      fail(denied ? "Permite el micrófono en el navegador para conversar por voz." : error instanceof Error ? error.message : "No se pudo iniciar la voz.");
    }
  };
  return { start, stop };
}
