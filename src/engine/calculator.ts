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
  totalMq: number; // used also for m² units
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
    luxuryThreshold: boolean; // surface > 240 m²
    imuAtRisk: boolean;       // category A/1 A/8 A/9
    pertinenzaAgevolabile: boolean;
  };
}

// ── Consistenza for Group A (vani) ────────────────────────────────────────────

export function calculateConsistenzaVani(unit: Unit, ruleSet: RuleSet): ConsistenzaTrace {
  const floors: FloorTrace[] = [];
  let vaniRaw = 0;
  let totalMq = 0;

  for (const floor of unit.floors) {
    const roomContribs: RoomContribution[] = [];
    let floorVani = 0;

    for (const room of floor.rooms) {
      const baseCoeff = getRoomCoeff(room.roomType, ruleSet);
      totalMq += room.roomType !== 'Excluded' ? room.areaMq : 0;

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

  return { floors, vaniRaw, dipendenzaAdj, vaniAdjusted, vaniRounded, totalMq };
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
    if (trace.totalMq > 240) {
      warnings.push(`Superficie utile ~${trace.totalMq.toFixed(0)} m² > 240 m²: possibile abitazione di lusso (DM 2/8/1969)`);
    }
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
  const luxuryThreshold = (dwelling?.trace.totalMq ?? 0) > 240;
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
    flags: { luxuryThreshold, imuAtRisk, pertinenzaAgevolabile },
  };
}
