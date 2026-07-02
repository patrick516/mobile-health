export const SYMPTOMS = [
  { code: "FEVER", labelEn: "Fever", labelNy: "Maliro", icon: "thermometer" },
  { code: "COUGH", labelEn: "Cough", labelNy: "Chifuwa", icon: "wind" },
  {
    code: "DIARRHOEA",
    labelEn: "Diarrhoea",
    labelNy: "Kutsegula",
    icon: "droplets",
  },
  {
    code: "VOMITING",
    labelEn: "Vomiting",
    labelNy: "Kupsomola",
    icon: "activity",
  },
  { code: "RASH", labelEn: "Skin Rash", labelNy: "Chisamba", icon: "zap" },
  {
    code: "BREATHLESS",
    labelEn: "Difficulty Breathing",
    labelNy: "Kuvuta Mpweya",
    icon: "wind",
  },
  {
    code: "CONVULSIONS",
    labelEn: "Convulsions",
    labelNy: "Zigwa",
    icon: "alert-triangle",
  },
  {
    code: "SWELLING",
    labelEn: "Swollen Limbs",
    labelNy: "Kutupha",
    icon: "plus-circle",
  },
  {
    code: "EYE_DISCHARGE",
    labelEn: "Eye Discharge",
    labelNy: "Nsombwe",
    icon: "eye",
  },
  {
    code: "EARACHE",
    labelEn: "Ear Pain",
    labelNy: "Kutemwa Khutu",
    icon: "volume-x",
  },
  {
    code: "JAUNDICE",
    labelEn: "Yellow Eyes/Skin",
    labelNy: "Dzitso Lofalitsa",
    icon: "sun",
  },
  {
    code: "MALNUTRITION",
    labelEn: "Malnutrition Signs",
    labelNy: "Njala Yoopsa",
    icon: "alert-circle",
  },
  {
    code: "HEADACHE",
    labelEn: "Headache",
    labelNy: "Kutemwa Mutu",
    icon: "minus-circle",
  },
  {
    code: "ABDO_PAIN",
    labelEn: "Abdominal Pain",
    labelNy: "Kutemwa Mimba",
    icon: "circle",
  },
  {
    code: "UNCONSCIOUS",
    labelEn: "Unconscious",
    labelNy: "Asakhale Bwino",
    icon: "moon",
  },
];

export const DANGER_SIGNS = [
  {
    code: "UNABLE_DRINK",
    labelEn: "Unable to drink or breastfeed",
    labelNy: "Sachimwa Kumwa",
  },
  {
    code: "VOMITS_ALL",
    labelEn: "Vomits everything",
    labelNy: "Kupsomola Zonse",
  },
  {
    code: "CONVULSIONS",
    labelEn: "Convulsions now or recently",
    labelNy: "Zigwa Tsopano",
  },
  {
    code: "LETHARGIC",
    labelEn: "Lethargic or unconscious",
    labelNy: "Wakoroma",
  },
  {
    code: "CHEST_INDRAWING",
    labelEn: "Chest indrawing",
    labelNy: "Mkanda Ukuingira",
  },
  { code: "STRIDOR", labelEn: "Stridor when calm", labelNy: "Mawu Woopsa" },
  {
    code: "SEVERE_MUAC",
    labelEn: "MUAC below 115mm (Red band)",
    labelNy: "MUAC Yofiira",
  },
];

export const VISIT_TYPES = [
  {
    code: "ROUTINE",
    labelEn: "Routine Visit",
    labelNy: "Ulendo wa Nthawi Zonse",
  },
  { code: "SICK", labelEn: "Sick Visit", labelNy: "Ulendo wa Odwala" },
  { code: "FOLLOW_UP", labelEn: "Follow-up Visit", labelNy: "Kutsata" },
  {
    code: "DRUG_DISPENSING_ONLY",
    labelEn: "Drug Dispensing Only",
    labelNy: "Mankhwala Okha",
  },
];

export const REFERRAL_REASONS = [
  {
    code: "SEVERE_MALNUTRITION",
    labelEn: "Severe Acute Malnutrition",
    labelNy: "Njala Yoopsa",
  },
  {
    code: "MALARIA_SEVERE",
    labelEn: "Severe Malaria",
    labelNy: "Malungo Oopsa",
  },
  { code: "PNEUMONIA", labelEn: "Pneumonia / ARI", labelNy: "Nfua ya Mkanda" },
  {
    code: "DIARRHOEA_SEVERE",
    labelEn: "Severe Diarrhoea",
    labelNy: "Kutsegula Koopsa",
  },
  {
    code: "DANGER_SIGNS",
    labelEn: "Danger Signs Present",
    labelNy: "Zizindikiro Zoopsa",
  },
  { code: "ANC", labelEn: "Antenatal Care", labelNy: "Chipatala cha Pakati" },
  { code: "DELIVERY", labelEn: "Imminent Delivery", labelNy: "Kubala Kofupi" },
  { code: "INJURY", labelEn: "Injury or Trauma", labelNy: "Kuvulala" },
  { code: "OTHER", labelEn: "Other", labelNy: "Ena" },
];

export const CHRONIC_ILLNESSES = [
  { code: "HIV", labelEn: "HIV Positive", labelNy: "HIV" },
  { code: "TB", labelEn: "TB (on treatment)", labelNy: "TB" },
  { code: "DIABETES", labelEn: "Diabetes", labelNy: "Shuga" },
  { code: "HYPERTENSION", labelEn: "Hypertension", labelNy: "Magazi Otentha" },
  { code: "NONE", labelEn: "None", labelNy: "Palibe" },
];

export const RELATIONSHIP_OPTIONS = [
  { code: "HEAD", labelEn: "Head of Household", labelNy: "Mwini Nyumba" },
  { code: "SPOUSE", labelEn: "Spouse", labelNy: "Mkazi / Mwamuna" },
  { code: "CHILD", labelEn: "Child", labelNy: "Mwana" },
  { code: "PARENT", labelEn: "Parent", labelNy: "Makolo" },
  { code: "OTHER_RELATIVE", labelEn: "Other Relative", labelNy: "Achibale" },
  { code: "NON_RELATIVE", labelEn: "Non-relative", labelNy: "Wina" },
];

export const WATER_SOURCES = [
  { code: "BOREHOLE", labelEn: "Borehole", labelNy: "Bomba" },
  { code: "RIVER", labelEn: "River / Stream", labelNy: "Mtsinje" },
  { code: "PIPED", labelEn: "Piped Water", labelNy: "Madzi a Paip" },
  {
    code: "PROTECTED_WELL",
    labelEn: "Protected Well",
    labelNy: "Chitsime Chotetezedwa",
  },
  {
    code: "UNPROTECTED_WELL",
    labelEn: "Unprotected Well",
    labelNy: "Chitsime Choipa",
  },
  {
    code: "RAIN_WATER",
    labelEn: "Rain Water Harvesting",
    labelNy: "Madzi a Mvula",
  },
  { code: "OTHER", labelEn: "Other", labelNy: "Ena" },
];

export const STRUCTURE_TYPES = [
  { code: "BRICK", labelEn: "Brick", labelNy: "Njerwa" },
  { code: "MUD", labelEn: "Mud", labelNy: "Dothi" },
  { code: "IRON_SHEET", labelEn: "Iron Sheet", labelNy: "Zingwe" },
  { code: "GRASS_THATCH", labelEn: "Grass Thatch", labelNy: "Udzu" },
  { code: "OTHER", labelEn: "Other", labelNy: "Ena" },
];

export const WALL_MATERIALS = [
  { code: "BRICK", labelEn: "Brick", labelNy: "Njerwa" },
  { code: "MUD_CLAY", labelEn: "Mud / Clay", labelNy: "Dothi" },
  { code: "WOOD_TIMBER", labelEn: "Wood / Timber", labelNy: "Mtengo" },
  { code: "IRON_SHEET", labelEn: "Iron Sheet", labelNy: "Zingwe" },
  { code: "OTHER", labelEn: "Other", labelNy: "Ena" },
];

export const ROOF_MATERIALS = [
  { code: "IRON_SHEET", labelEn: "Iron Sheet", labelNy: "Zingwe" },
  { code: "GRASS_THATCH", labelEn: "Grass Thatch", labelNy: "Udzu" },
  { code: "TILES", labelEn: "Tiles", labelNy: "Matayala" },
  {
    code: "PLASTIC_TARPAULIN",
    labelEn: "Plastic / Tarpaulin",
    labelNy: "Talapu",
  },
  { code: "OTHER", labelEn: "Other", labelNy: "Ena" },
];

export const FLOOR_TYPES = [
  { code: "CEMENT", labelEn: "Cement", labelNy: "Sementi" },
  { code: "MUD_EARTH", labelEn: "Mud / Earth", labelNy: "Dothi" },
  { code: "TILES", labelEn: "Tiles", labelNy: "Matayala" },
  { code: "OTHER", labelEn: "Other", labelNy: "Ena" },
];

export const DISTANCE_OPTIONS = [
  { code: "UNDER_5KM", labelEn: "Under 5 km", labelNy: "Pafupi (5km)" },
  { code: "BETWEEN_5_10KM", labelEn: "5 to 10 km", labelNy: "5 mpaka 10km" },
  { code: "OVER_10KM", labelEn: "Over 10 km", labelNy: "Patali (10km+)" },
];

export const VACCINES = [
  { code: "BCG", dose: 1, labelEn: "BCG", timing: "At birth" },
  { code: "OPV0", dose: 1, labelEn: "OPV (Birth)", timing: "At birth" },
  { code: "OPV1", dose: 1, labelEn: "OPV 1", timing: "6 weeks" },
  { code: "OPV2", dose: 2, labelEn: "OPV 2", timing: "10 weeks" },
  { code: "OPV3", dose: 3, labelEn: "OPV 3", timing: "14 weeks" },
  { code: "DPT1", dose: 1, labelEn: "DPT-HepB 1", timing: "6 weeks" },
  { code: "DPT2", dose: 2, labelEn: "DPT-HepB 2", timing: "10 weeks" },
  { code: "DPT3", dose: 3, labelEn: "DPT-HepB 3", timing: "14 weeks" },
  { code: "PCV1", dose: 1, labelEn: "PCV 1", timing: "6 weeks" },
  { code: "PCV2", dose: 2, labelEn: "PCV 2", timing: "10 weeks" },
  { code: "PCV3", dose: 3, labelEn: "PCV 3", timing: "14 weeks" },
  { code: "ROTA1", dose: 1, labelEn: "Rotavirus 1", timing: "6 weeks" },
  { code: "ROTA2", dose: 2, labelEn: "Rotavirus 2", timing: "10 weeks" },
  { code: "MEASLES1", dose: 1, labelEn: "Measles 1", timing: "9 months" },
  { code: "MEASLES2", dose: 2, labelEn: "Measles 2", timing: "15 months" },
  { code: "VITA1", dose: 1, labelEn: "Vitamin A 1", timing: "6 months" },
  { code: "DEWORM1", dose: 1, labelEn: "Deworming", timing: "12 months" },
];
