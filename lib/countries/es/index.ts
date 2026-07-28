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
      "Edad en la que planeas dejar de trabajar. Tus ahorros e inversiones cubrirán la etapa puente hasta la pensión pública.",
    targetIncomeTooltip:
      "El ingreso neto anual deseado durante la jubilación — libre de impuestos, expresado en dinero de hoy.",
    partTimeTooltip:
      "Trabaja a tiempo parcial en la jubilación temprana para complementar la renta hasta la pensión pública.",
    rentalSaleTooltip:
      "Déjalo en 0 para conservarlo. Si no, se venderá a esta edad (tributación de ganancias patrimoniales) y el neto irá a tu cuenta de valores.",
    homeTooltip:
      "Suma al patrimonio neto pero no financia la renta mensual — salvo que reduzcas vivienda y liberes liquidez.",
    savingsHelper:
      "Una estimación aproximada de tus ahorros en planes de pensiones y fondos de inversión es suficiente.",
    savingsHint: "Lo añadiremos a tus fondos de inversión para empezar — podrás redistribuirlo en el planificador.",
    baristaTagline:
      "Deja el trabajo a tiempo completo antes y compleméntalo con ingresos a tiempo parcial hasta la pensión.",
    strategyWhy:
      "Tu estrategia cambia cuándo dejas de aportar dinero y cómo se financia el periodo hasta la pensión pública.",
    checklistSavingsHint:
      "De tu extracto bancario o de la gestora de tu plan de pensiones — una cifra aproximada es suficiente.",
    lifestyleBenchmarkName: "Estándares de Vida en la Jubilación (España)",
  },
  lifestyleTiers: [
    {
      id: "minimum",
      label: "Mínimo",
      amount: 12000,
      blurb: "Cubre necesidades básicas con un pequeño margen para ocio.",
    },
    {
      id: "moderate",
      label: "Moderado",
      amount: 24000,
      blurb: "Mayor tranquilidad financiera y margen de flexibilidad.",
    },
    {
      id: "comfortable",
      label: "Confortable",
      amount: 36000,
      blurb: "Gran libertad económica, viajes y extras en la jubilación.",
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
