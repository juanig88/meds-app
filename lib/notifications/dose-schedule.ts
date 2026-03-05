/** Horarios fijos de recordatorio push: 9:00 y 21:00. */
const HOUR_MORNING = 9
const HOUR_EVENING = 21

export function getHourForSlot(timesPerDay: number, slotIndex: number): number {
  if (slotIndex === 0) return HOUR_MORNING
  if (timesPerDay > 1 && slotIndex === timesPerDay - 1) return HOUR_EVENING
  return -1
}
