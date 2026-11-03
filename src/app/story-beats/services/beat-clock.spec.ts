import type { BeatSession } from '../models';
import { formatIdle, idleRatio, idleSeconds, sessionActiveSeconds } from './beat-clock';

describe('beat-clock', () => {
  const start = Date.parse('2026-11-03T18:00:00Z');
  const min = 60_000;

  function session(overrides: Partial<BeatSession> = {}): BeatSession {
    return {
      id: 's1',
      intervalMinutes: 60,
      startedAt: new Date(start),
      pausedAt: null,
      pausedSeconds: 0,
      mutedPersonIds: [],
      beats: [],
      ...overrides,
    };
  }

  describe('sessionActiveSeconds()', () => {
    it('counts wall time while running', () => {
      expect(sessionActiveSeconds(session(), start + 10 * min)).toBe(600);
    });

    it('subtracts completed pauses', () => {
      expect(sessionActiveSeconds(session({ pausedSeconds: 180 }), start + 10 * min)).toBe(420);
    });

    it('stops while paused', () => {
      const s = session({ pausedAt: new Date(start + 7 * min) });
      expect(sessionActiveSeconds(s, start + 7 * min)).toBe(420);
      expect(sessionActiveSeconds(s, start + 30 * min)).toBe(420);
    });


    it('never goes negative when the browser clock is behind', () => {
      expect(sessionActiveSeconds(session(), start - 5000)).toBe(0);
    });
  });

  describe('idleSeconds()', () => {
    it('measures from the last beat on the session clock', () => {
      expect(idleSeconds(session(), 300, start + 10 * min)).toBe(300);
    });

    it('does not grow during a pause', () => {
      const s = session({ pausedAt: new Date(start + 10 * min) });
      expect(idleSeconds(s, 300, start + 60 * min)).toBe(300);
    });

    it('clamps at zero', () => {
      expect(idleSeconds(session(), 900, start + 10 * min)).toBe(0);
    });
  });

  describe('idleRatio()', () => {
    it('is 1 at the interval and above when overdue', () => {
      expect(idleRatio(3600, 60)).toBe(1);
      expect(idleRatio(5400, 60)).toBe(1.5);
      expect(idleRatio(900, 60)).toBe(0.25);
    });

    it('guards against a zero interval', () => {
      expect(idleRatio(60, 0)).toBe(1);
    });
  });

  describe('formatIdle()', () => {
    it('formats as h:mm', () => {
      expect(formatIdle(0)).toBe('0:00');
      expect(formatIdle(7 * 60 + 59)).toBe('0:07');
      expect(formatIdle(65 * 60)).toBe('1:05');
    });
  });
});
