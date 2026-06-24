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
  forbiddenRole: Role | null;

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
  averageInternalMatches: number;
};

export type RoleMatchupImpact = "low" | "medium" | "high";

export type RoleMatchup = {
  role: Role;
  bluePlayerName: string;
  redPlayerName: string;
  blueRating: number;
  redRating: number;
  difference: number;
  weightedDifference: number;
  favoredTeam: TeamSide | "even";
  impact: RoleMatchupImpact;
};

export type BalanceResult = {
  blueTeam: BalancedTeam;
  redTeam: BalancedTeam;
  balanceScore: number;
  ratingDifference: number;
  totalRoleMismatch: number;
  roleMatchups: RoleMatchup[];
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

export const POWERPETES_BALANCE_RULES = [
  "PowerPetes usa los datos de Riot como punto de partida para jugadores nuevos o con poco historial interno.",
  "A medida que un jugador acumula partidas dentro de PowerPetes, el historial interno pasa a tener más peso que Riot.",
  "El sistema no mira solo el rating total: también compara Top contra Top, Jungla contra Jungla, Mid contra Mid, ADC contra ADC y Soporte contra Soporte.",
  "Jugar en rol principal no tiene penalización. Jugar en rol secundario tiene una penalización leve. Jugar fuera de rol tiene una penalización mayor.",
  "La línea prohibida de cada jugador es una restricción absoluta: el sistema nunca debe asignar esa línea.",
  "El sistema intenta que ambos equipos tengan una probabilidad de victoria lo más cercana posible al 50%.",
  "Después de cada partida cerrada, PowerPetes actualiza el rating interno según el resultado y la dificultad del enfrentamiento.",
] as const;

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

const ROLE_IMPORTANCE_WEIGHT: Record<Role, number> = {
  TOP: 1,
  JUNGLE: 1.25,
  MID: 1.15,
  ADC: 1.1,
  SUPPORT: 0.9,
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

function formatRole(role: Role) {
  const labels: Record<Role, string> = {
    TOP: "Top",
    JUNGLE: "Jungla",
    MID: "Mid",
    ADC: "ADC",
    SUPPORT: "Soporte",
  };

  return labels[role];
}

function formatTeam(side: TeamSide) {
  return side === "blue" ? "Equipo Azul" : "Equipo Rojo";
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

function getInternalExperienceLabel(averageInternalMatches: number) {
  if (averageInternalMatches < 5) {
    return "poco historial interno";
  }

  if (averageInternalMatches < 20) {
    return "historial interno en crecimiento";
  }

  return "historial interno sólido";
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

  const hasGlobalHistory =
    player.totalMatches > 0 && player.globalRating != null;

  const hasTournamentHistory =
    player.tournamentMatches > 0 && player.tournamentRating != null;

  const historyWeight = hasGlobalHistory
    ? clamp(player.totalMatches / 30, 0, 0.72)
    : 0;

  const tournamentWeight = hasTournamentHistory
    ? clamp(player.tournamentMatches / 18, 0, 0.25)
    : 0;

  const profileWeight = clamp(1 - historyWeight - tournamentWeight, 0.08, 1);

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

function isForbiddenRoleAssignment(player: BalancePlayer, assignedRole: Role) {
  return player.forbiddenRole === assignedRole;
}

function assignPlayerToRole(
  player: BalancePlayer,
  assignedRole: Role,
): AssignedPlayer {
  if (isForbiddenRoleAssignment(player, assignedRole)) {
    throw new Error(
      `${player.displayName} no puede ser asignado a ${formatRole(
        assignedRole,
      )} porque es su línea prohibida.`,
    );
  }

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

function buildTeamFromAssignment(
  side: TeamSide,
  assignedPlayers: AssignedPlayer[],
): BalancedTeam {
  if (assignedPlayers.length !== 5) {
    throw new Error("A balanced team must have exactly 5 players.");
  }

  const totalRating = assignedPlayers.reduce((sum, assignedPlayer) => {
    return sum + assignedPlayer.finalRating;
  }, 0);

  const totalRolePenalty = assignedPlayers.reduce((sum, assignedPlayer) => {
    return sum + assignedPlayer.rolePenalty;
  }, 0);

  const averagePeakRating =
    assignedPlayers.reduce((sum, assignedPlayer) => {
      return (
        sum +
        calculateTierRating(
          assignedPlayer.player.peakTier,
          assignedPlayer.player.peakDivision,
          0,
        )
      );
    }, 0) / assignedPlayers.length;

  const averageWinrate =
    assignedPlayers.reduce((sum, assignedPlayer) => {
      return sum + getHistoricalWinrate(assignedPlayer.player);
    }, 0) / assignedPlayers.length;

  const averageInternalMatches =
    assignedPlayers.reduce((sum, assignedPlayer) => {
      return sum + assignedPlayer.player.totalMatches;
    }, 0) / assignedPlayers.length;

  return {
    side,
    players: assignedPlayers.slice().sort((a, b) => {
      return ROLES.indexOf(a.assignedRole) - ROLES.indexOf(b.assignedRole);
    }),
    totalRating: round(totalRating),
    averageRating: round(totalRating / assignedPlayers.length),
    totalRolePenalty: round(totalRolePenalty),
    averagePeakRating: round(averagePeakRating),
    averageWinrate: round(averageWinrate),
    averageInternalMatches: round(averageInternalMatches),
  };
}

function buildTeamRoleCandidates(
  side: TeamSide,
  players: BalancePlayer[],
): BalancedTeam[] {
  return ROLE_PERMUTATIONS.flatMap((rolePermutation) => {
    const hasForbiddenAssignment = players.some((player, index) => {
      const assignedRole = rolePermutation[index];

      if (!assignedRole) {
        throw new Error("Invalid role permutation.");
      }

      return isForbiddenRoleAssignment(player, assignedRole);
    });

    if (hasForbiddenAssignment) {
      return [];
    }

    const assignedPlayers = players.map((player, index) => {
      const assignedRole = rolePermutation[index];

      if (!assignedRole) {
        throw new Error("Invalid role permutation.");
      }

      return assignPlayerToRole(player, assignedRole);
    });

    return [buildTeamFromAssignment(side, assignedPlayers)];
  });
}

function getCombinations<T>(items: T[], size: number) {
  const combinations: T[][] = [];

  function buildCombination(startIndex: number, currentCombination: T[]) {
    if (currentCombination.length === size) {
      combinations.push([...currentCombination]);
      return;
    }

    for (let index = startIndex; index < items.length; index += 1) {
      const item = items[index];

      if (item === undefined) {
        continue;
      }

      currentCombination.push(item);
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

function getRoleImpact(difference: number): RoleMatchupImpact {
  if (difference >= 180) return "high";
  if (difference >= 95) return "medium";
  return "low";
}

function calculateRoleMatchups(blueTeam: BalancedTeam, redTeam: BalancedTeam) {
  const matchups = ROLES.map((role) => {
    const bluePlayer = blueTeam.players.find((player) => {
      return player.assignedRole === role;
    });

    const redPlayer = redTeam.players.find((player) => {
      return player.assignedRole === role;
    });

    if (!bluePlayer || !redPlayer) {
      throw new Error(`Missing role assignment for ${role}.`);
    }

    const rawDifference = bluePlayer.finalRating - redPlayer.finalRating;
    const difference = Math.abs(rawDifference);

    const favoredTeam: TeamSide | "even" =
      difference < 25 ? "even" : rawDifference > 0 ? "blue" : "red";

    return {
      role,
      bluePlayerName: bluePlayer.player.displayName,
      redPlayerName: redPlayer.player.displayName,
      blueRating: round(bluePlayer.finalRating),
      redRating: round(redPlayer.finalRating),
      difference: round(difference),
      weightedDifference: round(difference * ROLE_IMPORTANCE_WEIGHT[role]),
      favoredTeam,
      impact: getRoleImpact(difference),
    };
  });

  const totalRoleMismatch = matchups.reduce((sum, matchup) => {
    return sum + matchup.weightedDifference;
  }, 0);

  return {
    matchups,
    totalRoleMismatch: round(totalRoleMismatch),
  };
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

  const { matchups, totalRoleMismatch } = calculateRoleMatchups(
    blueTeam,
    redTeam,
  );

  const balanceScore = clamp(
    100 -
      ratingDifference * 0.065 -
      totalRoleMismatch * 0.055 -
      rolePenaltyTotal * 0.045 -
      peakDifference * 0.018 -
      winrateDifference * 0.35 -
      probabilityDeviation * 0.6,
    0,
    100,
  );

  return {
    balanceScore: round(balanceScore),
    ratingDifference: round(ratingDifference),
    totalRoleMismatch: round(totalRoleMismatch),
    roleMatchups: matchups,
    blueWinProbability: round(blueWinProbability * 100),
    redWinProbability: round((1 - blueWinProbability) * 100),
  };
}

function getTotalRolePenalty(result: Omit<BalanceResult, "explanation">) {
  return result.blueTeam.totalRolePenalty + result.redTeam.totalRolePenalty;
}

function getBiggestRoleMismatch(roleMatchups: RoleMatchup[]) {
  return roleMatchups
    .slice()
    .sort((a, b) => b.weightedDifference - a.weightedDifference)[0];
}

function isBetterResult(
  candidate: Omit<BalanceResult, "explanation">,
  current: Omit<BalanceResult, "explanation"> | null,
) {
  if (!current) return true;

  if (candidate.balanceScore !== current.balanceScore) {
    return candidate.balanceScore > current.balanceScore;
  }

  if (candidate.ratingDifference !== current.ratingDifference) {
    return candidate.ratingDifference < current.ratingDifference;
  }

  if (candidate.totalRoleMismatch !== current.totalRoleMismatch) {
    return candidate.totalRoleMismatch < current.totalRoleMismatch;
  }

  return getTotalRolePenalty(candidate) < getTotalRolePenalty(current);
}

function buildExplanation(result: Omit<BalanceResult, "explanation">) {
  const explanations: string[] = [];

  const totalRolePenalty = getTotalRolePenalty(result);
  const probabilityGap = Math.abs(
    result.blueWinProbability - result.redWinProbability,
  );

  const averageInternalMatches = round(
    (result.blueTeam.averageInternalMatches +
      result.redTeam.averageInternalMatches) /
      2,
  );

  const internalExperienceLabel = getInternalExperienceLabel(
    averageInternalMatches,
  );

  const biggestMismatch = getBiggestRoleMismatch(result.roleMatchups);

  explanations.push(
    `PowerPetes analizó ${result.evaluatedCombinations.toLocaleString(
      "es-AR",
    )} escenarios posibles entre divisiones de equipos y asignaciones de roles.`,
  );

  explanations.push(
    "Se descartaron automáticamente todas las asignaciones que enviaban a un jugador a su línea prohibida.",
  );

  explanations.push(
    `El score de balance final fue ${result.balanceScore}/100. Cuanto más cerca de 100, más pareja debería sentirse la partida.`,
  );

  explanations.push(
    `La diferencia total de rating entre equipos quedó en ${Math.round(
      result.ratingDifference,
    )} puntos: ${formatTeam("blue")} ${Math.round(
      result.blueTeam.totalRating,
    )} vs ${formatTeam("red")} ${Math.round(result.redTeam.totalRating)}.`,
  );

  explanations.push(
    `La probabilidad estimada de victoria quedó en ${result.blueWinProbability}% para ${formatTeam(
      "blue",
    )} y ${result.redWinProbability}% para ${formatTeam("red")}.`,
  );

  explanations.push(
    "Además del rating total, el sistema comparó línea por línea: Top, Jungla, Mid, ADC y Soporte. Esto evita que dos equipos parezcan parejos en total pero estén rotos por una línea demasiado desbalanceada.",
  );

  if (biggestMismatch) {
    if (biggestMismatch.favoredTeam === "even") {
      explanations.push(
        `La línea más pareja fue ${formatRole(
          biggestMismatch.role,
        )}, con una diferencia de solo ${Math.round(
          biggestMismatch.difference,
        )} puntos.`,
      );
    } else {
      explanations.push(
        `La mayor diferencia individual quedó en ${formatRole(
          biggestMismatch.role,
        )}: ventaja para ${formatTeam(
          biggestMismatch.favoredTeam,
        )} por ${Math.round(biggestMismatch.difference)} puntos.`,
      );
    }
  }

  if (totalRolePenalty === 0) {
    explanations.push(
      "Todos los jugadores quedaron ubicados en roles principales o roles cómodos, sin penalización relevante por fuera de rol.",
    );
  } else {
    explanations.push(
      `El sistema aplicó una penalización total de ${Math.round(
        totalRolePenalty,
      )} puntos por roles no ideales. Esta penalización evita sobrevalorar a un jugador cuando queda fuera de su rol principal.`,
    );
  }

  if (averageInternalMatches < 5) {
    explanations.push(
      `Como este lobby todavía tiene ${internalExperienceLabel}, PowerPetes usa más los datos iniciales de Riot, peak elo, SoloQ y perfil del jugador para estimar fuerza inicial.`,
    );
  } else if (averageInternalMatches < 20) {
    explanations.push(
      `Como este lobby ya tiene ${internalExperienceLabel}, PowerPetes mezcla datos externos con resultados internos para ajustar mejor el nivel real de cada jugador.`,
    );
  } else {
    explanations.push(
      `Como este lobby ya tiene ${internalExperienceLabel}, PowerPetes prioriza el rendimiento interno por encima de Riot. El historial real jugado en PowerPetes pasa a ser la fuente principal.`,
    );
  }

  if (probabilityGap <= 8) {
    explanations.push(
      "La diferencia de probabilidad entre equipos quedó baja, por lo que el sistema considera que la partida debería ser competitiva.",
    );
  } else {
    explanations.push(
      "La diferencia de probabilidad todavía es moderada. PowerPetes eligió el mejor balance disponible entre los 10 jugadores seleccionados, pero el lobby no es perfectamente simétrico.",
    );
  }

  explanations.push(
    "Después de cerrar la partida, el resultado real actualiza el rating interno. Ganar contra un equipo favorito suma más, perder contra un equipo favorito castiga menos, y con el tiempo PowerPetes aprende mejor el nivel real de cada jugador.",
  );

  return explanations;
}

export function generateBalancedTeams(players: BalancePlayer[]): BalanceResult {
  if (players.length !== 10) {
    throw new Error("generateBalancedTeams requires exactly 10 players.");
  }

  const playersWithoutForbiddenRole = players.filter((player) => {
    return !player.forbiddenRole;
  });

  if (playersWithoutForbiddenRole.length > 0) {
    throw new Error(
      `No se puede generar la partida. Falta configurar la línea prohibida de: ${playersWithoutForbiddenRole
        .map((player) => player.displayName)
        .join(", ")}.`,
    );
  }

  const [firstPlayer, ...remainingPlayers] = players as [
    BalancePlayer,
    ...BalancePlayer[],
  ];

  const blueCombinations = getCombinations(remainingPlayers, 4).map(
    (combination) => [firstPlayer, ...combination],
  );

  let bestResult: Omit<BalanceResult, "explanation"> | null = null;
  let evaluatedScenarios = 0;

  for (const bluePlayers of blueCombinations) {
    const bluePlayerIds = new Set(bluePlayers.map((player) => player.id));

    const redPlayers = players.filter((player) => {
      return !bluePlayerIds.has(player.id);
    });

    const blueCandidates = buildTeamRoleCandidates("blue", bluePlayers);
    const redCandidates = buildTeamRoleCandidates("red", redPlayers);

    for (const blueTeam of blueCandidates) {
      for (const redTeam of redCandidates) {
        evaluatedScenarios += 1;

        const evaluation = evaluateTeams(blueTeam, redTeam);

        const candidate: Omit<BalanceResult, "explanation"> = {
          blueTeam,
          redTeam,
          balanceScore: evaluation.balanceScore,
          ratingDifference: evaluation.ratingDifference,
          totalRoleMismatch: evaluation.totalRoleMismatch,
          roleMatchups: evaluation.roleMatchups,
          blueWinProbability: evaluation.blueWinProbability,
          redWinProbability: evaluation.redWinProbability,
          evaluatedCombinations: evaluatedScenarios,
        };

        if (isBetterResult(candidate, bestResult)) {
          bestResult = candidate;
        }
      }
    }
  }

  if (!bestResult) {
    throw new Error(
      "No se pudo generar una partida respetando las líneas prohibidas de los jugadores seleccionados.",
    );
  }

  const finalResult = {
    ...bestResult,
    evaluatedCombinations: evaluatedScenarios,
  };

  return {
    ...finalResult,
    explanation: buildExplanation(finalResult),
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
