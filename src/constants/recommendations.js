export const RECOMMENDATION_KIND_OPTIONS = [
  { value: "pesticide", label: "Pesticide" },
  { value: "fertilizer", label: "Fertilizer" },
  { value: "other", label: "Other" },
];

export const RECOMMENDATION_SUBTYPE_OPTIONS = {
  pesticide: [
    "Fungusit",
    "İnsektisit",
    "Herbisit",
    "Akarisit",
    "Nematisit",
    "Rodentisit",
    "Bakterisit",
  ],
  fertilizer: [
    "Azotlu Gübreler",
    "Fosforlu Gübreler",
    "Potasyumlu Gübreler",
    "Kompoze NPK Gübreler",
    "Mikro Element Gübreleri",
    "Organik Gübreler",
    "Yaprak Gübreleri",
  ],
  other: [],
};

export const DEFAULT_RECOMMENDATION_KIND = RECOMMENDATION_KIND_OPTIONS[0].value;
export const DEFAULT_RECOMMENDATION_SUBTYPE =
  RECOMMENDATION_SUBTYPE_OPTIONS[DEFAULT_RECOMMENDATION_KIND]?.[0] ?? "";

export function getSubtypeOptions(kind) {
  return RECOMMENDATION_SUBTYPE_OPTIONS[kind] ?? [];
}
