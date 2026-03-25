import cron from 'node-cron';
import { prisma } from '../lib/prisma';

/**
 * Calculates the expected end time of a collection period given its config.
 */
function calculateEndTime(startedAt: Date, intervalType: string, intervalValue: number): Date {
  const ms = intervalValue * getIntervalMs(intervalType);
  return new Date(startedAt.getTime() + ms);
}

function getIntervalMs(intervalType: string): number {
  switch (intervalType) {
    case 'HOURS': return 60 * 60 * 1000;
    case 'DAYS': return 24 * 60 * 60 * 1000;
    case 'WEEKS': return 7 * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
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
    // No active period — create one using the active config
    const activeConfig = await prisma.intervalConfig.findFirst({ where: { isActive: true } });
    if (!activeConfig) {
      console.warn('[Scheduler] No active interval config found. Cannot create a period.');
      return;
    }
    await prisma.collectionPeriod.create({
      data: {
        intervalConfigId: activeConfig.id,
        startedAt: new Date(),
        isActive: true,
      },
    });
    console.log('[Scheduler] Created new collection period (none was active).');
    return;
  }

  const now = new Date();
  await prisma.$transaction([
    // Close current period
    prisma.collectionPeriod.update({
      where: { id: activePeriod.id },
      data: { endedAt: now, isActive: false, archivedAt: now },
    }),
    // Open new period
    prisma.collectionPeriod.create({
      data: {
        intervalConfigId: activePeriod.intervalConfigId,
        startedAt: now,
        isActive: true,
      },
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

/**
 * Checks if the active period should end and rotates if so.
 * Also handles catch-up if the app was offline when a period should have ended.
 */
async function checkAndRotate(): Promise<void> {
  try {
    const activePeriod = await prisma.collectionPeriod.findFirst({
      where: { isActive: true },
      include: { intervalConfig: true },
    });

    if (!activePeriod) {
      await rotatePeriod(); // creates a period if none exists
      return;
    }

    const expectedEnd = calculateEndTime(
      activePeriod.startedAt,
      activePeriod.intervalConfig.intervalType,
      activePeriod.intervalConfig.intervalValue
    );

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

  // Run immediately on startup to catch up after any downtime
  checkAndRotate();

  // Then check every minute
  cron.schedule('* * * * *', checkAndRotate);
}
