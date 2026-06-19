import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const botPassword = process.env.TEST_BOT_PASSWORD ?? "BotTest123!";
const botCount = Number(process.env.TEST_BOT_COUNT ?? 9);

const roles = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];
const secondaryRoles = ["JUNGLE", "MID", "ADC", "SUPPORT", "TOP"];

const botPresets = Array.from({ length: botCount }, (_, index) => {
  const number = index + 1;
  const role = roles[index % roles.length];
  const secondaryRole = secondaryRoles[index % secondaryRoles.length];
  const rating = 900 + number * 35;

  return {
    email: `bot${number}@riftbalance.test`,
    firstName: "Bot",
    lastName: `Test ${number}`,
    lolNick: `BotRift${number}`,
    lolTagline: "TEST",
    currentTier:
      number <= 2
        ? "BRONZE"
        : number <= 5
          ? "SILVER"
          : number <= 8
            ? "GOLD"
            : "PLATINUM",
    currentDivision:
      number % 4 === 0
        ? "I"
        : number % 4 === 1
          ? "II"
          : number % 4 === 2
            ? "III"
            : "IV",
    currentLp: 20 + number * 7,
    peakTier: number <= 5 ? "GOLD" : "PLATINUM",
    peakDivision: "II",
    primaryRole: role,
    secondaryRole,
    championPool:
      number % 3 === 0 ? "large" : number % 2 === 0 ? "medium" : "small",
    playstyle:
      number % 3 === 0
        ? "aggressive"
        : number % 3 === 1
          ? "balanced"
          : "defensive",
    soloQueueWins: 30 + number * 4,
    soloQueueLosses: 28 + number * 3,
    rating,
  };
});

async function getActiveTournament() {
  const { data, error } = await supabase
    .from("tournaments")
    .select("id, name")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getExistingBotProfile(lolNick) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("lol_nick", lolNick)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function createOrFindBotUser(bot) {
  const existingProfile = await getExistingBotProfile(bot.lolNick);

  if (existingProfile?.id) {
    return existingProfile.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: bot.email,
    password: botPassword,
    email_confirm: true,
    user_metadata: {
      test_bot: true,
      lol_nick: bot.lolNick,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.user?.id) {
    throw new Error(`No se pudo crear el usuario bot ${bot.email}.`);
  }

  return data.user.id;
}

async function seedBot(bot, tournamentId) {
  const userId = await createOrFindBotUser(bot);

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      first_name: bot.firstName,
      last_name: bot.lastName,
      profile_completed: true,
      lol_nick: bot.lolNick,
      lol_tagline: bot.lolTagline,
      current_tier: bot.currentTier,
      current_division: bot.currentDivision,
      current_lp: bot.currentLp,
      peak_tier: bot.peakTier,
      peak_division: bot.peakDivision,
      primary_role: bot.primaryRole,
      secondary_role: bot.secondaryRole,
      champion_pool: bot.championPool,
      playstyle: bot.playstyle,
      solo_queue_wins: bot.soloQueueWins,
      solo_queue_losses: bot.soloQueueLosses,
      riot_verified_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    },
  );

  if (profileError) {
    throw profileError;
  }

  const { error: statsError } = await supabase
    .from("player_balance_stats")
    .upsert(
      {
        user_id: userId,
        global_rating: bot.rating,
        total_matches: 0,
        total_wins: 0,
        total_losses: 0,
        top_rating: bot.primaryRole === "TOP" ? bot.rating + 45 : bot.rating,
        jungle_rating:
          bot.primaryRole === "JUNGLE" ? bot.rating + 45 : bot.rating,
        mid_rating: bot.primaryRole === "MID" ? bot.rating + 45 : bot.rating,
        adc_rating: bot.primaryRole === "ADC" ? bot.rating + 45 : bot.rating,
        support_rating:
          bot.primaryRole === "SUPPORT" ? bot.rating + 45 : bot.rating,
      },
      {
        onConflict: "user_id",
      },
    );

  if (statsError) {
    throw statsError;
  }

  const { error: tournamentPlayerError } = await supabase
    .from("tournament_players")
    .upsert(
      {
        tournament_id: tournamentId,
        user_id: userId,
        initial_rating: bot.rating,
        current_rating: bot.rating,
        matches_played: 0,
        wins: 0,
        losses: 0,
        upset_wins: 0,
        upset_losses: 0,
      },
      {
        onConflict: "tournament_id,user_id",
      },
    );

  if (tournamentPlayerError) {
    throw tournamentPlayerError;
  }

  console.log(`Bot listo: ${bot.lolNick}#${bot.lolTagline}`);
}

async function main() {
  const activeTournament = await getActiveTournament();

  if (!activeTournament) {
    console.log(
      "No hay torneo activo. Creá un torneo desde el dashboard primero.",
    );
    return;
  }

  console.log(`Torneo activo: ${activeTournament.name}`);
  console.log(`Creando ${botCount} bots de prueba...`);

  for (const bot of botPresets) {
    await seedBot(bot, activeTournament.id);
  }

  console.log("Bots de prueba creados correctamente.");
  console.log("Ahora podés seleccionar tu usuario real + 9 bots para probar.");
}

main().catch((error) => {
  console.error("Error creando bots de prueba:");
  console.error(error);
  process.exit(1);
});
