// ─── computeAgeFloor ─────────────────────────────────────────────────────────

/**
 * Computes the CAGE age floor (18 or 21) from a date of birth string.
 * Returns null if the person is under 18.
 *
 * Age is computed by calendar year subtraction, adjusted if the birthday
 * hasn't occurred yet this year. Do NOT use millisecond arithmetic — it
 * drifts with leap years.
 *
 * @param dateOfBirth - ISO date string 'YYYY-MM-DD'
 * @param today       - Reference date (defaults to now; injectable for tests)
 */
export function computeAgeFloor(dateOfBirth: string, today = new Date()): number | null {
  const [birthYearStr, birthMonthStr, birthDayStr] = dateOfBirth.split('-');
  const birthYear  = parseInt(birthYearStr!,  10);
  const birthMonth = parseInt(birthMonthStr!, 10);
  const birthDay   = parseInt(birthDayStr!,   10);

  let age = today.getFullYear() - birthYear;

  // If the birthday hasn't occurred yet this calendar year, subtract one
  const birthdayThisYear = new Date(today.getFullYear(), birthMonth - 1, birthDay);
  if (today < birthdayThisYear) {
    age--;
  }

  if (age >= 21) return 21;
  if (age >= 18) return 18;
  return null;
}
