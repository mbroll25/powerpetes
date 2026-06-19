export type Role = "TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT";

export type TeamSide = "blue" | "red";

export type ChampionPool = "small" | "medium" | "large";

export type Playstyle = "aggressive" | "balanced" | "defensive";

export type BalancePlayer = {
  id: string;
  displayName: string;

  currentTier: string | null;
  currentDivision: string | null;
  currentLp: number | null;

  peakTier: string | null;
  peakDivision: string | null;

  primaryRole: Role | null;
  secondaryRole: Role | null;

  championPool: ChampionPool | null;
  playstyle: Playstyle | null;

  soloQueueWins: number | null;
  soloQueueLosses: number | null;

  globalRating: number | null;
  tournamentRating: number | null;

  totalMatches: number;
  totalWins: number;
  totalLosses: number;

  tournamentMatches: number;
  tournamentWins: number;
  tournamentLosses: number;

  roleRatings?: Partial<Record<Role, number>>;
};

export type AssignedPlayer = {
  player: BalancePlayer;
  assignedRole: Role;
  profileRating: number;
  effectiveRating: number;
  finalRating: number;
  rolePenalty: number;
};

export type BalancedTeam = {
  side: TeamSide;
  players: AssignedPlayer[];
  totalRating: number;
  averageRating: number;
  totalRolePenalty: number;
  averagePeakRating: number;
  averageWinrate: number;
};

export type BalanceResult = {
  blueTeam: BalancedTeam;
  redTeam: BalancedTeam;
  balanceScore: number;
  ratingDifference: number;
  blueWinProbability: number;
  redWinProbability: number;
  evaluatedCombinations: number;
  explanation: string[];
};

export type RatingUpdate = {
  userId: string;
  team: TeamSide;
  won: boolean;
  isUpsetWin: boolean;
  isUpsetLoss: boolean;
  ratingDelta: number;
  nextTournamentRating: number;
  nextGlobalRating: number;
};

const ROLES: Role[] = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

const TIER_BASE_RATING: Record<string, number> = {
  UNRANKED: 900,
  IRON: 800,
  BRONZE: 900,
  SILVER: 1000,
  GOLD: 1125,
  PLATINUM: 1250,
  EMERALD: 1375,
  DIAMOND: 1525,
  MASTER: 1700,
  GRANDMASTER: 1850,
  CHALLENGER: 2000,
};

const DIVISION_BONUS: Record<string, number> = {
  IV: 0,
  III: 28,
  II: 56,
  I: 84,
  NONE: 0,
};

const CHAMPION_POOL_FLEX_BONUS: Record<ChampionPool, number> = {
  small: -10,
  medium: 0,
  large: 10,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getTierBaseRating(tier: string | null) {
  if (!tier) return TIER_BASE_RATING.UNRANKED;

  return TIER_BASE_RATING[tier] ?? TIER_BASE_RATING.UNRANKED;
}

function getDivisionBonus(division: string | null) {
  if (!division) return 0;

  return DIVISION_BONUS[division] ?? 0;
}

function getLpBonus(lp: number | null) {
  if (lp == null) return 0;

  return clamp(lp, 0, 100) * 0.25;
}

function calculateTierRating(
  tier: string | null,
  division: string | null,
  lp: number | null = 0,
) {
  return getTierBaseRating(tier) + getDivisionBonus(division) + getLpBonus(lp);
}

function getSoloQueueWinrate(player: BalancePlayer) {
  const wins = player.soloQueueWins ?? 0;
  const losses = player.soloQueueLosses ?? 0;
  const total = wins + losses;

  if (total < 20) return null;

  return wins / total;
}

function getHistoricalWinrate(player: BalancePlayer) {
  const total = player.totalWins + player.totalLosses;

  if (total > 0) {
    return (player.totalWins / total) * 100;
  }

  const soloQueueWinrate = getSoloQueueWinrate(player);

  if (soloQueueWinrate != null) {
    return soloQueueWinrate * 100;
  }

  return 50;
}

export function calculateProfileRating(player: BalancePlayer) {
  const currentRating = calculateTierRating(
    player.currentTier,
    player.currentDivision,
    player.currentLp,
  );

  const peakRating = calculateTierRating(
    player.peakTier,
    player.peakDivision,
    0,
  );

  const peakDifference = Math.max(0, peakRating - currentRating);
  const peakBonus = clamp(peakDifference * 0.25, 0, 90);

  const soloQueueWinrate = getSoloQueueWinrate(player);
  const soloQueueBonus =
    soloQueueWinrate == null
      ? 0
      : clamp((soloQueueWinrate - 0.5) * 220, -60, 60);

  const championPoolBonus = player.championPool
    ? CHAMPION_POOL_FLEX_BONUS[player.championPool]
    : 0;

  return round(currentRating + peakBonus + soloQueueBonus + championPoolBonus);
}

export function calculateEffectiveRating(player: BalancePlayer) {
  const profileRating = calculateProfileRating(player);

  const globalRating = player.globalRating ?? profileRating;
  const tournamentRating = player.tournamentRating ?? globalRating;

  const historyWeight = clamp(player.totalMatches / 40, 0, 0.5);
  const tournamentWeight = clamp(player.tournamentMatches / 20, 0, 0.35);
  const profileWeight = clamp(1 - historyWeight - tournamentWeight, 0.2, 1);

  const totalWeight = profileWeight + historyWeight + tournamentWeight;

  return round(
    (profileRating * profileWeight +
      globalRating * historyWeight +
      tournamentRating * tournamentWeight) /
      totalWeight,
  );
}

function calculateRolePenalty(player: BalancePlayer, assignedRole: Role) {
  if (player.primaryRole === assignedRole) {
    return 0;
  }

  if (player.secondaryRole === assignedRole) {
    return player.championPool === "large" ? 25 : 35;
  }

  const offRoleBasePenalty = 90;

  const championPoolModifier =
    player.championPool === "large"
      ? -20
      : player.championPool === "small"
        ? 20
        : 0;

  return clamp(offRoleBasePenalty + championPoolModifier, 60, 120);
}

function calculateRoleRatingAdjustment(
  player: BalancePlayer,
  assignedRole: Role,
) {
  const roleRating = player.roleRatings?.[assignedRole];

  if (roleRating == null) {
    return 0;
  }

  const referenceRating =
    player.globalRating ??
    player.tournamentRating ??
    calculateProfileRating(player);

  return clamp((roleRating - referenceRating) * 0.35, -70, 70);
}

function assignPlayerToRole(
  player: BalancePlayer,
  assignedRole: Role,
): AssignedPlayer {
  const profileRating = calculateProfileRating(player);
  const effectiveRating = calculateEffectiveRating(player);
  const rolePenalty = calculateRolePenalty(player, assignedRole);
  const roleAdjustment = calculateRoleRatingAdjustment(player, assignedRole);

  const finalRating = round(effectiveRating - rolePenalty + roleAdjustment);

  return {
    player,
    assignedRole,
    profileRating,
    effectiveRating,
    finalRating,
    rolePenalty,
  };
}

function getPermutations<T>(items: T[]) {
  if (items.length <= 1) return [items];

  const permutations: T[][] = [];

  items.forEach((item, index) => {
    const remainingItems = items.filter((_, remainingIndex) => {
      return remainingIndex !== index;
    });

    getPermutations(remainingItems).forEach((permutation) => {
      permutations.push([item, ...permutation]);
    });
  });

  return permutations;
}

const ROLE_PERMUTATIONS = getPermutations(ROLES);

function buildBestTeam(side: TeamSide, players: BalancePlayer[]): BalancedTeam {
  let bestPlayers: AssignedPlayer[] = [];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const rolePermutation of ROLE_PERMUTATIONS) {
    const assignedPlayers = players.map((player, index) => {
      const assignedRole = rolePermutation[index];

      if (!assignedRole) {
        throw new Error("Invalid role permutation.");
      }

      return assignPlayerToRole(player, assignedRole);
    });

    const totalRating = assignedPlayers.reduce((sum, assignedPlayer) => {
      return sum + assignedPlayer.finalRating;
    }, 0);

    const totalRolePenalty = assignedPlayers.reduce((sum, assignedPlayer) => {
      return sum + assignedPlayer.rolePenalty;
    }, 0);

    const score = totalRating - totalRolePenalty * 0.65;

    if (score > bestScore) {
      bestScore = score;
      bestPlayers = assignedPlayers;
    }
  }

  if (bestPlayers.length !== 5) {
    throw new Error("Could not assign team roles correctly.");
  }

  const totalRating = bestPlayers.reduce((sum, assignedPlayer) => {
    return sum + assignedPlayer.finalRating;
  }, 0);

  const totalRolePenalty = bestPlayers.reduce((sum, assignedPlayer) => {
    return sum + assignedPlayer.rolePenalty;
  }, 0);

  const averagePeakRating =
    bestPlayers.reduce((sum, assignedPlayer) => {
      return (
        sum +
        calculateTierRating(
          assignedPlayer.player.peakTier,
          assignedPlayer.player.peakDivision,
          0,
        )
      );
    }, 0) / bestPlayers.length;

  const averageWinrate =
    bestPlayers.reduce((sum, assignedPlayer) => {
      return sum + getHistoricalWinrate(assignedPlayer.player);
    }, 0) / bestPlayers.length;

  return {
    side,
    players: bestPlayers.sort((a, b) => {
      return ROLES.indexOf(a.assignedRole) - ROLES.indexOf(b.assignedRole);
    }),
    totalRating: round(totalRating),
    averageRating: round(totalRating / bestPlayers.length),
    totalRolePenalty,
    averagePeakRating: round(averagePeakRating),
    averageWinrate: round(averageWinrate),
  };
}

function getCombinations<T>(items: T[], size: number) {
  const combinations: T[][] = [];

  function buildCombination(startIndex: number, currentCombination: T[]) {
    if (currentCombination.length === size) {
      combinations.push([...currentCombination]);
      return;
    }

    for (let index = startIndex; index < items.length; index += 1) {
      currentCombination.push(items[index]);
      buildCombination(index + 1, currentCombination);
      currentCombination.pop();
    }
  }

  buildCombination(0, []);

  return combinations;
}

function calculateWinProbability(teamRating: number, opponentRating: number) {
  return 1 / (1 + 10 ** ((opponentRating - teamRating) / 400));
}

function evaluateTeams(blueTeam: BalancedTeam, redTeam: BalancedTeam) {
  const ratingDifference = Math.abs(blueTeam.totalRating - redTeam.totalRating);
  const rolePenaltyTotal = blueTeam.totalRolePenalty + redTeam.totalRolePenalty;

  const peakDifference = Math.abs(
    blueTeam.averagePeakRating - redTeam.averagePeakRating,
  );

  const winrateDifference = Math.abs(
    blueTeam.averageWinrate - redTeam.averageWinrate,
  );

  const blueWinProbability = calculateWinProbability(
    blueTeam.totalRating,
    redTeam.totalRating,
  );

  const probabilityDeviation = Math.abs(0.5 - blueWinProbability) * 100;

  const balanceScore = clamp(
    100 -
      ratingDifference * 0.08 -
      rolePenaltyTotal * 0.05 -
      peakDifference * 0.025 -
      winrateDifference * 0.4 -
      probabilityDeviation * 0.65,
    0,
    100,
  );

  return {
    balanceScore: round(balanceScore),
    ratingDifference: round(ratingDifference),
    blueWinProbability: round(blueWinProbability * 100),
    redWinProbability: round((1 - blueWinProbability) * 100),
  };
}

function buildExplanation(result: Omit<BalanceResult, "explanation">) {
  const explanations: string[] = [];

  explanations.push(
    `Se evaluaron ${result.evaluatedCombinations} divisiones únicas de equipos y asignaciones de roles.`,
  );

  explanations.push(
    `La diferencia final de rating entre equipos es de ${Math.round(
      result.ratingDifference,
    )} puntos.`,
  );

  const totalRolePenalty =
    result.blueTeam.totalRolePenalty + result.redTeam.totalRolePenalty;

  if (totalRolePenalty === 0) {
    explanations.push(
      "Todos los jugadores quedaron ubicados en roles principales o cómodos.",
    );
  } else {
    explanations.push(
      `El sistema aceptó una penalización total de roles de ${Math.round(
        totalRolePenalty,
      )} puntos para mantener un mejor balance general.`,
    );
  }

  const probabilityGap = Math.abs(
    result.blueWinProbability - result.redWinProbability,
  );

  if (probabilityGap <= 8) {
    explanations.push(
      "La probabilidad estimada de victoria quedó bastante pareja entre ambos equipos.",
    );
  } else {
    explanations.push(
      "El sistema priorizó el mejor balance disponible, aunque todavía existe una diferencia moderada de probabilidad entre equipos.",
    );
  }

  return explanations;
}

export function generateBalancedTeams(players: BalancePlayer[]): BalanceResult {
  if (players.length !== 10) {
    throw new Error("generateBalancedTeams requires exactly 10 players.");
  }

  const [firstPlayer, ...remainingPlayers] = players as [
    BalancePlayer,
    ...BalancePlayer[],
  ];

  const blueCombinations = getCombinations(remainingPlayers, 4).map(
    (combination) => [firstPlayer, ...combination],
  );

  let bestResult: Omit<BalanceResult, "explanation"> | null = null;

  for (const bluePlayers of blueCombinations) {
    const bluePlayerIds = new Set(bluePlayers.map((player) => player.id));

    const redPlayers = players.filter((player) => {
      return !bluePlayerIds.has(player.id);
    });

    const blueTeam = buildBestTeam("blue", bluePlayers);
    const redTeam = buildBestTeam("red", redPlayers);

    const evaluation = evaluateTeams(blueTeam, redTeam);

    if (!bestResult || evaluation.balanceScore > bestResult.balanceScore) {
      bestResult = {
        blueTeam,
        redTeam,
        balanceScore: evaluation.balanceScore,
        ratingDifference: evaluation.ratingDifference,
        blueWinProbability: evaluation.blueWinProbability,
        redWinProbability: evaluation.redWinProbability,
        evaluatedCombinations: blueCombinations.length,
      };
    }
  }

  if (!bestResult) {
    throw new Error("Could not generate balanced teams.");
  }

  return {
    ...bestResult,
    explanation: buildExplanation(bestResult),
  };
}

export function updateRatingsAfterMatch(
  result: BalanceResult,
  winnerTeam: TeamSide,
): RatingUpdate[] {
  const blueWon = winnerTeam === "blue";

  const expectedBlue = result.blueWinProbability / 100;
  const expectedRed = result.redWinProbability / 100;

  const blueWasUnderdog = result.blueWinProbability <= 35;
  const redWasUnderdog = result.redWinProbability <= 35;

  const kFactor = 28;

  const blueDelta = kFactor * ((blueWon ? 1 : 0) - expectedBlue);
  const redDelta = kFactor * ((blueWon ? 0 : 1) - expectedRed);

  const blueUpdates = result.blueTeam.players.map((assignedPlayer) => {
    return buildRatingUpdate({
      assignedPlayer,
      team: "blue",
      won: blueWon,
      rawDelta: blueDelta,
      isUpsetWin: blueWon && blueWasUnderdog,
      isUpsetLoss:
        !blueWon && !redWasUnderdog && result.blueWinProbability >= 65,
    });
  });

  const redUpdates = result.redTeam.players.map((assignedPlayer) => {
    return buildRatingUpdate({
      assignedPlayer,
      team: "red",
      won: !blueWon,
      rawDelta: redDelta,
      isUpsetWin: !blueWon && redWasUnderdog,
      isUpsetLoss:
        blueWon && !blueWasUnderdog && result.redWinProbability >= 65,
    });
  });

  return [...blueUpdates, ...redUpdates];
}

function buildRatingUpdate({
  assignedPlayer,
  team,
  won,
  rawDelta,
  isUpsetWin,
  isUpsetLoss,
}: {
  assignedPlayer: AssignedPlayer;
  team: TeamSide;
  won: boolean;
  rawDelta: number;
  isUpsetWin: boolean;
  isUpsetLoss: boolean;
}): RatingUpdate {
  const player = assignedPlayer.player;

  const offRoleModifier =
    assignedPlayer.rolePenalty >= 80 ? (won ? 1.08 : 0.9) : 1;

  const upsetModifier = isUpsetWin ? 1.18 : 1;

  const ratingDelta = clamp(
    rawDelta * offRoleModifier * upsetModifier,
    -35,
    35,
  );

  const previousTournamentRating =
    player.tournamentRating ?? assignedPlayer.effectiveRating;

  const previousGlobalRating =
    player.globalRating ?? assignedPlayer.effectiveRating;

  return {
    userId: player.id,
    team,
    won,
    isUpsetWin,
    isUpsetLoss,
    ratingDelta: round(ratingDelta),
    nextTournamentRating: round(previousTournamentRating + ratingDelta),
    nextGlobalRating: round(previousGlobalRating + ratingDelta * 0.55),
  };
}
