import { dayKey, forecast, lastDays, record, retentionRate, streak, type ActivityLog } from '@/lib/activity';

const now = new Date(2026, 9, 6, 15, 0).getTime();
const DAY = 86400000;

describe('activity', () => {
  it('records per-day tallies', () => {
    let log: ActivityLog = {};
    log = record(log, 'es', now, { reviews: 1 });
    log = record(log, 'es', now, { reviews: 1, again: 1 });
    log = record(log, 'es', now - DAY, { added: 3 });
    expect(log.es[dayKey(now)]).toEqual({ reviews: 2, again: 1, added: 0 });
    expect(log.es['2026-10-05']).toEqual({ reviews: 0, again: 0, added: 3 });
  });

  it('counts the streak through yesterday when today is not done yet', () => {
    let log: ActivityLog = {};
    for (const d of [1, 2, 3, 5]) log = record(log, 'es', now - d * DAY, { reviews: 1 });
    expect(streak(log.es, now)).toBe(3);
    log = record(log, 'es', now, { reviews: 1 });
    expect(streak(log.es, now)).toBe(4);
    expect(streak(undefined, now)).toBe(0);
  });

  it('builds series, retention and forecast', () => {
    let log: ActivityLog = {};
    log = record(log, 'es', now, { reviews: 10, again: 2 });
    expect(lastDays(log.es, now, 3).map((d) => d.reviews)).toEqual([0, 0, 10]);
    expect(retentionRate(log.es, now)).toBeCloseTo(0.8);
    expect(retentionRate({}, now)).toBeNull();
    const f = forecast([now - DAY, now + 1000, now + DAY, now + 30 * DAY], now, 3);
    expect(f.map((d) => d.due)).toEqual([2, 1, 0]);
  });
});
