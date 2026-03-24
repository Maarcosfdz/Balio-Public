import type { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import {
  Award,
  Baby,
  Banknote,
  Battery,
  Beer,
  Bike,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  CakeSlice,
  Calculator,
  CalendarDays,
  Camera,
  CarFront,
  Cat,
  ChefHat,
  Coffee,
  Car,
  Coins,
  CreditCard,
  Crown,
  Dog,
  Drill,
  Dumbbell,
  Film,
  Flower2,
  Fuel,
  Gamepad2,
  Gem,
  Gift,
  GraduationCap,
  Hammer,
  HandCoins,
  HardHat,
  Headphones,
  Heart,
  HeartPulse,
  Home,
  Hospital,
  Landmark,
  Laptop,
  Leaf,
  Lightbulb,
  Microscope,
  Monitor,
  Mountain,
  Music,
  Paintbrush,
  PartyPopper,
  PawPrint,
  PenLine,
  Pill,
  PiggyBank,
  Pizza,
  Plane,
  Printer,
  Receipt,
  Rocket,
  Salad,
  Sandwich,
  Scissors,
  Shield,
  Ship,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Snowflake,
  Soup,
  Sparkles,
  Smartphone,
  Star,
  Stethoscope,
  Store,
  Sun,
  Syringe,
  TrainFront,
  TrendingDown,
  TrendingUp,
  Trophy,
  TreePine,
  Tv,
  Umbrella,
  UserCheck,
  Users,
  UtensilsCrossed,
  Wallet,
  Wifi,
  Wine,
  Wrench,
  Zap,
} from "lucide-react";
import { CUSTOM_ICON_REGISTRY } from "./custom/customIcons";

// Central registry: edit this object to replace/add icons globally.
const BASE_ICON_REGISTRY = {
  piggyBank: PiggyBank,
  wallet: Wallet,
  home: Home,
  food: UtensilsCrossed,
  travel: Plane,
  train: TrainFront,
  bike: Bike,
  bus: Bus,
  transport: Car,
  car: CarFront,
  fuel: Fuel,
  shopping: ShoppingBag,
  shoppingCart: ShoppingCart,
  store: Store,
  utilities: Zap,
  wifi: Wifi,
  phone: Smartphone,
  tv: Tv,
  repair: Wrench,
  health: HeartPulse,
  hospital: Hospital,
  medicine: Pill,
  fitness: Dumbbell,
  entertainment: Film,
  music: Music,
  party: PartyPopper,
  gaming: Gamepad2,
  education: GraduationCap,
  book: BookOpen,
  clothing: Shirt,
  work: Briefcase,
  business: Building2,
  gift: Gift,
  family: Baby,
  pets: PawPrint,
  dog: Dog,
  cat: Cat,
  nature: Leaf,
  weatherSun: Sun,
  weatherSnow: Snowflake,
  savings: Coins,
  handCoins: HandCoins,
  finance: Landmark,
  heart: Heart,
  shield: Shield,
  coffee: Coffee,
  dessert: CakeSlice,
  bills: Receipt,
  schedule: CalendarDays,
  generic: Sparkles,
  // food / restaurants
  pizza: Pizza,
  wine: Wine,
  beer: Beer,
  chefHat: ChefHat,
  salad: Salad,
  sandwich: Sandwich,
  soup: Soup,
  // tools / repairs
  scissors: Scissors,
  hammer: Hammer,
  paintbrush: Paintbrush,
  drill: Drill,
  hardHat: HardHat,
  // health / medical
  stethoscope: Stethoscope,
  syringe: Syringe,
  microscope: Microscope,
  // tech
  laptop: Laptop,
  monitor: Monitor,
  printer: Printer,
  headphones: Headphones,
  camera: Camera,
  // nature / weather
  flower: Flower2,
  treePine: TreePine,
  mountain: Mountain,
  umbrella: Umbrella,
  // transport
  ship: Ship,
  rocket: Rocket,
  // education
  penLine: PenLine,
  calculator: Calculator,
  // finance
  banknote: Banknote,
  creditCard: CreditCard,
  trendingUp: TrendingUp,
  trendingDown: TrendingDown,
  // luxury / achievements
  crown: Crown,
  star: Star,
  trophy: Trophy,
  award: Award,
  gem: Gem,
  // people
  users: Users,
  userCheck: UserCheck,
  // energy
  battery: Battery,
  lightbulb: Lightbulb,
} as const satisfies Record<string, LucideIcon>;

export const APP_ICON_REGISTRY = {
  ...BASE_ICON_REGISTRY,
  ...buildExtraLucideRegistry(),
  ...CUSTOM_ICON_REGISTRY,
} as const satisfies Record<string, LucideIcon>;

export type AppIconName = keyof typeof APP_ICON_REGISTRY;

const BASE_ICON_OPTION_LABELS: Array<{ name: keyof typeof BASE_ICON_REGISTRY; label: string }> = [
  { name: "piggyBank", label: "Piggy bank" },
  { name: "wallet", label: "Wallet" },
  { name: "home", label: "Home" },
  { name: "food", label: "Food" },
  { name: "travel", label: "Travel" },
  { name: "train", label: "Train" },
  { name: "bike", label: "Bike" },
  { name: "bus", label: "Bus" },
  { name: "transport", label: "Transport" },
  { name: "car", label: "Car" },
  { name: "fuel", label: "Fuel" },
  { name: "shopping", label: "Shopping bag" },
  { name: "shoppingCart", label: "Shopping cart" },
  { name: "store", label: "Store" },
  { name: "utilities", label: "Utilities" },
  { name: "wifi", label: "Wifi" },
  { name: "phone", label: "Phone" },
  { name: "tv", label: "TV" },
  { name: "repair", label: "Repair" },
  { name: "health", label: "Health" },
  { name: "hospital", label: "Hospital" },
  { name: "medicine", label: "Medicine" },
  { name: "fitness", label: "Fitness" },
  { name: "entertainment", label: "Entertainment" },
  { name: "music", label: "Music" },
  { name: "party", label: "Party" },
  { name: "gaming", label: "Gaming" },
  { name: "education", label: "Education" },
  { name: "book", label: "Book" },
  { name: "clothing", label: "Clothing" },
  { name: "work", label: "Work" },
  { name: "business", label: "Business" },
  { name: "gift", label: "Gift" },
  { name: "family", label: "Family" },
  { name: "pets", label: "Pets" },
  { name: "dog", label: "Dog" },
  { name: "cat", label: "Cat" },
  { name: "nature", label: "Nature" },
  { name: "weatherSun", label: "Sun" },
  { name: "weatherSnow", label: "Snow" },
  { name: "savings", label: "Savings" },
  { name: "handCoins", label: "Coins" },
  { name: "finance", label: "Finance" },
  { name: "heart", label: "Heart" },
  { name: "shield", label: "Shield" },
  { name: "coffee", label: "Coffee" },
  { name: "dessert", label: "Dessert" },
  { name: "bills", label: "Bills" },
  { name: "schedule", label: "Schedule" },
  { name: "generic", label: "Generic" },
  // food / restaurants
  { name: "pizza", label: "Pizza" },
  { name: "wine", label: "Wine" },
  { name: "beer", label: "Beer" },
  { name: "chefHat", label: "Chef hat" },
  { name: "salad", label: "Salad" },
  { name: "sandwich", label: "Sandwich" },
  { name: "soup", label: "Soup" },
  // tools / repairs
  { name: "scissors", label: "Scissors" },
  { name: "hammer", label: "Hammer" },
  { name: "paintbrush", label: "Paintbrush" },
  { name: "drill", label: "Drill" },
  { name: "hardHat", label: "Hard hat" },
  // health / medical
  { name: "stethoscope", label: "Stethoscope" },
  { name: "syringe", label: "Syringe" },
  { name: "microscope", label: "Microscope" },
  // tech
  { name: "laptop", label: "Laptop" },
  { name: "monitor", label: "Monitor" },
  { name: "printer", label: "Printer" },
  { name: "headphones", label: "Headphones" },
  { name: "camera", label: "Camera" },
  // nature / weather
  { name: "flower", label: "Flower" },
  { name: "treePine", label: "Pine tree" },
  { name: "mountain", label: "Mountain" },
  { name: "umbrella", label: "Umbrella" },
  // transport
  { name: "ship", label: "Ship" },
  { name: "rocket", label: "Rocket" },
  // education
  { name: "penLine", label: "Pen" },
  { name: "calculator", label: "Calculator" },
  // finance
  { name: "banknote", label: "Banknote" },
  { name: "creditCard", label: "Credit card" },
  { name: "trendingUp", label: "Trending up" },
  { name: "trendingDown", label: "Trending down" },
  // luxury / achievements
  { name: "crown", label: "Crown" },
  { name: "star", label: "Star" },
  { name: "trophy", label: "Trophy" },
  { name: "award", label: "Award" },
  { name: "gem", label: "Gem" },
  // people
  { name: "users", label: "Users" },
  { name: "userCheck", label: "User check" },
  // energy
  { name: "battery", label: "Battery" },
  { name: "lightbulb", label: "Lightbulb" },
];

export const APP_ICON_OPTIONS: Array<{ name: AppIconName; label: string }> = [
  ...BASE_ICON_OPTION_LABELS.map((option) => ({ name: option.name as AppIconName, label: option.label })),
  ...Object.keys(APP_ICON_REGISTRY)
    .filter((name) => !BASE_ICON_OPTION_LABELS.some((opt) => opt.name === name))
    .map((name) => ({ name: name as AppIconName, label: name })),
];

export const ICON_BG_COLOR_OPTIONS = [
  "#E2E8F0",
  "#DBEAFE",
  "#DCFCE7",
  "#FEF3C7",
  "#FFE4E6",
  "#F5D0FE",
  "#FDE68A",
  "#BFDBFE",
  "#A7F3D0",
  "#F5F3FF",
] as const;

export const DEFAULT_ICON_BG_COLOR: string = ICON_BG_COLOR_OPTIONS[0];
export const EMOJI_ICON_PREFIX = "emoji:";
export const ASSET_ICON_PREFIX = "asset:";

const KEYWORD_ICON_MAP: Array<{ pattern: RegExp; icon: AppIconName }> = [
  { pattern: /(ahorro|saving|savings|save|hucha|emergency|fondo)/i, icon: "savings" },
  { pattern: /(hogar|home|house|rent|alquiler|mortgage|housing)/i, icon: "home" },
  { pattern: /(food|comida|restaurant|restaurante|grocery|super)/i, icon: "food" },
  { pattern: /(travel|trip|viaje|vacation|holiday|flight|vuelo|train|tren)/i, icon: "travel" },
  { pattern: /(car|coche|auto|transport|transporte|fuel|gasolina|diesel)/i, icon: "transport" },
  { pattern: /(bike|bici|bicycle)/i, icon: "bike" },
  { pattern: /(bus|autobus)/i, icon: "bus" },
  { pattern: /(shop|shopping|compra|store|tienda|amazon)/i, icon: "shopping" },
  { pattern: /(utility|utilities|luz|agua|internet|phone|telefono|electric)/i, icon: "utilities" },
  { pattern: /(health|salud|doctor|medic|farmacia|hospital)/i, icon: "health" },
  { pattern: /(gym|fitness|entreno|workout)/i, icon: "fitness" },
  { pattern: /(movie|cine|stream|netflix|entertainment|ocio)/i, icon: "entertainment" },
  { pattern: /(music|spotify|concert|concierto)/i, icon: "music" },
  { pattern: /(game|gaming|xbox|playstation|steam)/i, icon: "gaming" },
  { pattern: /(study|school|colegio|universidad|education|curso|formacion|book|libro)/i, icon: "education" },
  { pattern: /(clothes|clothing|ropa|fashion|outfit)/i, icon: "clothing" },
  { pattern: /(work|job|salary|empresa|office|freelance)/i, icon: "work" },
  { pattern: /(business|negocio|company|corp)/i, icon: "business" },
  { pattern: /(pet|mascota|dog|perro|cat|gato)/i, icon: "pets" },
  { pattern: /(gift|regalo|birthday|cumple)/i, icon: "gift" },
  { pattern: /(bill|receipt|factura|subscription|suscripcion)/i, icon: "bills" },
  { pattern: /(calendar|schedule|scheduled|programad)/i, icon: "schedule" },
  { pattern: /(budget|presupuesto|finance|finanzas|money|dinero)/i, icon: "finance" },
];

export function suggestIconFromText(text?: string | null): AppIconName {
  if (!text) return "piggyBank";
  const match = KEYWORD_ICON_MAP.find(({ pattern }) => pattern.test(text));
  return match?.icon ?? "piggyBank";
}

export function isAppIconName(value?: string | null): value is AppIconName {
  if (!value) return false;
  return value in APP_ICON_REGISTRY;
}

export function isAssetIconName(value?: string | null): boolean {
  return !!value && value.startsWith(ASSET_ICON_PREFIX);
}

export function toEmojiIconName(emoji: string): string {
  return `${EMOJI_ICON_PREFIX}${emoji}`;
}

export function readEmojiFromIconName(iconName?: string | null): string | null {
  if (!iconName) return null;
  if (!iconName.startsWith(EMOJI_ICON_PREFIX)) return null;
  return iconName.slice(EMOJI_ICON_PREFIX.length).trim() || null;
}

export function normalizeIconBgColor(
  iconBgColor?: string | null,
  fallback = DEFAULT_ICON_BG_COLOR,
): string {
  if (!iconBgColor) return fallback;
  const value = iconBgColor.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) return value.toUpperCase();
  return fallback;
}

export function resolveEntityIconName(
  iconName?: string | null,
  fallbackText?: string | null,
): string {
  if (readEmojiFromIconName(iconName)) return iconName as string;
  if (isAssetIconName(iconName)) return iconName as string;
  if (isAppIconName(iconName)) return iconName;
  return suggestIconFromText(fallbackText);
}

function buildExtraLucideRegistry(): Record<string, LucideIcon> {
  const extraNames = [
    "Activity",
    "AlarmClock",
    "Apple",
    "Archive",
    "Armchair",
    "Atom",
    "BadgeEuro",
    "Banknote",
    "Bath",
    "BedSingle",
    "Bell",
    "BookMarked",
    "Bone",
    "Brush",
    "Bug",
    "Cake",
    "Camera",
    "Candy",
    "CarTaxiFront",
    "Castle",
    "ChartCandlestick",
    "ChefHat",
    "Church",
    "CircuitBoard",
    "CloudRain",
    "Compass",
    "CreditCard",
    "Cross",
    "Dices",
    "Droplets",
    "Factory",
    "FerrisWheel",
    "Fish",
    "Flame",
    "Flower2",
    "Footprints",
    "Forklift",
    "GlassWater",
    "Globe",
    "Hammer",
    "HandHeart",
    "HardHat",
    "Headphones",
    "Hotel",
    "IceCreamCone",
    "KeyRound",
    "Laptop",
    "LeafyGreen",
    "Lightbulb",
    "Map",
    "Mic",
    "Mountain",
    "Pizza",
    "Popcorn",
    "Rocket",
    "School",
    "ShipWheel",
    "ShowerHead",
    "Smile",
    "Tent",
    "Tractor",
    "TreePine",
    "Truck",
    "Umbrella",
    "Vegan",
    "Waves",
    "Wine",
  ] as const;

  const result: Record<string, LucideIcon> = {};
  const lucideMap = LucideIcons as Record<string, unknown>;

  for (const name of extraNames) {
    const icon = lucideMap[name];
    if (typeof icon !== "function") {
      continue;
    }
    const key = name.charAt(0).toLowerCase() + name.slice(1);
    if (!result[key] && !BASE_ICON_REGISTRY[key as keyof typeof BASE_ICON_REGISTRY]) {
      result[key] = icon as LucideIcon;
    }
  }

  return result;
}
