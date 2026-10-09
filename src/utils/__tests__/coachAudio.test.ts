import { Pcm16Encoder, decodePcm16 } from "../coachAudio";
const floats = (text: string) => Array.from(decodePcm16(text));
test("microphone PCM is mono, signed little endian, saturated and 16kHz", () => {
  const bytes = new Pcm16Encoder(16000).encode(new Float32Array([-2, 0, 2, 0]));
  expect(Array.from(Buffer.from(bytes, "base64"))).toEqual([0, 128, 0, 0, 255, 127]);
  expect(floats(bytes)).toEqual([-1, 0, 32767 / 32768]);
});
test.each([48000, 44100])("chunk boundaries preserve audio timing at %i Hz", rate => {
  const samples = Float32Array.from({ length: 8192 }, (_, i) => Math.sin(i / 100));
  const whole = Buffer.from(new Pcm16Encoder(rate).encode(samples), "base64");
  const streaming = new Pcm16Encoder(rate);
  const pieces = Array.from({ length: 4 }, (_, i) => Buffer.from(streaming.encode(samples.slice(i * 2048, (i + 1) * 2048)), "base64"));
  expect(Buffer.concat(pieces)).toEqual(whole);
  expect(whole.length / 2).toBeCloseTo(samples.length * 16000 / rate, -1);
});
test("invalid PCM output and unsupported microphone rates are rejected", () => {
  expect(() => decodePcm16(btoa("x"))).toThrow(); expect(() => new Pcm16Encoder(8000)).toThrow();
});
