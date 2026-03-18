// ── Room ─────────────────────────────────────────────────────────────────────

export type RoomType =
  | 'Main'                   // Stanza principale (soggiorno, camera, studio...)
  | 'Kitchen'                // Cucina con impianti
  | 'AccessoryDirect'        // Accessori diretti: bagno, ingresso, corridoio → 1/3
  | 'AccessoryComplementary' // Accessori complementari: cantina, soffitta → 1/4
  | 'Terrazzo'               // Terrazza/balcone – 0 vani, area rilevante per DM 2/8/1969
  | 'Excluded';              // Escluso dal computo

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  Main: 'Principale',
  Kitchen: 'Cucina',
  AccessoryDirect: 'Accessorio diretto (1/3)',
  AccessoryComplementary: 'Accessorio complementare (1/4)',
  Terrazzo: 'Terrazzo/Balcone',
  Excluded: 'Escluso',
};

export interface Room {
  id: string;
  name: string;
  roomType: RoomType;
  areaMq: number;
  notes: string;
  luxuryMaterials?: boolean; // DM 2/8/1969 – cr.5: finiture di pregio (marmi, legni nobili…)
  centralHeating?: boolean;  // DM 2/8/1969 – cr.6: riscaldamento centralizzato in questo locale
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
  hasPool?: boolean;        // DM 2/8/1969 – cr.3: piscina scoperta ≥ 80 m² o maneggio
  hasPrivateLift?: boolean; // DM 2/8/1969 – cr.4: ascensore al servizio di <4 appartamenti
  isVilla?: boolean;        // DM 2/8/1969 – cr.7: villa unifamiliare con giardino
  gardenMq?: number;        // DM 2/8/1969 – cr.7: superficie giardino in m²
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
  isFusion?: boolean;        // true = accorpamento di più unità
  fusionUnitIds?: string[];  // IDs delle unità da fondere
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
