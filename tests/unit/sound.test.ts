import { describe, it, expect, vi, beforeEach } from 'vitest';
import { playButtonTapSound, getSharedAudioContext, speakPaymentConfirmed } from '@/lib/sound';

describe('Sound Synthesizer & Button Audio Feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs playButtonTapSound safely in test environment without crashing', () => {
    expect(() => playButtonTapSound('tap')).not.toThrow();
    expect(() => playButtonTapSound('success')).not.toThrow();
    expect(() => playButtonTapSound('delete')).not.toThrow();
    expect(() => playButtonTapSound('pop')).not.toThrow();
  });

  it('handles simulated AudioContext gracefully', () => {
    const mockOsc = {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    const mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
    const mockAudioContext = {
      currentTime: 0.1,
      state: 'running',
      createOscillator: vi.fn().mockReturnValue(mockOsc),
      createGain: vi.fn().mockReturnValue(mockGain),
      destination: {},
    };

    (globalThis as any).window = {
      AudioContext: vi.fn().mockImplementation(() => mockAudioContext),
    };

    expect(() => playButtonTapSound('tap')).not.toThrow();
  });

  it('runs speakPaymentConfirmed safely with various table names and numbers', () => {
    expect(() => speakPaymentConfirmed('โต๊ะ 1')).not.toThrow();
    expect(() => speakPaymentConfirmed(1)).not.toThrow();
    expect(() => speakPaymentConfirmed('2')).not.toThrow();
    expect(() => speakPaymentConfirmed('โต๊ะ 2')).not.toThrow();
    expect(() => speakPaymentConfirmed('กลับบ้าน')).not.toThrow();
    expect(() => speakPaymentConfirmed()).not.toThrow();
    expect(() => speakPaymentConfirmed('')).not.toThrow();
  });
});
