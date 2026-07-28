import { CountryPack } from "./types";
import { ukPack } from "./uk";
import { usPack } from "./us";

export const PACKS: Record<string, CountryPack> = {
  uk: ukPack,
  us: usPack,
};

export function getPack(region: "uk" | "us"): CountryPack {
  return PACKS[region] ?? ukPack;
}
