// ─── Static location data ───────────────────────────────────────────────────
// TODO: Replace with API calls from admin panel later

export interface Country {
  code: string;
  name: string;
  flag: string;
}

export interface District {
  id: string;
  name: string;
  countryCode: string;
}

export interface Town {
  id: string;
  name: string;
  districtId: string;
}

export const COUNTRIES: Country[] = [
  { code: "MW", name: "Malawi", flag: "🇲🇼" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "MZ", name: "Mozambique", flag: "🇲🇿" },
  { code: "ZM", name: "Zambia", flag: "🇿🇲" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "ZW", name: "Zimbabwe", flag: "🇿🇼" },
  { code: "BW", name: "Botswana", flag: "🇧🇼" },
  { code: "NA", name: "Namibia", flag: "🇳🇦" },
  { code: "SZ", name: "Eswatini", flag: "🇸🇿" },
  { code: "LS", name: "Lesotho", flag: "🇱🇸" },
];

export const DISTRICTS: District[] = [
  // Malawi
  { id: "mw-blantyre", name: "Blantyre", countryCode: "MW" },
  { id: "mw-lilongwe", name: "Lilongwe", countryCode: "MW" },
  { id: "mw-mzuzu", name: "Mzuzu", countryCode: "MW" },
  { id: "mw-zomba", name: "Zomba", countryCode: "MW" },
  { id: "mw-kasungu", name: "Kasungu", countryCode: "MW" },
  { id: "mw-mangochi", name: "Mangochi", countryCode: "MW" },
  { id: "mw-salima", name: "Salima", countryCode: "MW" },
  { id: "mw-dedza", name: "Dedza", countryCode: "MW" },
  { id: "mw-ntcheu", name: "Ntcheu", countryCode: "MW" },
  { id: "mw-chiradzulu", name: "Chiradzulu", countryCode: "MW" },

  // South Africa
  { id: "za-gauteng", name: "Gauteng", countryCode: "ZA" },
  { id: "za-western", name: "Western Cape", countryCode: "ZA" },
  { id: "za-kwazulu", name: "KwaZulu-Natal", countryCode: "ZA" },
  { id: "za-eastern", name: "Eastern Cape", countryCode: "ZA" },
  { id: "za-limpopo", name: "Limpopo", countryCode: "ZA" },

  // Mozambique
  { id: "mz-maputo", name: "Maputo", countryCode: "MZ" },
  { id: "mz-beira", name: "Beira", countryCode: "MZ" },
  { id: "mz-nampula", name: "Nampula", countryCode: "MZ" },
  { id: "mz-tete", name: "Tete", countryCode: "MZ" },
  { id: "mz-zambezia", name: "Zambézia", countryCode: "MZ" },

  // Zambia
  { id: "zm-lusaka", name: "Lusaka", countryCode: "ZM" },
  { id: "zm-copperbelt", name: "Copperbelt", countryCode: "ZM" },
  { id: "zm-eastern", name: "Eastern", countryCode: "ZM" },
  { id: "zm-northern", name: "Northern", countryCode: "ZM" },
  { id: "zm-southern", name: "Southern", countryCode: "ZM" },

  // Tanzania
  { id: "tz-dar", name: "Dar es Salaam", countryCode: "TZ" },
  { id: "tz-arusha", name: "Arusha", countryCode: "TZ" },
  { id: "tz-mwanza", name: "Mwanza", countryCode: "TZ" },
  { id: "tz-dodoma", name: "Dodoma", countryCode: "TZ" },
  { id: "tz-mbeya", name: "Mbeya", countryCode: "TZ" },

  // Zimbabwe
  { id: "zw-harare", name: "Harare", countryCode: "ZW" },
  { id: "zw-bulawayo", name: "Bulawayo", countryCode: "ZW" },
  { id: "zw-manicaland", name: "Manicaland", countryCode: "ZW" },
  { id: "zw-masvingo", name: "Masvingo", countryCode: "ZW" },
  { id: "zw-midlands", name: "Midlands", countryCode: "ZW" },

  // Others — just capitals for now
  { id: "bw-gaborone", name: "Gaborone", countryCode: "BW" },
  { id: "bw-francistown", name: "Francistown", countryCode: "BW" },
  { id: "na-windhoek", name: "Windhoek", countryCode: "NA" },
  { id: "na-walvis", name: "Walvis Bay", countryCode: "NA" },
  { id: "sz-mbabane", name: "Mbabane", countryCode: "SZ" },
  { id: "sz-manzini", name: "Manzini", countryCode: "SZ" },
  { id: "ls-maseru", name: "Maseru", countryCode: "LS" },
  { id: "ls-leribe", name: "Leribe", countryCode: "LS" },
];

export const TOWNS: Town[] = [
  // Blantyre districts
  { id: "limbe", name: "Limbe", districtId: "mw-blantyre" },
  { id: "chichiri", name: "Chichiri", districtId: "mw-blantyre" },
  { id: "sunnyside", name: "Sunnyside", districtId: "mw-blantyre" },
  { id: "ndirande", name: "Ndirande", districtId: "mw-blantyre" },
  { id: "chirimba", name: "Chirimba", districtId: "mw-blantyre" },
  { id: "bangwe", name: "Bangwe", districtId: "mw-blantyre" },
  { id: "chilomoni", name: "Chilomoni", districtId: "mw-blantyre" },

  // Lilongwe
  { id: "area1", name: "Area 1", districtId: "mw-lilongwe" },
  { id: "area2", name: "Area 2", districtId: "mw-lilongwe" },
  { id: "area3", name: "Area 3", districtId: "mw-lilongwe" },
  { id: "area18", name: "Area 18", districtId: "mw-lilongwe" },
  { id: "area25", name: "Area 25", districtId: "mw-lilongwe" },
  { id: "kanengo", name: "Kanengo", districtId: "mw-lilongwe" },
  { id: "kawale", name: "Kawale", districtId: "mw-lilongwe" },

  // Mzuzu
  { id: "mzuzu-cbd", name: "CBD", districtId: "mw-mzuzu" },
  { id: "katoto", name: "Katoto", districtId: "mw-mzuzu" },
  { id: "chibavi", name: "Chibavi", districtId: "mw-mzuzu" },
  { id: "zolozolo", name: "Zolozolo", districtId: "mw-mzuzu" },

  // Zomba
  { id: "zomba-cbd", name: "Zomba CBD", districtId: "mw-zomba" },
  { id: "naisi", name: "Naisi", districtId: "mw-zomba" },
  { id: "mulunguzi", name: "Mulunguzi", districtId: "mw-zomba" },

  // SA — Gauteng
  { id: "johannesburg", name: "Johannesburg", districtId: "za-gauteng" },
  { id: "pretoria", name: "Pretoria", districtId: "za-gauteng" },
  { id: "soweto", name: "Soweto", districtId: "za-gauteng" },
  { id: "sandton", name: "Sandton", districtId: "za-gauteng" },

  // Western Cape
  { id: "cape-town", name: "Cape Town", districtId: "za-western" },
  { id: "stellenbosch", name: "Stellenbosch", districtId: "za-western" },
  { id: "george", name: "George", districtId: "za-western" },

  // Mozambique — Maputo
  { id: "maputo-city", name: "Maputo City", districtId: "mz-maputo" },
  { id: "matola", name: "Matola", districtId: "mz-maputo" },

  // Zambia — Lusaka
  { id: "lusaka-city", name: "Lusaka City", districtId: "zm-lusaka" },
  { id: "chilanga", name: "Chilanga", districtId: "zm-lusaka" },
  { id: "kafue", name: "Kafue", districtId: "zm-lusaka" },

  // Tanzania — Dar
  { id: "dar-city", name: "Dar City", districtId: "tz-dar" },
  { id: "kinondoni", name: "Kinondoni", districtId: "tz-dar" },
  { id: "ilala", name: "Ilala", districtId: "tz-dar" },

  // Zimbabwe — Harare
  { id: "harare-cbd", name: "Harare CBD", districtId: "zw-harare" },
  { id: "borrowdale", name: "Borrowdale", districtId: "zw-harare" },
  { id: "avondale", name: "Avondale", districtId: "zw-harare" },
];

export function getDistricts(countryCode: string): District[] {
  return DISTRICTS.filter((d) => d.countryCode === countryCode);
}

export function getTowns(districtId: string): Town[] {
  return TOWNS.filter((t) => t.districtId === districtId);
}
