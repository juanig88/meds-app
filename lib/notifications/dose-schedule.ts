/**
 * Default hour (0–23) for each slot when cron runs.
 * 1/day = morning; 2/day = morning + evening; 3/day = morning + afternoon + evening.
 */
const DEFAULT_SCHEDULE: Record<number, number[]> = {
  1: [9],                    // 09:00
  2: [8, 20],                // 08:00, 20:00 (morning, evening)
  3: [8, 14, 20],            // 08:00, 14:00, 20:00
  4: [8, 12, 16, 20],        // 08:00, 12:00, 16:00, 20:00
}

export function getHourForSlot(timesPerDay: number, slotIndex: number): number {
  const hours = DEFAULT_SCHEDULE[timesPerDay] ?? DEFAULT_SCHEDULE[1]
  return hours[slotIndex] ?? hours[0] ?? 9
}

export function getHoursForMedication(timesPerDay: number): number[] {
  return DEFAULT_SCHEDULE[timesPerDay] ?? DEFAULT_SCHEDULE[1]
}
