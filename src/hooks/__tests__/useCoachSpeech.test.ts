let mockCells: any[] = [], mockCursor = 0, mockFirstRender = true;
let mockUnmount: (() => void) | undefined, mockBlur: (() => void) | undefined, mockBackground: ((state: string) => void) | undefined;
jest.mock('react', () => ({
  useState: (initial: unknown) => { const index = mockCursor++; if (!(index in mockCells)) mockCells[index] = initial; return [mockCells[index], (value: unknown) => { mockCells[index] = value; }]; },
  useRef: (value: unknown) => { const index = mockCursor++; if (!(index in mockCells)) mockCells[index] = { current: value }; return mockCells[index]; },
  useCallback: (fn: unknown) => fn,
  useEffect: (fn: () => (() => void)) => { if (mockFirstRender) mockUnmount = fn(); },
}));
jest.mock('expo-router', () => ({ useFocusEffect: (fn: () => (() => void)) => { if (mockFirstRender) mockBlur = fn(); } }));
jest.mock('react-native', () => ({ Platform: { OS: 'web' }, AppState: { addEventListener: (_: string, fn: (state: string) => void) => { mockBackground = fn; return { remove: jest.fn() }; } } }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn().mockResolvedValue(undefined), maxSpeechInputLength: 3000 }));
import * as Speech from 'expo-speech';
import { useCoachSpeech } from '../useCoachSpeech';
const useSpeechHarness = () => { mockCursor = 0; const result = useCoachSpeech(); mockFirstRender = false; return result; };
beforeEach(() => { jest.clearAllMocks(); mockCells = []; mockFirstRender = true; mockUnmount = undefined; mockBlur = undefined; mockBackground = undefined; (global as any).window = { speechSynthesis: {}, SpeechSynthesisUtterance: function() {} }; });
test('switching responses cancels old audio and stale callbacks cannot stop the new response', () => {
  useSpeechHarness().toggle('first', '**Avena:** 60 g'); const oldOptions = (Speech.speak as jest.Mock).mock.calls[0][1];
  useSpeechHarness().toggle('second', 'Leche: 200 ml'); expect(useSpeechHarness().speakingId).toBe('second');
  oldOptions.onDone(); oldOptions.onError(); expect(useSpeechHarness().speakingId).toBe('second'); expect(useSpeechHarness().error).toBeNull();
  useSpeechHarness().toggle('second', 'Leche: 200 ml'); expect(useSpeechHarness().speakingId).toBeNull(); expect(Speech.speak).toHaveBeenCalledTimes(2); expect(Speech.stop).toHaveBeenCalledTimes(3);
});
test('navigation, background and unmount stop voice; late completion is harmless', () => {
  useSpeechHarness().toggle('answer', 'Una opción para cenar.'); mockBlur?.(); expect(useSpeechHarness().speakingId).toBeNull();
  useSpeechHarness().toggle('next', 'Otra opción.'); mockBackground?.('background'); expect(useSpeechHarness().speakingId).toBeNull();
  mockUnmount?.(); const count = (Speech.stop as jest.Mock).mock.calls.length; const late = (Speech.speak as jest.Mock).mock.calls.at(-1)[1]; late.onDone(); expect(Speech.stop).toHaveBeenCalledTimes(count);
});
