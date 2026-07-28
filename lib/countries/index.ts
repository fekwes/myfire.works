import { CountryPack } from "./types";
import { ukPack } from "./uk";
import { usPack } from "./us";
import { esPack } from "./es";
import { isCountryEnabled as isEnabled } from "../config/feature-flags";

export const PACKS: Record<string, CountryPack> = {
  uk: ukPack,
  es: esPack,
  us: usPack,
};

export function getPack(region: "uk" | "es" | "us" | string): CountryPack {
  return PACKS[region] ?? ukPack;
}

export function isCountryEnabled(region: string): boolean {
  return isEnabled(region);
}
