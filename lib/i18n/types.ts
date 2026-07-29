export type Locale = "en-GB" | "es-ES";

export interface Translations {
  nav: {
    planner: string;
    finances: string;
    methodology: string;
    privacy: string;
    disclaimer: string;
    contact: string;
    signIn: string;
    signOut: string;
    selectRegion: string;
    comingSoon: string;
    spainComingSoon: string;
    ukActive: string;
  };
  hero: {
    badge: string;
    titlePrefix: string;
    titleHighlight: string;
    titleSuffix: string;
    subtitle: string;
    ctaStart: string;
    ctaExplore: string;
    liveInUk: string;
    spainLaunchingSoon: string;
  };
  features: {
    title: string;
    subtitle: string;
    bridgeTitle: string;
    bridgeDesc: string;
    pensionTitle: string;
    pensionDesc: string;
    statePensionTitle: string;
    statePensionDesc: string;
    monteCarloTitle: string;
    monteCarloDesc: string;
  };
  quiz: {
    stepLabel: string;
    next: string;
    back: string;
    finish: string;
    skip: string;
    currentAgeTitle: string;
    retireAgeTitle: string;
    targetIncomeTitle: string;
    currentSavingsTitle: string;
    monthlySavingsTitle: string;
    seeMyPlan: string;
  };
  finances: {
    title: string;
    subtitle: string;
    savePlan: string;
    saved: string;
    export: string;
    importAi: string;
  };
  dashboard: {
    fireNumber: string;
    netWorth: string;
    bridgeDuration: string;
    confidenceScore: string;
    coastFire: string;
    timelineTitle: string;
    incomeSafetyTitle: string;
  };
  comingSoon: {
    badge: string;
    title: string;
    description: string;
    note: string;
    button: string;
  };
  legal: {
    analyticsNoticeTitle: string;
    analyticsNoticeDesc: string;
    disclaimerTitle: string;
    disclaimerBody: string;
  };
  errors: {
    generic: string;
    invalidNumber: string;
    planSaveFailed: string;
  };
}
