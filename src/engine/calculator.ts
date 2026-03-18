import { Unit, RuleSet, Tariff, RoomType } from '../models/types';

// ── Rounding ──────────────────────────────────────────────────────────────────

/**
 * Round to the nearest half-vano:
 *   frac < 0.25  → floor
 *   0.25 ≤ frac < 0.75 → floor + 0.5
 *   frac ≥ 0.75  → floor + 1
 */
export function roundHalfVano(v: number): number {
  const fl = Math.floor(v);
  const frac = v - fl;
  if (frac < 0.25) return fl;
  if (frac < 0.75) return fl + 0.5;
  return fl + 1;
}

// ── Room coefficient ──────────────────────────────────────────────────────────

function getRoomCoeff(roomType: RoomType, ruleSet: RuleSet): number {
  switch (roomType) {
    case 'Main':
    case 'Kitchen':
      return 1.0;
    case 'AccessoryDirect':
      return ruleSet.accessoryDirectCoeff;
    case 'AccessoryComplementary':
      return ruleSet.accessoryComplementaryCoeff;
    case 'Terrazzo': // 0 vani – area tracciata separatamente per DM 2/8/1969 cr.2
    case 'Excluded':
      return 0;
  }
}

// ── Trace types ───────────────────────────────────────────────────────────────

export interface RoomContribution {
  roomId: string;
  roomName: string;
  roomType: RoomType;
  areaMq: number;
  baseCoeff: number;
  vaniEquivalent: number;
  ragguaglio: boolean;
  ragguaglioNote: string;
}

export interface FloorTrace {
  floorId: string;
  floorName: string;
  rooms: RoomContribution[];
  floorVaniRaw: number;
}

export interface ConsistenzaTrace {
  floors: FloorTrace[];
  vaniRaw: number;
  dipendenzaAdj: number;
  vaniAdjusted: number;
  vaniRounded: number;
  totalMq: number;    // superficie utile escluse terrazze/balconi (soglia 240 m² DM 2/8/1969)
  terrazzaMq: number; // superficie terrazze/balconi (soglia 65 m² DM 2/8/1969)
}

export interface RenditaResult {
  unitId: string;
  unitName: string;
  consistenza: number;
  consistenzaUnit: 'vani' | 'mq';
  tariffa: number;
  tariffaLabel: string;
  rendita: number;
  trace: ConsistenzaTrace;
  missingTariff: boolean;
}

// ── Luxury analysis types (DM 2 agosto 1969) ─────────────────────────────────

export interface LuxuryCriterion {
  id: number;
  label: string;
  detail: string;
  triggered: boolean;
}

export interface LuxuryAnalysis {
  isLuxury: boolean;
  triggeredCount: number;
  criteria: LuxuryCriterion[];
}

export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  dwelling?: RenditaResult;
  pertinenza?: RenditaResult;
  renditaTotale: number;
  imuBase?: number;
  imuEstimate?: number;
  warnings: string[];
  flags: {
    luxuryAnalysis: LuxuryAnalysis; // DM 2 agosto 1969 – tutti i criteri
    imuAtRisk: boolean;             // category A/1 A/8 A/9
    pertinenzaAgevolabile: boolean;
  };
}

// ── Consistenza for Group A (vani) ────────────────────────────────────────────

export function calculateConsistenzaVani(unit: Unit, ruleSet: RuleSet): ConsistenzaTrace {
  const floors: FloorTrace[] = [];
  let vaniRaw = 0;
  let totalMq = 0;
  let terrazzaMq = 0;

  for (const floor of unit.floors) {
    const roomContribs: RoomContribution[] = [];
    let floorVani = 0;

    for (const room of floor.rooms) {
      const baseCoeff = getRoomCoeff(room.roomType, ruleSet);
      if (room.roomType === 'Terrazzo') {
        terrazzaMq += room.areaMq;
      } else if (room.roomType !== 'Excluded') {
        totalMq += room.areaMq;
      }

      if (baseCoeff === 0) {
        roomContribs.push({
          roomId: room.id,
          roomName: room.name,
          roomType: room.roomType,
          areaMq: room.areaMq,
          baseCoeff: 0,
          vaniEquivalent: 0,
          ragguaglio: false,
          ragguaglioNote: '',
        });
        continue;
      }

      let vaniEq = baseCoeff;
      let ragguaglio = false;
      let ragguaglioNote = '';

      if (
        ruleSet.applyLargeRoomRagguaglio &&
        (room.roomType === 'Main' || room.roomType === 'Kitchen') &&
        room.areaMq > ruleSet.vanoMaxMq
      ) {
        vaniEq = 1 + (room.areaMq - ruleSet.vanoMaxMq) / ruleSet.vanoMaxMq;
        ragguaglio = true;
        ragguaglioNote = `Ragguaglio: 1 + (${room.areaMq} - ${ruleSet.vanoMaxMq}) / ${ruleSet.vanoMaxMq} = ${vaniEq.toFixed(3)}`;
      }

      roomContribs.push({
        roomId: room.id,
        roomName: room.name,
        roomType: room.roomType,
        areaMq: room.areaMq,
        baseCoeff,
        vaniEquivalent: vaniEq,
        ragguaglio,
        ragguaglioNote,
      });
      floorVani += vaniEq;
    }

    floors.push({ floorId: floor.id, floorName: floor.name, rooms: roomContribs, floorVaniRaw: floorVani });
    vaniRaw += floorVani;
  }

  const dipendenzaAdj = vaniRaw * ruleSet.dipendenzePct;
  const vaniAdjusted = vaniRaw + dipendenzaAdj;
  const vaniRounded = roundHalfVano(vaniAdjusted);

  return { floors, vaniRaw, dipendenzaAdj, vaniAdjusted, vaniRounded, totalMq, terrazzaMq };
}

// ── Consistenza for Group C (m²) ──────────────────────────────────────────────

export function calculateConsistenzaMq(unit: Unit): { mq: number; trace: ConsistenzaTrace } {
  const floors: FloorTrace[] = [];
  let mq = 0;

  for (const floor of unit.floors) {
    const roomContribs: RoomContribution[] = [];
    let floorMq = 0;

    for (const room of floor.rooms) {
      const included = room.roomType !== 'Excluded';
      const contrib = included ? room.areaMq : 0;
      floorMq += contrib;
      roomContribs.push({
        roomId: room.id,
        roomName: room.name,
        roomType: room.roomType,
        areaMq: room.areaMq,
        baseCoeff: included ? 1 : 0,
        vaniEquivalent: contrib,
        ragguaglio: false,
        ragguaglioNote: '',
      });
    }

    floors.push({ floorId: floor.id, floorName: floor.name, rooms: roomContribs, floorVaniRaw: floorMq });
    mq += floorMq;
  }

  return {
    mq,
    trace: {
      floors,
      vaniRaw: mq,
      dipendenzaAdj: 0,
      vaniAdjusted: mq,
      vaniRounded: mq,
      totalMq: mq,
      terrazzaMq: 0,
    },
  };
}

// ── Tariff lookup ─────────────────────────────────────────────────────────────

export function findTariff(tariffs: Tariff[], category: string, classe: string): Tariff | undefined {
  return tariffs.find(t => t.category === category && t.classe === classe);
}

// ── IMU calculation ───────────────────────────────────────────────────────────

const IMU_LUXURY = ['A/1', 'A/8', 'A/9'];

export function calculateImu(
  rendita: number,
  category: string,
  aliquota: number,
  isMainHome: boolean,
  detrazione: number,
): { base: number; imu: number } {
  const moltiplicatore = category === 'C/1' ? 55 : 160;
  const base = rendita * 1.05 * moltiplicatore;

  // Main home exemption: only luxury categories pay IMU even as main home
  if (isMainHome && !IMU_LUXURY.includes(category)) {
    return { base, imu: 0 };
  }

  return { base, imu: Math.max(0, base * aliquota - detrazione) };
}

// ── Luxury analysis (DM 2 agosto 1969) ────────────────────────────────────────────────────────

function analyzeLuxury(unit: Unit | undefined, totalMq: number, terrazzaMq: number): LuxuryAnalysis {
  if (!unit) return { isLuxury: false, triggeredCount: 0, criteria: [] };

  const allRooms = unit.floors.flatMap(f => f.rooms);
  const habitableRooms = allRooms.filter(r => r.roomType !== 'Excluded' && r.roomType !== 'Terrazzo');

  const c1 = totalMq > 240;
  const c2 = terrazzaMq > 65;
  const c3 = unit.hasPool ?? false;
  const c4 = unit.hasPrivateLift ?? false;
  const roomsPregio = habitableRooms.filter(r => r.luxuryMaterials);
  const c5 = roomsPregio.length > 0;
  const c6 = habitableRooms.length > 0 && habitableRooms.every(r => r.centralHeating);
  const gardenRatio = totalMq > 0 ? (unit.gardenMq ?? 0) / totalMq : 0;
  const c7 = (unit.isVilla ?? false) && gardenRatio > 6;

  const criteria: LuxuryCriterion[] = [
    {
      id: 1,
      label: 'Superficie utile > 240 m²',
      detail: `${totalMq.toFixed(1)} m² (terrazze/balconi esclusi)`,
      triggered: c1,
    },
    {
      id: 2,
      label: 'Terrazze/balconi > 65 m²',
      detail: `${terrazzaMq.toFixed(1)} m² di terrazze/balconi inseriti`,
      triggered: c2,
    },
    {
      id: 3,
      label: 'Piscina scoperta ≥ 80 m² o maneggio',
      detail: c3 ? 'Segnalato sull’unità' : 'Non segnalato',
      triggered: c3,
    },
    {
      id: 4,
      label: 'Ascensore al servizio di <4 appartamenti',
      detail: c4 ? 'Segnalato sull’unità' : 'Non segnalato',
      triggered: c4,
    },
    {
      id: 5,
      label: 'Materiali di pregio in almeno un locale',
      detail: c5
        ? `${roomsPregio.length} locale/i: ${roomsPregio.map(r => r.name).join(', ')}`
        : 'Nessun locale segnalato',
      triggered: c5,
    },
    {
      id: 6,
      label: 'Riscaldamento centralizzato in ogni locale',
      detail: `${habitableRooms.filter(r => r.centralHeating).length}/${habitableRooms.length} locali con riscaldamento centralizzato`,
      triggered: c6,
    },
    {
      id: 7,
      label: 'Villa unifamiliare con giardino > 6× superficie coperta',
      detail: (unit.isVilla ?? false)
        ? `Giardino: ${(unit.gardenMq ?? 0).toFixed(0)} m² — rapporto ${gardenRatio.toFixed(2)}× (soglia: >6×)`
        : 'Non applicabile (non è villa unifamiliare)',
      triggered: c7,
    },
  ];

  const triggeredCount = criteria.filter(c => c.triggered).length;
  return { isLuxury: triggeredCount > 0, triggeredCount, criteria };
}

// ── Merge utility for fusion scenarios ──────────────────────────────────────

export function mergeUnits(units: Unit[]): Unit {
  return {
    id: 'fusion_' + units.map(u => u.id).join('_'),
    name: units.map(u => u.name).join(' + '),
    unitType: 'DwellingA',
    targetCategory: units[0]?.targetCategory ?? 'A/3',
    targetClass: units[0]?.targetClass ?? '1',
    floors: units.flatMap(u => u.floors),
  };
}

// ── Scenario runner ───────────────────────────────────────────────────────────

const PERTINENZA_AGEVOLABILE = ['C/2', 'C/6', 'C/7'];

export function runScenario(params: {
  scenarioId: string;
  scenarioName: string;
  dwellingUnit?: Unit;
  dwellingCategory: string;
  dwellingClass: string;
  pertinenzaUnit?: Unit;
  pertinenzaCategory: string;
  pertinenzaClass: string;
  enablePertinenza: boolean;
  tariffs: Tariff[];
  ruleSet: RuleSet;
  enableImu: boolean;
  imuAliquota: number;
  imuIsMainHome: boolean;
  imuDetrazione: number;
}): ScenarioResult {
  const {
    scenarioId, scenarioName,
    dwellingUnit, dwellingCategory, dwellingClass,
    pertinenzaUnit, pertinenzaCategory, pertinenzaClass,
    enablePertinenza, tariffs, ruleSet,
    enableImu, imuAliquota, imuIsMainHome, imuDetrazione,
  } = params;

  const warnings: string[] = [];
  let dwelling: RenditaResult | undefined;
  let pertinenza: RenditaResult | undefined;

  // ── Dwelling (Group A) ────
  if (dwellingUnit) {
    const trace = calculateConsistenzaVani(dwellingUnit, ruleSet);
    const tariff = findTariff(tariffs, dwellingCategory, dwellingClass);
    const tariffa = tariff?.value ?? 0;
    const missingTariff = !tariff;
    if (missingTariff) {
      warnings.push(`Tariffa non trovata per ${dwellingCategory} classe ${dwellingClass}`);
    }
    dwelling = {
      unitId: dwellingUnit.id,
      unitName: dwellingUnit.name,
      consistenza: trace.vaniRounded,
      consistenzaUnit: 'vani',
      tariffa,
      tariffaLabel: tariff ? `${dwellingCategory} cl.${dwellingClass} → ${tariffa} €/vano` : 'Tariffa mancante',
      rendita: trace.vaniRounded * tariffa,
      trace,
      missingTariff,
    };

    // Risk: luxury surface
    if (dwelling.trace.totalMq > 240) {
      warnings.push(`Superficie utile ~${dwelling.trace.totalMq.toFixed(0)} m² > 240 m²: possibile abitazione di lusso (DM 2/8/1969 cr.1)`);
    }
  }

  // ── Luxury analysis ────
  const luxuryAnalysis = analyzeLuxury(
    dwellingUnit,
    dwelling?.trace.totalMq ?? 0,
    dwelling?.trace.terrazzaMq ?? 0,
  );
  if (luxuryAnalysis.isLuxury) {
    const ids = luxuryAnalysis.criteria.filter(c => c.triggered).map(c => `cr.${c.id}`).join(', ');
    const msg = `Possibile abitazione di lusso DM 2/8/1969 (${ids}) → verificare classamento in A/1, A/8 o A/9`;
    if (!warnings.includes(msg)) warnings.push(msg);
  }

  // ── Pertinenza (Group C) ────
  if (enablePertinenza && pertinenzaUnit) {
    const { mq, trace } = calculateConsistenzaMq(pertinenzaUnit);
    const tariff = findTariff(tariffs, pertinenzaCategory, pertinenzaClass);
    const tariffa = tariff?.value ?? 0;
    const missingTariff = !tariff;
    if (missingTariff) {
      warnings.push(`Tariffa non trovata per ${pertinenzaCategory} classe ${pertinenzaClass}`);
    }
    pertinenza = {
      unitId: pertinenzaUnit.id,
      unitName: pertinenzaUnit.name,
      consistenza: mq,
      consistenzaUnit: 'mq',
      tariffa,
      tariffaLabel: tariff ? `${pertinenzaCategory} cl.${pertinenzaClass} → ${tariffa} €/m²` : 'Tariffa mancante',
      rendita: mq * tariffa,
      trace,
      missingTariff,
    };
  }

  const renditaTotale = (dwelling?.rendita ?? 0) + (pertinenza?.rendita ?? 0);

  // ── Flags ────
  const imuAtRisk = IMU_LUXURY.includes(dwellingCategory);
  const pertinenzaAgevolabile = enablePertinenza
    ? PERTINENZA_AGEVOLABILE.includes(pertinenzaCategory)
    : true;

  if (imuAtRisk) {
    warnings.push(`Categoria ${dwellingCategory}: IMU dovuta anche come abitazione principale`);
  }
  if (enablePertinenza && !pertinenzaAgevolabile) {
    warnings.push(`Pertinenza ${pertinenzaCategory}: non agevolabile per IMU abitazione principale (solo C/2, C/6, C/7)`);
  }

  // ── IMU ────
  let imuBase: number | undefined;
  let imuEstimate: number | undefined;

  if (enableImu && dwellingUnit) {
    const result = calculateImu(renditaTotale, dwellingCategory, imuAliquota, imuIsMainHome, imuDetrazione);
    imuBase = result.base;
    imuEstimate = result.imu;
  }

  return {
    scenarioId,
    scenarioName,
    dwelling,
    pertinenza,
    renditaTotale,
    imuBase,
    imuEstimate,
    warnings,
    flags: { luxuryAnalysis, imuAtRisk, pertinenzaAgevolabile },
  };
}
