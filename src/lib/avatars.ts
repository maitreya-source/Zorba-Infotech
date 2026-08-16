export interface AvatarDefinition {
  id: string;
  name: string;
  description: string;
  category: "animals" | "elements" | "food" | "cyber";
  gradient: string;
  borderClass: string;
  textColor: string;
  bgSolid: string;
  imageUrl?: string;
}

export const AVATAR_CATALOG: AvatarDefinition[] = [
  {
    id: "penguin",
    name: "Cyber Penguin",
    description: "Arctic Master with Designer Specs & Suit",
    category: "animals",
    gradient: "from-sky-400 via-blue-600 to-indigo-900",
    borderClass: "border-sky-400/80 shadow-sky-500/30",
    textColor: "text-sky-300",
    bgSolid: "#0284c7",
    imageUrl: "/avatars/penguin.png",
  },
  {
    id: "fox",
    name: "Professor Fox",
    description: "Sharp Tactician with Round Spectacles",
    category: "animals",
    gradient: "from-amber-400 via-orange-500 to-red-600",
    borderClass: "border-orange-400/80 shadow-orange-500/30",
    textColor: "text-orange-300",
    bgSolid: "#f97316",
    imageUrl: "/avatars/fox.png",
  },
  {
    id: "dog",
    name: "Support Retriever",
    description: "Friendly Hero with Support Headset",
    category: "animals",
    gradient: "from-amber-300 via-yellow-500 to-amber-700",
    borderClass: "border-amber-400/80 shadow-yellow-500/30",
    textColor: "text-amber-200",
    bgSolid: "#eab308",
    imageUrl: "/avatars/dog.png",
  },
  {
    id: "owl",
    name: "Scholar Owl",
    description: "Wise Analyst with Graduation Cap",
    category: "animals",
    gradient: "from-indigo-400 via-slate-700 to-slate-950",
    borderClass: "border-indigo-400/80 shadow-indigo-500/30",
    textColor: "text-indigo-200",
    bgSolid: "#312e81",
    imageUrl: "/avatars/owl.png",
  },
  {
    id: "raccoon",
    name: "Tactical Raccoon",
    description: "Resourceful Troubleshooter & Fixer",
    category: "animals",
    gradient: "from-slate-200 via-slate-600 to-slate-900",
    borderClass: "border-slate-300/80 shadow-slate-400/30",
    textColor: "text-slate-100",
    bgSolid: "#475569",
    imageUrl: "/avatars/raccoon.png",
  },
];

const ALIAS_MAP: Record<string, string> = {
  bear: "raccoon",
  panda: "raccoon",
  fox_tie: "fox",
  "fox-serious": "fox",
  own: "owl",
  husky: "dog",
  watermelon: "fox",
  rocket: "penguin",
  lion: "dog",
  spark: "dog",
  avocado: "owl",
  coffee: "owl",
  diamond: "penguin",
  tiger: "fox",
  pizza: "raccoon",
  planet: "penguin",
  bot: "penguin",
  guitar: "dog",
  crown: "dog",
  wave: "penguin",
  flamingo: "fox",
  clover: "owl",
};

export function getAvatarById(id?: string): AvatarDefinition {
  if (!id) return AVATAR_CATALOG[0]; // Default to Cyber Penguin
  const normalized = id.toLowerCase().trim();
  const direct = AVATAR_CATALOG.find((a) => a.id.toLowerCase() === normalized);
  if (direct) return direct;

  const aliasedId = ALIAS_MAP[normalized];
  if (aliasedId) {
    const aliased = AVATAR_CATALOG.find((a) => a.id.toLowerCase() === aliasedId);
    if (aliased) return aliased;
  }

  return AVATAR_CATALOG[0];
}
