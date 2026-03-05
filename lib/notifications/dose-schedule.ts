/** Slots: mañana = primera dosis (0), noche = última dosis del día. */

export function isMorningSlot(timesPerDay: number, slotIndex: number): boolean {
  return slotIndex === 0
}

export function isEveningSlot(timesPerDay: number, slotIndex: number): boolean {
  return timesPerDay > 1 && slotIndex === timesPerDay - 1
}
