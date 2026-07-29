export const US_TAX_BANDS_2026 = {
  single: {
    standardDeduction: 16100,
    brackets: [
      { upTo: 12400, rate: 0.10 },
      { upTo: 50400, rate: 0.12 },
      { upTo: 105700, rate: 0.22 },
      { upTo: 201775, rate: 0.24 },
      { upTo: 256225, rate: 0.32 },
      { upTo: 640600, rate: 0.35 },
      { upTo: Infinity, rate: 0.37 },
    ],
    ltcg: [
      { upTo: 49450, rate: 0.0 },
      { upTo: 545500, rate: 0.15 },
      { upTo: Infinity, rate: 0.20 },
    ],
    niitThreshold: 200000,
  },
  "married-joint": {
    standardDeduction: 32200,
    brackets: [
      { upTo: 24800, rate: 0.10 },
      { upTo: 100800, rate: 0.12 },
      { upTo: 211400, rate: 0.22 },
      { upTo: 403550, rate: 0.24 },
      { upTo: 512450, rate: 0.32 },
      { upTo: 768700, rate: 0.35 },
      { upTo: Infinity, rate: 0.37 },
    ],
    ltcg: [
      { upTo: 98900, rate: 0.0 },
      { upTo: 613700, rate: 0.15 },
      { upTo: Infinity, rate: 0.20 },
    ],
    niitThreshold: 250000,
  },
};

// Social Security 2026 Bend Points
export const SS_BEND_POINTS_2026 = {
  first: 1286,
  second: 7749,
  rates: [0.90, 0.32, 0.15],
};

// ACA FPL 2025
export const ACA_FPL_2025 = {
  single: 15650,
  "married-joint": 21150,
};

// State taxes approximations for demonstration
export const US_STATE_TAXES = {
  "zero-tax": {
    brackets: [
      { upTo: Infinity, rate: 0.0 }
    ]
  },
  "ca": { // Simplified progressive CA for demonstration
    brackets: [
      { upTo: 1046, rate: 0.01 },
      { upTo: 24784, rate: 0.02 },
      { upTo: 39121, rate: 0.04 },
      { upTo: 54316, rate: 0.06 },
      { upTo: 68641, rate: 0.08 },
      { upTo: 350849, rate: 0.093 },
      { upTo: 420993, rate: 0.103 },
      { upTo: 699999, rate: 0.113 },
      { upTo: 999999, rate: 0.123 },
      { upTo: Infinity, rate: 0.133 } // 12.3% + 1% surcharge
    ]
  },
  "ny": {
    brackets: [
      { upTo: 8500, rate: 0.04 },
      { upTo: 11700, rate: 0.045 },
      { upTo: 13900, rate: 0.0525 },
      { upTo: 80650, rate: 0.0585 },
      { upTo: 215400, rate: 0.0597 },
      { upTo: 1077550, rate: 0.0685 },
      { upTo: 5000000, rate: 0.0965 },
      { upTo: 25000000, rate: 0.103 },
      { upTo: Infinity, rate: 0.109 }
    ]
  }
};
