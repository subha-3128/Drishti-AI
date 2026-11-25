export type HazardPriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface HazardCategoryConfig {
  id: string;
  spokenName: string;
  category: 'dynamic' | 'static' | 'context';
  basePriority: HazardPriority;
  enabled: boolean;
}

/**
 * Validated obstacle categories mapped from Cactus Mirage open-vocabulary labels.
 * Indian-specific ground hazards (pothole, open drain, broken footpath, auto-rickshaw)
 * remain disabled until evaluated on Indian pedestrian datasets.
 */
export const MIRAGE_HAZARD_CATEGORIES: Record<string, HazardCategoryConfig> = {
  person: { id: 'person', spokenName: 'Person', category: 'dynamic', basePriority: 'P1', enabled: true },
  crowd: { id: 'crowd', spokenName: 'Crowd', category: 'dynamic', basePriority: 'P1', enabled: true },
  vehicle: { id: 'vehicle', spokenName: 'Vehicle', category: 'dynamic', basePriority: 'P1', enabled: true },
  motorcycle: { id: 'motorcycle', spokenName: 'Two-wheeler', category: 'dynamic', basePriority: 'P1', enabled: true },
  bicycle: { id: 'bicycle', spokenName: 'Bicycle', category: 'dynamic', basePriority: 'P1', enabled: true },
  bus: { id: 'bus', spokenName: 'Bus', category: 'dynamic', basePriority: 'P1', enabled: true },
  truck: { id: 'truck', spokenName: 'Truck', category: 'dynamic', basePriority: 'P1', enabled: true },
  dog: { id: 'dog', spokenName: 'Dog', category: 'dynamic', basePriority: 'P1', enabled: true },
  cow: { id: 'cow', spokenName: 'Animal', category: 'dynamic', basePriority: 'P1', enabled: true },
  stairs: { id: 'stairs', spokenName: 'Stairs', category: 'static', basePriority: 'P1', enabled: true },
  barrier: { id: 'barrier', spokenName: 'Barrier', category: 'static', basePriority: 'P2', enabled: true },
  obstacle: { id: 'obstacle', spokenName: 'Obstacle', category: 'static', basePriority: 'P2', enabled: true },
  tree: { id: 'tree', spokenName: 'Tree', category: 'context', basePriority: 'P3', enabled: true },
  // Disabled pending real Indian pedestrian dataset evaluation:
  auto_rickshaw: { id: 'auto_rickshaw', spokenName: 'Auto-rickshaw', category: 'dynamic', basePriority: 'P1', enabled: false },
  pothole: { id: 'pothole', spokenName: 'Pothole', category: 'static', basePriority: 'P1', enabled: false },
  open_drain: { id: 'open_drain', spokenName: 'Possible open drain', category: 'static', basePriority: 'P0', enabled: false },
  open_manhole: { id: 'open_manhole', spokenName: 'Possible open manhole', category: 'static', basePriority: 'P0', enabled: false },
  broken_footpath: { id: 'broken_footpath', spokenName: 'Broken pathway', category: 'static', basePriority: 'P1', enabled: false },
};

const EXACT_OR_PHRASE_MAP: Array<[RegExp, string]> = [
  [/\b(persons?|pedestrians?|people|man|men|woman|women|child|children|players?|walkers?|runners?)\b/, 'person'],
  [/\b(crowds?|group of people)\b/, 'crowd'],
  [/\b(motorcycles?|motorbikes?|scooters?|mopeds?|two-wheelers?)\b/, 'motorcycle'],
  [/\b(bicycles?|bikes?|cyclists?)\b/, 'bicycle'],
  [/\b(bus|buses)\b/, 'bus'],
  [/\b(pickup trucks?|trucks?|lorr(?:y|ies))\b/, 'truck'],
  [/\b(cars?|sedans?|suvs?|taxis?|cabs?|vehicles?|vans?)\b/, 'vehicle'],
  [/\b(dogs?|pupp(?:y|ies))\b/, 'dog'],
  [/\b(cows?|bulls?|cattle|calves)\b/, 'cow'],
  [/\b(stairs?|staircases?|steps?)\b/, 'stairs'],
  [/\b(barricades?|barriers?|fences?|railings?|guardrails?|cones?)\b/, 'barrier'],
  [/\b(pillars?|poles?|posts?|bollards?|bench(?:es)?|chairs?|tables?|suitcases?|bags?|carts?)\b/, 'obstacle'],
  [/\b(trees?|bush(?:es)?)\b/, 'tree'],
];

/**
 * Maps a raw Cactus Mirage label to an enabled Drishti hazard category.
 * Returns null for background scenery (sky, window, grass, deck) or disabled classes.
 */
export function mapMirageLabel(rawLabel: string): HazardCategoryConfig | null {
  const normalized = rawLabel.trim().toLowerCase();
  if (!normalized) return null;

  for (const [pattern, categoryId] of EXACT_OR_PHRASE_MAP) {
    if (pattern.test(normalized)) {
      const cfg = MIRAGE_HAZARD_CATEGORIES[categoryId];
      return cfg && cfg.enabled ? cfg : null;
    }
  }
  return null;
}
