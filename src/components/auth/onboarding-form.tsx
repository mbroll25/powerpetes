"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Gamepad2,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Swords,
  Trophy,
  User,
  Users,
} from "lucide-react";

import { ChampionMultiSelect } from "@/components/auth/champion-multi-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type FormState = {
  firstName: string;
  lastName: string;
  lolNick: string;
  lolTagline: string;
  region: string;
  currentTier: string;
  currentDivision: string;
  currentLp: string;
  peakTier: string;
  peakDivision: string;
  primaryRole: string;
  secondaryRole: string;
  forbiddenRole: string;
  mainChampions: string[];
  secondaryChampions: string[];
  playstyle: string;
  championPool: string;
};

type RiotPlayerResponse = {
  account?: {
    puuid: string;
    gameName: string;
    tagLine: string;
  };
  summoner?: {
    profileIconId: number;
    profileIconUrl: string | null;
    summonerLevel: number;
  };
  rankedSolo: {
    tier: string;
    division: string;
    leaguePoints: number;
    wins: number;
    losses: number;
  } | null;
};

const FIXED_POWERPETES_REGION = "LAS";

const initialFormState: FormState = {
  firstName: "",
  lastName: "",
  lolNick: "",
  lolTagline: "",
  region: FIXED_POWERPETES_REGION,
  currentTier: "",
  currentDivision: "",
  currentLp: "",
  peakTier: "",
  peakDivision: "",
  primaryRole: "",
  secondaryRole: "",
  forbiddenRole: "",
  mainChampions: [],
  secondaryChampions: [],
  playstyle: "balanced",
  championPool: "medium",
};

const tiers = [
  { value: "UNRANKED", label: "Sin rango" },
  { value: "IRON", label: "Hierro" },
  { value: "BRONZE", label: "Bronce" },
  { value: "SILVER", label: "Plata" },
  { value: "GOLD", label: "Oro" },
  { value: "PLATINUM", label: "Platino" },
  { value: "EMERALD", label: "Esmeralda" },
  { value: "DIAMOND", label: "Diamante" },
  { value: "MASTER", label: "Maestro" },
  { value: "GRANDMASTER", label: "Gran Maestro" },
  { value: "CHALLENGER", label: "Retador" },
];

function getTierLabel(value: string) {
  return tiers.find((tier) => tier.value === value)?.label ?? value;
}

function getWinrate(wins?: number, losses?: number) {
  if (wins == null || losses == null) return null;

  const total = wins + losses;
  if (total === 0) return null;

  return Math.round((wins / total) * 100);
}

function getRankAccent(tier?: string) {
  switch (tier) {
    case "IRON":
      return "from-[#3b2d2a]/35 via-[#151414] to-[#101010]";
    case "BRONZE":
      return "from-[#5b3b2c]/35 via-[#151414] to-[#101010]";
    case "SILVER":
      return "from-[#7b8797]/35 via-[#151414] to-[#101010]";
    case "GOLD":
      return "from-[#8f7a2c]/35 via-[#151414] to-[#101010]";
    case "PLATINUM":
      return "from-[#2d6b63]/35 via-[#151414] to-[#101010]";
    case "EMERALD":
      return "from-[#1d7a56]/35 via-[#151414] to-[#101010]";
    case "DIAMOND":
      return "from-[#355c9b]/35 via-[#151414] to-[#101010]";
    case "MASTER":
      return "from-[#6c3ea1]/35 via-[#151414] to-[#101010]";
    case "GRANDMASTER":
      return "from-[#8e2c4a]/35 via-[#151414] to-[#101010]";
    case "CHALLENGER":
      return "from-[#3c7fc2]/35 via-[#151414] to-[#101010]";
    default:
      return "from-[#2a2929]/35 via-[#151414] to-[#101010]";
  }
}

function getRankShortLabel(tier?: string) {
  if (!tier || tier === "UNRANKED") return "SR";
  return getTierLabel(tier).slice(0, 2).toUpperCase();
}

const divisions = [
  { value: "IV", label: "IV" },
  { value: "III", label: "III" },
  { value: "II", label: "II" },
  { value: "I", label: "I" },
  { value: "NONE", label: "Sin división" },
];

const roles = [
  { value: "TOP", label: "Top" },
  { value: "JUNGLE", label: "Jungla" },
  { value: "MID", label: "Mid" },
  { value: "ADC", label: "ADC" },
  { value: "SUPPORT", label: "Soporte" },
];

const playstyles = [
  { value: "aggressive", label: "Agresivo" },
  { value: "balanced", label: "Balanceado" },
  { value: "defensive", label: "Defensivo" },
];

const championPools = [
  { value: "small", label: "Pocos campeones / especialista" },
  { value: "medium", label: "Variedad media" },
  { value: "large", label: "Amplia variedad / flexible" },
];

export function OnboardingForm() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [form, setForm] = useState<FormState>(initialFormState);
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [riotMessage, setRiotMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingRiot, setIsSearchingRiot] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [riotPlayerData, setRiotPlayerData] =
    useState<RiotPlayerResponse | null>(null);

  const forbiddenRoleOptions = useMemo(() => {
    return roles.filter((role) => {
      return (
        role.value !== form.primaryRole && role.value !== form.secondaryRole
      );
    });
  }, [form.primaryRole, form.secondaryRole]);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace("/login");
        return;
      }

      setUserId(data.user.id);
      setIsCheckingSession(false);
    }

    checkSession();
  }, [router, supabase]);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (
        (field === "primaryRole" || field === "secondaryRole") &&
        next.forbiddenRole &&
        (next.forbiddenRole === next.primaryRole ||
          next.forbiddenRole === next.secondaryRole)
      ) {
        next.forbiddenRole = "";
      }

      return next;
    });
  }

  function updateChampionField(
    field: "mainChampions" | "secondaryChampions",
    value: string[],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function validateForm() {
    if (!form.firstName.trim()) return "Ingresá tu nombre.";
    if (!form.lastName.trim()) return "Ingresá tu apellido.";
    if (!form.lolNick.trim()) return "Ingresá tu nick de League of Legends.";
    if (!form.lolTagline.trim())
      return "Ingresá tu tagline de Riot. Ej: LAS, 1234, LAN.";
    if (!form.currentTier) return "Seleccioná tu elo actual.";
    if (!form.currentDivision) return "Seleccioná tu división actual.";
    if (!form.peakTier) return "Seleccioná tu mejor elo alcanzado.";
    if (!form.peakDivision) return "Seleccioná tu mejor división alcanzada.";
    if (!form.primaryRole) return "Seleccioná tu rol principal.";
    if (!form.secondaryRole) return "Seleccioná tu rol secundario.";

    if (form.primaryRole === form.secondaryRole) {
      return "El rol principal y secundario no pueden ser iguales.";
    }

    if (!form.forbiddenRole) {
      return "Seleccioná tu línea prohibida.";
    }

    if (
      form.forbiddenRole === form.primaryRole ||
      form.forbiddenRole === form.secondaryRole
    ) {
      return "La línea prohibida no puede ser igual a tu rol principal ni a tu rol secundario.";
    }

    if (form.mainChampions.length < 2) {
      return "Seleccioná al menos 2 campeones principales.";
    }

    return "";
  }

  async function handleSearchRiotAccount() {
    setRiotMessage("");
    setErrorMessage("");

    if (!form.lolNick.trim() || !form.lolTagline.trim()) {
      setErrorMessage("Ingresá nick y tagline antes de buscar la cuenta.");
      return;
    }

    setIsSearchingRiot(true);

    const params = new URLSearchParams({
      gameName: form.lolNick.trim(),
      tagLine: form.lolTagline.trim(),
      region: FIXED_POWERPETES_REGION,
    });

    try {
      const response = await fetch(`/api/riot/player?${params.toString()}`);
      const payload = (await response.json()) as
        | RiotPlayerResponse
        | { error?: string };

      if (!response.ok) {
        setRiotMessage(
          "No se pudo encontrar la cuenta en Riot. Revisá nick, tagline, región o API key.",
        );
        return;
      }

      const riotPlayer = payload as RiotPlayerResponse;
      setRiotPlayerData(riotPlayer);

      setForm((current) => ({
        ...current,
        lolNick: riotPlayer.account?.gameName ?? current.lolNick,
        lolTagline: riotPlayer.account?.tagLine ?? current.lolTagline,
        currentTier: riotPlayer.rankedSolo?.tier ?? "UNRANKED",
        currentDivision: riotPlayer.rankedSolo?.division ?? "NONE",
        currentLp: riotPlayer.rankedSolo
          ? String(riotPlayer.rankedSolo.leaguePoints)
          : "",
      }));

      setRiotMessage(
        riotPlayer.rankedSolo
          ? "Cuenta encontrada. Se completó el Solo/Duo actual automáticamente."
          : "Cuenta encontrada, pero no tiene Solo/Duo actual registrado.",
      );
    } catch {
      setRiotMessage("No se pudo consultar Riot en este momento.");
    } finally {
      setIsSearchingRiot(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (!userId) {
      setErrorMessage("No se encontró la sesión del usuario.");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      lol_nick: form.lolNick.trim(),
      lol_tagline: form.lolTagline.trim(),
      region: FIXED_POWERPETES_REGION,
      current_tier: form.currentTier,
      current_division: form.currentDivision,
      current_lp: form.currentLp ? Number(form.currentLp) : null,
      peak_tier: form.peakTier,
      peak_division: form.peakDivision,
      primary_role: form.primaryRole,
      secondary_role: form.secondaryRole,
      forbidden_role: form.forbiddenRole,
      forbidden_role_completed_at: new Date().toISOString(),
      main_champions: form.mainChampions,
      secondary_champions: form.secondaryChampions,
      playstyle: form.playstyle,
      champion_pool: form.championPool,
      profile_completed: true,
      riot_puuid: riotPlayerData?.account?.puuid ?? null,
      riot_profile_icon_id: riotPlayerData?.summoner?.profileIconId ?? null,
      riot_summoner_level: riotPlayerData?.summoner?.summonerLevel ?? null,
      solo_queue_wins: riotPlayerData?.rankedSolo?.wins ?? null,
      solo_queue_losses: riotPlayerData?.rankedSolo?.losses ?? null,
      riot_verified_at: riotPlayerData ? new Date().toISOString() : null,
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.replace("/dashboard");
  }

  if (isCheckingSession) {
    return (
      <div className="rounded-[0.5rem] border border-[#2a2929] bg-[#151414] px-4 py-3 text-sm text-[#c9c9c4]">
        Verificando sesión...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <FormCard>
        <FormSectionTitle
          icon={User}
          title="Datos personales"
          description="Usamos estos datos para identificarte dentro del grupo."
        />

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <TextInput
            label="Nombre"
            value={form.firstName}
            onChange={(value) => updateField("firstName", value)}
            placeholder="Daniel"
          />

          <TextInput
            label="Apellido"
            value={form.lastName}
            onChange={(value) => updateField("lastName", value)}
            placeholder="Dib"
          />
        </div>

        <div className="mt-5 rounded-[0.75rem] border border-[#f0ed7e]/20 bg-[#101010]/70 p-4">
          <SelectInput
            label={
              <>
                Línea prohibida
                <InfoTooltip text="Elegí una sola línea que no querés jugar nunca. El generador de partidas no debería asignarte esta línea." />
              </>
            }
            value={form.forbiddenRole}
            onChange={(value) => updateField("forbiddenRole", value)}
            placeholder="Elegí la línea que no querés jugar"
            options={forbiddenRoleOptions}
          />

          <p className="mt-3 text-xs leading-5 text-[#8a8a85]">
            Esta elección es obligatoria y será respetada por el balanceador. No
            puede coincidir con tu rol principal ni con tu rol secundario.
          </p>
        </div>
      </FormCard>

      <FormCard>
        <FormSectionTitle
          icon={Gamepad2}
          title="Cuenta de League of Legends"
          description="El Riot ID ayuda a identificar correctamente al jugador."
        />

        <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.75fr_1.1fr]">
          <TextInput
            label="Nick de LoL"
            value={form.lolNick}
            onChange={(value) => updateField("lolNick", value)}
            placeholder="Faker"
          />

          <TextInput
            label="Tagline"
            value={form.lolTagline}
            onChange={(value) => updateField("lolTagline", value)}
            placeholder="LAS"
          />

          <LockedRegionField />
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-[#2a2929] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-[#8a8a85]">
            Buscá la cuenta en LAS para completar automáticamente el Solo/Duo
            actual.
          </p>

          <Button
            type="button"
            disabled={isSearchingRiot}
            onClick={handleSearchRiotAccount}
            className="h-12 rounded-[0.5rem] bg-[#232121] px-5 text-xs font-black uppercase tracking-[0.12em] text-[#f5f5f3] hover:bg-[#2b2b2b] hover:text-[#f0ed7e]"
          >
            <Search className="mr-2 size-4" />
            {isSearchingRiot ? "Buscando..." : "Buscar cuenta"}
          </Button>
        </div>

        {riotMessage ? (
          <p className="mt-4 rounded-[0.5rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 px-4 py-3 text-sm leading-6 text-[#f5f5f3]">
            {riotMessage}
          </p>
        ) : null}

        {riotPlayerData?.summoner ? (
          <RiotVerifiedCard
            data={riotPlayerData}
            region={FIXED_POWERPETES_REGION}
          />
        ) : null}
      </FormCard>

      <FormCard>
        <FormSectionTitle
          icon={Trophy}
          title="Nivel competitivo"
          description="Usá datos de Solo/Duo. No se tiene en cuenta Flex Queue."
        />

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <SelectInput
            label="Elo actual"
            value={form.currentTier}
            onChange={(value) => updateField("currentTier", value)}
            placeholder="Elo actual"
            options={tiers}
          />

          <SelectInput
            label="División actual"
            value={form.currentDivision}
            onChange={(value) => updateField("currentDivision", value)}
            placeholder="División"
            options={divisions}
          />

          <TextInput
            label="LP actual"
            value={form.currentLp}
            onChange={(value) => updateField("currentLp", value)}
            placeholder="Ej: 45"
            type="number"
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <SelectInput
            label="Mejor elo alcanzado"
            value={form.peakTier}
            onChange={(value) => updateField("peakTier", value)}
            placeholder="Mejor elo"
            options={tiers}
          />

          <SelectInput
            label="Mejor división alcanzada"
            value={form.peakDivision}
            onChange={(value) => updateField("peakDivision", value)}
            placeholder="Mejor división"
            options={divisions}
          />
        </div>
      </FormCard>

      <FormCard>
        <FormSectionTitle
          icon={Users}
          title="Roles y campeones"
          description="Esta parte es clave para evitar autofill y mejorar el balance."
        />

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <SelectInput
            label="Rol principal"
            value={form.primaryRole}
            onChange={(value) => updateField("primaryRole", value)}
            placeholder="Rol principal"
            options={roles}
          />

          <SelectInput
            label="Rol secundario"
            value={form.secondaryRole}
            onChange={(value) => updateField("secondaryRole", value)}
            placeholder="Rol secundario"
            options={roles}
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <ChampionMultiSelect
            label="Campeones principales"
            description="Seleccioná tus picks más representativos."
            value={form.mainChampions}
            onChange={(value) => updateChampionField("mainChampions", value)}
            placeholder="Escribí para buscar un campeón..."
          />

          <ChampionMultiSelect
            label="Otros campeones cómodos"
            description="Opcional. Sirve para medir flexibilidad."
            value={form.secondaryChampions}
            onChange={(value) =>
              updateChampionField("secondaryChampions", value)
            }
            placeholder="Escribí para buscar otro campeón..."
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <SelectInput
            label="Estilo de juego"
            value={form.playstyle}
            onChange={(value) => updateField("playstyle", value)}
            placeholder="Estilo"
            options={playstyles}
          />

          <SelectInput
            label={
              <>
                Variedad de campeones
                <InfoTooltip text="Indica cuántos campeones podés jugar cómodamente. Sirve para saber si sos especialista en pocos campeones o si podés adaptarte a más picks, roles o composiciones." />
              </>
            }
            value={form.championPool}
            onChange={(value) => updateField("championPool", value)}
            placeholder="Variedad"
            options={championPools}
          />
        </div>
      </FormCard>

      {errorMessage ? (
        <p className="rounded-[0.5rem] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isLoading}
        className="h-14 w-full rounded-[0.5rem] bg-[#f0ed7e] text-sm font-black uppercase tracking-[0.14em] text-[#151414] hover:bg-[#d8d46d]"
      >
        {isLoading ? "Guardando perfil..." : "Guardar perfil"}
        <ArrowRight className="ml-3 size-4" />
      </Button>
    </form>
  );
}

function FormCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-[0.75rem] border border-[#2a2929] bg-[#151414] p-5 sm:p-6">
      {children}
    </section>
  );
}

type FormSectionTitleProps = {
  icon: ElementType;
  title: string;
  description: string;
};

function FormSectionTitle({
  icon: Icon,
  title,
  description,
}: FormSectionTitleProps) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="size-4 text-[#f0ed7e]" />
        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#f5f5f3]">
          {title}
        </h3>
      </div>

      <p className="text-sm leading-6 text-[#8a8a85]">{description}</p>
    </div>
  );
}

type TextInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
};

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: TextInputProps) {
  return (
    <div className="grid gap-2">
      <Label className="flex h-5 items-center text-[#f5f5f3]">{label}</Label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-13 rounded-[0.5rem] border-[#2a2929] bg-[#101010] text-[#f5f5f3] placeholder:text-[#8a8a85] focus-visible:border-[#f0ed7e] focus-visible:ring-[#f0ed7e]/25"
      />
    </div>
  );
}

type SelectOption = {
  value: string;
  label: string;
};

type SelectInputProps = {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: SelectOption[];
};

function RiotVerifiedCard({
  data,
  region,
}: {
  data: RiotPlayerResponse;
  region: string;
}) {
  const summoner = data.summoner;

  if (!summoner) {
    return null;
  }

  const ranked = data.rankedSolo;
  const tier = ranked?.tier ?? "UNRANKED";
  const division = ranked?.division ?? "";
  const lp = ranked?.leaguePoints ?? 0;
  const wins = ranked?.wins ?? 0;
  const losses = ranked?.losses ?? 0;
  const winrate = getWinrate(wins, losses);

  return (
    <section
      className={`relative mt-4 overflow-hidden rounded-[0.75rem] border border-[#2a2929] bg-linear-to-br ${getRankAccent(
        tier,
      )} p-4 sm:p-5`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(240,237,126,0.11),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#75f0a0]/35 to-transparent" />

      <div className="relative z-10 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative shrink-0">
              {summoner.profileIconUrl ? (
                <Image
                  src={summoner.profileIconUrl}
                  alt="Icono de invocador"
                  width={64}
                  height={64}
                  sizes="(min-width: 640px) 4rem, 3.5rem"
                  className="size-14 rounded-4xl border border-[#2a2929] object-cover shadow-[0_0.75rem_1.5rem_rgba(0,0,0,0.35)] sm:size-16"
                />
              ) : (
                <div className="grid size-14 place-items-center rounded-4xl border border-[#2a2929] bg-[#101010] text-[#8a8a85] sm:size-16">
                  <Star className="size-5" />
                </div>
              )}

              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#2a2929] bg-[#151414] px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-[0.08em] text-[#f0ed7e]">
                Nv. {summoner.summonerLevel}
              </div>
            </div>

            <div className="min-w-0 pt-1">
              <div className="mb-1.5 flex items-center gap-2">
                <ShieldCheck className="size-4 text-[#75f0a0]" />
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#75f0a0]">
                  Cuenta verificada
                </p>
              </div>

              <h4 className="truncate text-xl font-black leading-none text-[#f5f5f3]">
                {data.account?.gameName ?? "Invocador"}
                <span className="text-[#8a8a85]">
                  #{data.account?.tagLine ?? region}
                </span>
              </h4>

              <p className="mt-2 text-sm text-[#8a8a85]">
                Región:{" "}
                <span className="font-bold text-[#f5f5f3]">{region}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-4xl border border-[#2a2929] bg-[#101010]/75 p-4 lg:min-w-[18rem]">
            <div className="grid size-12 shrink-0 place-items-center rounded-[0.6rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10">
              <span className="text-base font-black text-[#f0ed7e]">
                {getRankShortLabel(tier)}
              </span>
            </div>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.13em] text-[#f0ed7e]">
                Solo/Duo actual
              </p>

              <h5 className="mt-1 truncate text-lg font-black leading-none text-[#f5f5f3]">
                {ranked ? `${getTierLabel(tier)} ${division}` : "Sin rango"}
              </h5>

              <p className="mt-2 text-sm text-[#8a8a85]">
                {ranked ? `${lp} LP` : "Sin LP registrados"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatBox
            icon={Trophy}
            label="Partidas"
            value={ranked ? String(wins + losses) : "-"}
          />

          <StatBox
            icon={Swords}
            label="W / L"
            value={ranked ? `${wins} / ${losses}` : "-"}
          />

          <StatBox
            icon={Sparkles}
            label="Winrate"
            value={winrate != null ? `${winrate}%` : "-"}
          />
        </div>
      </div>
    </section>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-4xl border border-[#2a2929] bg-[#101010]/75 px-4 py-3">
      <div className="mb-1.5 flex items-center gap-2">
        <Icon className="size-3.5 text-[#f0ed7e]" />
        <span className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#8a8a85]">
          {label}
        </span>
      </div>

      <p className="text-base font-black leading-none text-[#f5f5f3]">
        {value}
      </p>
    </div>
  );
}

function LockedRegionField() {
  return (
    <div className="grid gap-2">
      <Label className="flex h-5 items-center text-[#f5f5f3]">
        Región / servidor
      </Label>

      <div className="flex min-h-13 flex-col gap-3 rounded-[0.5rem] border border-[#2a2929] bg-[#101010] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-black leading-5 text-[#f5f5f3]">
            LAS — Latinoamérica Sur
          </p>

          <p className="mt-1 text-xs leading-5 text-[#8a8a85]">
            Región fija para la liga privada de PowerPetes.
          </p>
        </div>

        <div className="inline-flex w-fit shrink-0 items-center rounded-full border border-[#75f0a0]/25 bg-[#75f0a0]/10 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#75f0a0]">
          <ShieldCheck className="mr-1 size-3" />
          Bloqueada
        </div>
      </div>
    </div>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  placeholder,
  options,
}: SelectInputProps) {
  return (
    <div className="grid gap-2">
      <Label className="flex h-5 items-center text-[#f5f5f3]">{label}</Label>

      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-13! w-full rounded-[0.5rem] border-[#2a2929] bg-[#101010] px-4 text-sm text-[#f5f5f3] focus:border-[#f0ed7e] focus:ring-[#f0ed7e]/25">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        <SelectContent className="border-[#2a2929] bg-[#1d1c1c] text-[#f5f5f3]">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
