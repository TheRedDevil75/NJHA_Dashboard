import cron from 'node-cron';
import { prisma } from '../lib/prisma';

/**
 * Converts a local calendar datetime in a given IANA timezone to a UTC Date.
 * Uses the Intl API — no external dependencies needed.
 */
function localToUTC(
  year: number, month: number /* 1-based */, day: number,
  hour: number, minute: number,
  timezone: string
): Date {
  // Treat the desired local time as if it were UTC to get a first approximation,
  // then measure the actual UTC offset and correct for it.
  const approx = new Date(Date.UTC(year, month - 1, day, hour, minute));

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric',
    hour12: false,
  }).formatToParts(approx);

  const get = (type: string) => {
    const raw = parts.find((p) => p.type === type)?.value ?? '0';
    return raw === '24' ? 0 : Number(raw); // handle midnight edge case
  };

  const offsetMs = approx.getTime() - Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return new Date(approx.getTime() + offsetMs);
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Returns the next UTC time, strictly after `after`, when the period should reset.
 * Used when resetDays is configured: finds the next occurrence of any specified
 * weekday at startTime in the config's timezone.
 */
function nextResetTime(after: Date, resetDays: number[], startTime: string, timezone: string): Date {
  const [hours, minutes] = startTime.split(':').map(Number);

  for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
    const probe = new Date(after.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: 'numeric', day: 'numeric',
      weekday: 'short',
    }).formatToParts(probe);

    const year  = Number(parts.find((p) => p.type === 'year')?.value ?? 0);
    const month = Number(parts.find((p) => p.type === 'month')?.value ?? 0);
    const day   = Number(parts.find((p) => p.type === 'day')?.value ?? 0);
    const weekdayStr = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const weekday = WEEKDAY_LABELS.indexOf(weekdayStr);

    if (!resetDays.includes(weekday)) continue;

    const candidate = localToUTC(year, month, day, hours, minutes, timezone);
    if (candidate.getTime() > after.getTime()) return candidate;
  }

  // Fallback — should not be reached for non-empty resetDays
  return new Date(after.getTime() + 7 * 24 * 60 * 60 * 1000);
}

/**
 * Calculates the expected end time of a period using simple interval math.
 * Used when resetDays is empty.
 */
function calculateEndTime(startedAt: Date, intervalType: string, intervalValue: number): Date {
  const msPerUnit: Record<string, number> = {
    HOURS: 60 * 60 * 1000,
    DAYS:  24 * 60 * 60 * 1000,
    WEEKS: 7 * 24 * 60 * 60 * 1000,
  };
  return new Date(startedAt.getTime() + intervalValue * (msPerUnit[intervalType] ?? msPerUnit.WEEKS));
}

/**
 * Closes the active period and opens a new one.
 * Can be called by the scheduler or triggered manually by an admin.
 */
export async function rotatePeriod(triggeredByUserId?: string, ipAddress?: string): Promise<void> {
  const activePeriod = await prisma.collectionPeriod.findFirst({
    where: { isActive: true },
    include: { intervalConfig: true },
  });

  if (!activePeriod) {
    const activeConfig = await prisma.intervalConfig.findFirst({ where: { isActive: true } });
    if (!activeConfig) {
      console.warn('[Scheduler] No active interval config found. Cannot create a period.');
      return;
    }
    await prisma.collectionPeriod.create({
      data: { intervalConfigId: activeConfig.id, startedAt: new Date(), isActive: true },
    });
    console.log('[Scheduler] Created new collection period (none was active).');
    return;
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.collectionPeriod.update({
      where: { id: activePeriod.id },
      data: { endedAt: now, isActive: false, archivedAt: now },
    }),
    prisma.collectionPeriod.create({
      data: { intervalConfigId: activePeriod.intervalConfigId, startedAt: now, isActive: true },
    }),
  ]);

  await prisma.auditLog.create({
    data: {
      userId: triggeredByUserId ?? null,
      action: 'PERIOD_ROTATED',
      details: {
        closedPeriodId: activePeriod.id,
        trigger: triggeredByUserId ? 'MANUAL_ADMIN' : 'SCHEDULER',
      },
      ipAddress: ipAddress ?? null,
    },
  });

  console.log(`[Scheduler] Period rotated. Closed: ${activePeriod.id}`);
}

async function checkAndRotate(): Promise<void> {
  try {
    const activePeriod = await prisma.collectionPeriod.findFirst({
      where: { isActive: true },
      include: { intervalConfig: true },
    });

    if (!activePeriod) {
      await rotatePeriod();
      return;
    }

    const cfg = activePeriod.intervalConfig;
    const expectedEnd = cfg.resetDays.length > 0
      ? nextResetTime(activePeriod.startedAt, cfg.resetDays, cfg.startTime, cfg.timezone)
      : calculateEndTime(activePeriod.startedAt, cfg.intervalType, cfg.intervalValue);

    if (new Date() >= expectedEnd) {
      console.log('[Scheduler] Period end time reached — rotating.');
      await rotatePeriod();
    }
  } catch (err) {
    console.error('[Scheduler] Error during period check:', err);
  }
}

export function startScheduler(): void {
  console.log('[Scheduler] Starting period scheduler (checks every minute).');
  checkAndRotate();
  cron.schedule('* * * * *', checkAndRotate);
}
