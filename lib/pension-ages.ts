export function deriveStatePensionAge(currentAge: number): number {
  // Current year is 2026.
  // Born after 5 April 1977 => 49 or under today => 68
  if (currentAge <= 49) return 68;
  // Born between 1961 and 1977 => 50 to 65 today => 67
  if (currentAge <= 65) return 67;
  // Born 1960 or earlier => 66
  return 66;
}

export function deriveMinimumPensionAge(_currentAge: number): number {
  // UK Normal Minimum Pension Age (NMPA) is statutory age 57 (Finance Act 2022, effective 6 April 2028).
  return 57;
}
