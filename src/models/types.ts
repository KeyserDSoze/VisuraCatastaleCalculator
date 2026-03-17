// ── Room ─────────────────────────────────────────────────────────────────────

export type RoomType =
  | 'Main'                   // Stanza principale (soggiorno, camera, studio...)
  | 'Kitchen'                // Cucina con impianti
  | 'AccessoryDirect'        // Accessori diretti: bagno, ingresso, corridoio → 1/3
  | 'AccessoryComplementary' // Accessori complementari: cantina, soffitta → 1/4
  | 'Excluded';              // Escluso dal computo

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  Main: 'Principale',
  Kitchen: 'Cucina',
  AccessoryDirect: 'Accessorio diretto (1/3)',
  AccessoryComplementary: 'Accessorio complementare (1/4)',
  Excluded: 'Escluso',
};

export interface Room {
  id: string;
  name: string;
  roomType: RoomType;
  areaMq: number;
  notes: string;
}

// ── Floor ─────────────────────────────────────────────────────────────────────

export interface Floor {
  id: string;
  name: string;
  rooms: Room[];
}

// ── Unit ─────────────────────────────────────────────────────────────────────

export type UnitType = 'DwellingA' | 'PertinenzaC' | 'Other';

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  DwellingA: 'Abitazione (Gruppo A)',
  PertinenzaC: 'Pertinenza (Gruppo C)',
  Other: 'Altro',
};

export const CATEGORY_OPTIONS_A = ['A/1', 'A/2', 'A/3', 'A/4', 'A/5', 'A/6', 'A/7', 'A/8', 'A/9', 'A/10', 'A/11'];
export const CATEGORY_OPTIONS_C = ['C/1', 'C/2', 'C/3', 'C/4', 'C/5', 'C/6', 'C/7'];
export const CLASS_OPTIONS = ['1', '2', '3', '4', '5', '6', '7'];

export interface Unit {
  id: string;
  name: string;
  unitType: UnitType;
  targetCategory: string;
  targetClass: string;
  floors: Floor[];
}

// ── Tariff ───────────────────────────────────────────────────────────────────

export type TariffUnit = 'euro_per_vano' | 'euro_per_mq';
export type TariffSource = 'manual' | 'imported' | 'dataset';

export const TARIFF_UNIT_LABELS: Record<TariffUnit, string> = {
  euro_per_vano: '€/vano',
  euro_per_mq: '€/m²',
};

export interface Tariff {
  id: string;
  category: string;
  classe: string;
  value: number;
  unit: TariffUnit;
  sourceType: TariffSource;
  sourceNote: string;
}

// ── Scenario ─────────────────────────────────────────────────────────────────

export interface Scenario {
  id: string;
  name: string;
  dwellingUnitId: string;
  dwellingCategory: string;
  dwellingClass: string;
  pertinenzaUnitId: string;
  pertinenzaCategory: string;
  pertinenzaClass: string;
  enablePertinenza: boolean;
  enableImu: boolean;
  imuAliquota: number;       // e.g. 0.0076 for 0.76%
  imuIsMainHome: boolean;
  imuDetrazione: number;     // euro
}

// ── RuleSet ───────────────────────────────────────────────────────────────────

export interface RuleSet {
  accessoryDirectCoeff: number;        // default 1/3
  accessoryComplementaryCoeff: number; // default 1/4
  applyLargeRoomRagguaglio: boolean;
  vanoMaxMq: number;                   // threshold for ragguaglio (default 26)
  dipendenzePct: number;               // 0..0.10
}

// ── Jurisdiction ──────────────────────────────────────────────────────────────

export interface Jurisdiction {
  comune: string;
  zonaCensuaria: string;
  note: string;
}

// ── Project ───────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  jurisdiction: Jurisdiction;
  ruleSet: RuleSet;
  units: Unit[];
  tariffs: Tariff[];
  scenarios: Scenario[];
}
