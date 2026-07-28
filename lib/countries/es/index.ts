import { CountryPack, Region, TaxSystem } from "../types";
import {
  ES_INCOME_TAX_BANDS_2026,
  ES_SAVINGS_TAX_BANDS_2026,
  ES_PLAN_PENSIONES_MAX_CONTRIBUTION,
  ES_DEFAULT_STATE_PENSION_ANNUAL,
  ES_DEFAULT_PENSION_ACCESS_AGE,
  ES_DEFAULT_STATE_PENSION_AGE,
  calculateEsPersonalAllowance,
} from "./constants";

export const esRegion: Region = {
  id: "spain-general",
  label: "España (Régimen General)",
};

export const esTaxSystem: TaxSystem = {
  bases: [
    {
      id: "income",
      schedule: [
        { upTo: ES_INCOME_TAX_BANDS_2026.basicBandWidth, rate: ES_INCOME_TAX_BANDS_2026.basicRate },
        { upTo: ES_INCOME_TAX_BANDS_2026.mediumBandWidth, rate: ES_INCOME_TAX_BANDS_2026.secondRate },
        { upTo: ES_INCOME_TAX_BANDS_2026.higherBandWidth, rate: ES_INCOME_TAX_BANDS_2026.thirdRate },
        { upTo: ES_INCOME_TAX_BANDS_2026.topBandWidth, rate: ES_INCOME_TAX_BANDS_2026.fourthRate },
        { upTo: 300000, rate: ES_INCOME_TAX_BANDS_2026.fifthRate },
        { upTo: Infinity, rate: ES_INCOME_TAX_BANDS_2026.topRate },
      ],
      allowance: () => calculateEsPersonalAllowance(),
    },
    {
      id: "cgt",
      schedule: ES_SAVINGS_TAX_BANDS_2026,
      allowance: () => 0,
    },
  ],
  routing: {
    employment: { base: "income" },
    "pension-withdrawal": { base: "income" },
    rental: { base: "income" },
    "state-pension": { base: "income" },
    "realised-gains": { base: "cgt" },
  },
};

export const esPack: CountryPack = {
  id: "es",
  currency: { code: "EUR", locale: "es-ES", symbol: "€" },
  regions: [esRegion],
  wrappers: [
    {
      id: "pias",
      label: "PIAS / Fondos",
      treatment: "tax-free",
      withdrawalBucket: "other",
    },
    {
      id: "plan-pensiones",
      label: "Plan de Pensiones",
      treatment: "tax-deferred",
      annualContributionLimit: ES_PLAN_PENSIONES_MAX_CONTRIBUTION,
      withdrawalBucket: "pension-withdrawal",
    },
    {
      id: "cuenta-valores",
      label: "Cuenta de Valores",
      treatment: "taxable",
      withdrawalBucket: "realised-gains",
    },
  ],
  labels: {
    statePension: "Pensión Pública de Jubilación",
    taxFreeWrapper: "PIAS / Fondos",
    taxDeferredWrapper: "Plan de Pensiones",
    taxableWrapper: "Cuenta de Valores",
    hasPensionStrategyToggle: false,
    retirementAgeTooltip:
      "La edad a la que quieres dejar de trabajar. Tus fondos de inversión y PIAS cubrirán el periodo hasta cobrar la pensión o rescatar tu plan de pensiones.",
    targetIncomeTooltip:
      "El ingreso neto anual deseado durante la jubilación — libre de impuestos y expresado en euros de hoy.",
    partTimeTooltip:
      "Genera ingresos a tiempo parcial en la jubilación temprana para reducir la dependencia de tus ahorros antes de cobrar la pensión pública.",
    rentalSaleTooltip:
      "Déjalo en 0 si quieres conservarlo. Si fijas una edad de venta, se venderá tributando en la base del ahorro del IRPF y el neto pasará a tu cuenta de valores.",
    homeTooltip:
      "Forma parte de tu patrimonio neto pero no genera renta periódica, a menos que vendas para trasladarte a una vivienda más pequeña (reducción de vivienda) e inyectes liquidez.",
    savingsHelper:
      "Una cifra aproximada del total ahorrado entre planes de pensiones, fondos de inversión y cuentas es suficiente.",
    savingsHint: "Lo asignaremos a tus fondos de inversión como punto de partida. Podrás distribuirlo entre tus distintas cuentas en el planificador.",
    baristaTagline:
      "Reduce tu jornada o trabaja a tiempo parcial para cubrir la transición hasta la pensión pública.",
    strategyWhy:
      "Tu estrategia define cuándo dejas de hacer aportaciones y cómo financias la transición hasta la pensión pública.",
    checklistSavingsHint:
      "Consulta el extracto de tu banco o de la gestora de tu plan de pensiones. Una cifra aproximada es suficiente.",
    lifestyleBenchmarkName: "Estándares de Vida en la Jubilación en España",
  },
  lifestyleTiers: [
    {
      id: "minimum",
      label: "Mínimo",
      amount: 12000,
      blurb: "Cubre las necesidades esenciales con un pequeño margen para ocio.",
    },
    {
      id: "moderate",
      label: "Moderado",
      amount: 24000,
      blurb: "Mayor tranquilidad financiera, viajes y margen para imprevistos.",
    },
    {
      id: "comfortable",
      label: "Confortable",
      amount: 36000,
      blurb: "Gran libertad económica, ocio y un nivel de vida holgado.",
    },
  ],
  quizDefaults: {
    customIncome: 35000,
    baristaAnnualIncome: 12000,
    defaultIsaMonthly: 400,
    defaultSippMonthly: 250,
    defaultStatePensionAnnual: ES_DEFAULT_STATE_PENSION_ANNUAL,
    defaultPensionAccessAge: ES_DEFAULT_PENSION_ACCESS_AGE,
    defaultStatePensionAge: ES_DEFAULT_STATE_PENSION_AGE,
  },
  taxSystem: () => esTaxSystem,
  statePension: () => ES_DEFAULT_STATE_PENSION_ANNUAL,
  constraints: [],
  disposalPolicy: "fifo",
  drawdownCandidates: ["gradual"],
};
