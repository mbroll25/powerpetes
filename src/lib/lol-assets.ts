export type LolRole = "TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT";

const roleIconSrcByRole: Record<LolRole, string> = {
  TOP: "/lol/roles/top.png",
  JUNGLE: "/lol/roles/jungle.png",
  MID: "/lol/roles/mid.png",
  ADC: "/lol/roles/adc.png",
  SUPPORT: "/lol/roles/support.png",
};

const rankEmblemSrcByTier: Record<string, string> = {
  IRON: "/lol/ranks/iron.png",
  BRONZE: "/lol/ranks/bronze.png",
  SILVER: "/lol/ranks/silver.png",
  GOLD: "/lol/ranks/gold.png",
  PLATINUM: "/lol/ranks/platinum.png",
  EMERALD: "/lol/ranks/emerald.png",
  DIAMOND: "/lol/ranks/diamond.png",
  MASTER: "/lol/ranks/master.png",
  GRANDMASTER: "/lol/ranks/grandmaster.png",
  CHALLENGER: "/lol/ranks/challenger.png",
};

export function getLolRoleIconSrc(role: string | null | undefined) {
  if (
    role === "TOP" ||
    role === "JUNGLE" ||
    role === "MID" ||
    role === "ADC" ||
    role === "SUPPORT"
  ) {
    return roleIconSrcByRole[role];
  }

  return null;
}

export function getLolRankEmblemSrc(tier: string | null | undefined) {
  if (!tier || tier === "UNRANKED") return null;

  return rankEmblemSrcByTier[tier] ?? null;
}