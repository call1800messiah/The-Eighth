import type { BeatSession } from '../models';

/*
 * Client-side mirror of beat_session_active_seconds() in migration 011.
 *
 * The database stamps every beat with the session clock, so stored values are
 * authoritative. These functions only extrapolate "now" between ticks, using
 * the browser clock. A device a few seconds off is irrelevant at the scale of
 * an hour-long interval; results are clamped so skew never shows as negative.
 */

/** Seconds of unpaused session time at `nowMs`. */
export function sessionActiveSeconds(session: BeatSession, nowMs: number): number {
  const runningPause = session.pausedAt
    ? Math.max(0, nowMs - session.pausedAt.getTime()) / 1000
    : 0;
  const elapsed = (nowMs - session.startedAt.getTime()) / 1000;
  return Math.max(0, Math.floor(elapsed - session.pausedSeconds - runningPause));
}


/** Unpaused seconds since a PC's last beat (or since session start). */
export function idleSeconds(session: BeatSession, lastBeatActiveSeconds: number, nowMs: number): number {
  return Math.max(0, sessionActiveSeconds(session, nowMs) - lastBeatActiveSeconds);
}


/**
 * How far into the interval a PC is: 0 right after a beat, 1 at the interval,
 * above 1 when overdue. Drives the fill and colour of the chip in the bar.
 */
export function idleRatio(idle: number, intervalMinutes: number): number {
  const interval = Math.max(1, intervalMinutes) * 60;
  return idle / interval;
}


/** "0:07" / "1:05" style h:mm for chip tooltips and labels. */
export function formatIdle(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}
