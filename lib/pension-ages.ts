export function deriveStatePensionAge(currentAge: number): number {
  // Current year is 2026.
  // Born after 5 April 1977 => 49 or under today => 68
  if (currentAge <= 49) return 68;
  // Born between 1961 and 1977 => 50 to 65 today => 67
  if (currentAge <= 65) return 67;
  // Born 1960 or earlier => 66
  return 66;
}

export function deriveMinimumPensionAge(currentAge: number): number {
  // The government's stated intention is to keep NMPA ten years below SPA.
  // 58 is expected-not-legislated for those with SPA 68.
  const spa = deriveStatePensionAge(currentAge);
  if (spa === 68) return 58;
  return 57; // Minimum pension age rises to 57 in April 2028.
}
