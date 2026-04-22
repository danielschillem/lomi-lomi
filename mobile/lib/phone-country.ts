/** Country dial codes — covers most common countries, sorted by name. */
export interface CountryEntry {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  dial: string; // e.g. "+33"
  flag: string; // emoji flag
}

export const COUNTRIES: CountryEntry[] = [
  { code: "DZ", name: "Algérie", dial: "+213", flag: "🇩🇿" },
  { code: "DE", name: "Allemagne", dial: "+49", flag: "🇩🇪" },
  { code: "BE", name: "Belgique", dial: "+32", flag: "🇧🇪" },
  { code: "BJ", name: "Bénin", dial: "+229", flag: "🇧🇯" },
  { code: "BF", name: "Burkina Faso", dial: "+226", flag: "🇧🇫" },
  { code: "CM", name: "Cameroun", dial: "+237", flag: "🇨🇲" },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { code: "CI", name: "Côte d'Ivoire", dial: "+225", flag: "🇨🇮" },
  { code: "ES", name: "Espagne", dial: "+34", flag: "🇪🇸" },
  { code: "US", name: "États-Unis", dial: "+1", flag: "🇺🇸" },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { code: "GA", name: "Gabon", dial: "+241", flag: "🇬🇦" },
  { code: "GN", name: "Guinée", dial: "+224", flag: "🇬🇳" },
  { code: "GP", name: "Guadeloupe", dial: "+590", flag: "🇬🇵" },
  { code: "GF", name: "Guyane française", dial: "+594", flag: "🇬🇫" },
  { code: "HT", name: "Haïti", dial: "+509", flag: "🇭🇹" },
  { code: "IT", name: "Italie", dial: "+39", flag: "🇮🇹" },
  { code: "LU", name: "Luxembourg", dial: "+352", flag: "🇱🇺" },
  { code: "MG", name: "Madagascar", dial: "+261", flag: "🇲🇬" },
  { code: "ML", name: "Mali", dial: "+223", flag: "🇲🇱" },
  { code: "MA", name: "Maroc", dial: "+212", flag: "🇲🇦" },
  { code: "MQ", name: "Martinique", dial: "+596", flag: "🇲🇶" },
  { code: "MU", name: "Maurice", dial: "+230", flag: "🇲🇺" },
  { code: "YT", name: "Mayotte", dial: "+262", flag: "🇾🇹" },
  { code: "NC", name: "Nouvelle-Calédonie", dial: "+687", flag: "🇳🇨" },
  { code: "NE", name: "Niger", dial: "+227", flag: "🇳🇪" },
  { code: "PF", name: "Polynésie française", dial: "+689", flag: "🇵🇫" },
  { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
  { code: "GB", name: "Royaume-Uni", dial: "+44", flag: "🇬🇧" },
  { code: "RE", name: "Réunion", dial: "+262", flag: "🇷🇪" },
  { code: "SN", name: "Sénégal", dial: "+221", flag: "🇸🇳" },
  { code: "CH", name: "Suisse", dial: "+41", flag: "🇨🇭" },
  { code: "TG", name: "Togo", dial: "+228", flag: "🇹🇬" },
  { code: "TN", name: "Tunisie", dial: "+216", flag: "🇹🇳" },
];

const DEFAULT_COUNTRY = "FR";

const dialByCode = new Map(COUNTRIES.map((c) => [c.code, c]));

export function getCountryByCode(code: string): CountryEntry {
  return dialByCode.get(code.toUpperCase()) ?? dialByCode.get(DEFAULT_COUNTRY)!;
}

/**
 * Detect user's country from their IP via a free geolocation API.
 * Falls back to FR on any error.
 */
export async function detectCountry(): Promise<CountryEntry> {
  try {
    const res = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return getCountryByCode(DEFAULT_COUNTRY);
    const data = await res.json();
    const code =
      typeof data.country_code === "string"
        ? data.country_code
        : DEFAULT_COUNTRY;
    return getCountryByCode(code);
  } catch {
    return getCountryByCode(DEFAULT_COUNTRY);
  }
}
