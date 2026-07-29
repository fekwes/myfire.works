export function deriveStatePensionAge(currentAge: number): number {
  // Current year is 2026.
  // Born after 5 April 1977 => 49 or under today => 68
  if (currentAge <= 49) return 68;
  // Born between 1961 and 1977 => 50 to 65 today => 67
  if (currentAge <= 65) return 67;
  // Born 1960 or earlier => 66
  return 66;
}

export function deriveMinimumPensionAge(currentAge: number = 0): number {
  // UK Normal Minimum Pension Age (NMPA) rises to 57 on 6 April 2028 (Finance Act 2022).
  // Individuals born before April 1973 (age 53+ in 2026) reach 55 before April 2028.
  if (currentAge >= 53) return 55;
  return 57;
}
