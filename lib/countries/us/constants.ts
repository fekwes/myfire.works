export const US_TAX_BANDS_2024 = {
  single: {
    standardDeduction: 14600,
    brackets: [
      { upTo: 11600, rate: 0.10 },
      { upTo: 47150, rate: 0.12 },
      { upTo: 100525, rate: 0.22 },
      { upTo: 191950, rate: 0.24 },
      { upTo: 243725, rate: 0.32 },
      { upTo: 609350, rate: 0.35 },
      { upTo: Infinity, rate: 0.37 },
    ],
    ltcg: [
      { upTo: 47025, rate: 0.0 },
      { upTo: 518900, rate: 0.15 },
      { upTo: Infinity, rate: 0.20 },
    ],
  },
  joint: {
    standardDeduction: 29200,
    brackets: [
      { upTo: 23200, rate: 0.10 },
      { upTo: 94300, rate: 0.12 },
      { upTo: 201050, rate: 0.22 },
      { upTo: 383900, rate: 0.24 },
      { upTo: 487450, rate: 0.32 },
      { upTo: 731200, rate: 0.35 },
      { upTo: Infinity, rate: 0.37 },
    ],
    ltcg: [
      { upTo: 94050, rate: 0.0 },
      { upTo: 553850, rate: 0.15 },
      { upTo: Infinity, rate: 0.20 },
    ],
  },
};

// Social Security 2024 Bend Points
export const SS_BEND_POINTS_2024 = {
  first: 1174,
  second: 7078,
  rates: [0.90, 0.32, 0.15],
};
