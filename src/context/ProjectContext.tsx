import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Project,
  Unit,
  Floor,
  Room,
  Tariff,
  Scenario,
  RuleSet,
  Jurisdiction,
  UnitType,
  RoomType,
  TariffUnit,
  TariffSource,
} from '../models/types';

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_RULESET: RuleSet = {
  accessoryDirectCoeff: 1 / 3,
  accessoryComplementaryCoeff: 1 / 4,
  applyLargeRoomRagguaglio: false,
  vanoMaxMq: 26,
  dipendenzePct: 0,
};

const DEFAULT_JURISDICTION: Jurisdiction = {
  comune: '',
  zonaCensuaria: '',
  note: '',
};

function makeDefaultProject(): Project {
  return {
    id: uuidv4(),
    name: 'Nuovo Progetto',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    jurisdiction: DEFAULT_JURISDICTION,
    ruleSet: DEFAULT_RULESET,
    units: [],
    tariffs: [],
    scenarios: [],
  };
}

// ── Context shape ─────────────────────────────────────────────────────────────

interface ProjectContextValue {
  project: Project;
  lastSaved: Date | null;

  // project-level
  updateName: (name: string) => void;
  updateJurisdiction: (updates: Partial<Jurisdiction>) => void;
  updateRuleSet: (updates: Partial<RuleSet>) => void;
  exportProject: () => void;
  importProject: (json: string) => void;
  resetProject: () => void;

  // units
  addUnit: (name: string, unitType: UnitType, category: string, classe: string) => void;
  updateUnit: (id: string, updates: Partial<Omit<Unit, 'id' | 'floors'>>) => void;
  deleteUnit: (id: string) => void;

  // floors
  addFloor: (unitId: string, name: string) => void;
  updateFloor: (unitId: string, floorId: string, name: string) => void;
  deleteFloor: (unitId: string, floorId: string) => void;

  // rooms
  addRoom: (unitId: string, floorId: string, name: string, roomType: RoomType, areaMq: number, notes?: string, luxuryMaterials?: boolean, centralHeating?: boolean) => void;
  updateRoom: (unitId: string, floorId: string, roomId: string, updates: Partial<Omit<Room, 'id'>>) => void;
  deleteRoom: (unitId: string, floorId: string, roomId: string) => void;

  // tariffs
  addTariff: (category: string, classe: string, value: number, unit: TariffUnit, sourceType: TariffSource, sourceNote: string) => void;
  updateTariff: (id: string, updates: Partial<Omit<Tariff, 'id'>>) => void;
  deleteTariff: (id: string) => void;

  // scenarios
  addScenario: (partial: Omit<Scenario, 'id'>) => void;
  updateScenario: (id: string, updates: Partial<Omit<Scenario, 'id'>>) => void;
  deleteScenario: (id: string) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'rendita_catastale_v1';

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used inside ProjectProvider');
  return ctx;
}

// ── Helper: immutable unit/floor/room updaters ────────────────────────────────

function updateUnitsIn(units: Unit[], unitId: string, fn: (u: Unit) => Unit): Unit[] {
  return units.map(u => (u.id === unitId ? fn(u) : u));
}

function updateFloorsIn(unit: Unit, floorId: string, fn: (f: Floor) => Floor): Unit {
  return { ...unit, floors: unit.floors.map(f => (f.id === floorId ? fn(f) : f)) };
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = useState<Project>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved) as Project;
    } catch {
      // ignore parse errors
    }
    return makeDefaultProject();
  });

  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save on every change
  useEffect(() => {
    const updated: Project = { ...project, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setLastSaved(new Date());
  }, [project]);

  // ── Patch helpers ────────────────────────────────────────────────────────────

  const patch = useCallback((fn: (p: Project) => Project) => {
    setProject(prev => fn(prev));
  }, []);

  // ── Project-level ops ─────────────────────────────────────────────────────────

  const updateName = useCallback((name: string) => patch(p => ({ ...p, name })), [patch]);

  const updateJurisdiction = useCallback(
    (updates: Partial<Jurisdiction>) =>
      patch(p => ({ ...p, jurisdiction: { ...p.jurisdiction, ...updates } })),
    [patch],
  );

  const updateRuleSet = useCallback(
    (updates: Partial<RuleSet>) =>
      patch(p => ({ ...p, ruleSet: { ...p.ruleSet, ...updates } })),
    [patch],
  );

  const exportProject = useCallback(() => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [project]);

  const importProject = useCallback((json: string) => {
    try {
      const imported = JSON.parse(json) as Project;
      setProject(imported);
    } catch {
      alert('File JSON non valido');
    }
  }, []);

  const resetProject = useCallback(() => {
    if (window.confirm('Sei sicuro? Tutti i dati verranno eliminati.')) {
      setProject(makeDefaultProject());
    }
  }, []);

  // ── Units ─────────────────────────────────────────────────────────────────────

  const addUnit = useCallback(
    (name: string, unitType: UnitType, targetCategory: string, targetClass: string) =>
      patch(p => ({
        ...p,
        units: [
          ...p.units,
          { id: uuidv4(), name, unitType, targetCategory, targetClass, floors: [] },
        ],
      })),
    [patch],
  );

  const updateUnit = useCallback(
    (id: string, updates: Partial<Omit<Unit, 'id' | 'floors'>>) =>
      patch(p => ({ ...p, units: updateUnitsIn(p.units, id, u => ({ ...u, ...updates })) })),
    [patch],
  );

  const deleteUnit = useCallback(
    (id: string) =>
      patch(p => ({ ...p, units: p.units.filter(u => u.id !== id) })),
    [patch],
  );

  // ── Floors ────────────────────────────────────────────────────────────────────

  const addFloor = useCallback(
    (unitId: string, name: string) =>
      patch(p => ({
        ...p,
        units: updateUnitsIn(p.units, unitId, u => ({
          ...u,
          floors: [...u.floors, { id: uuidv4(), name, rooms: [] }],
        })),
      })),
    [patch],
  );

  const updateFloor = useCallback(
    (unitId: string, floorId: string, name: string) =>
      patch(p => ({
        ...p,
        units: updateUnitsIn(p.units, unitId, u =>
          updateFloorsIn(u, floorId, f => ({ ...f, name })),
        ),
      })),
    [patch],
  );

  const deleteFloor = useCallback(
    (unitId: string, floorId: string) =>
      patch(p => ({
        ...p,
        units: updateUnitsIn(p.units, unitId, u => ({
          ...u,
          floors: u.floors.filter(f => f.id !== floorId),
        })),
      })),
    [patch],
  );

  // ── Rooms ─────────────────────────────────────────────────────────────────────

  const addRoom = useCallback(
    (unitId: string, floorId: string, name: string, roomType: RoomType, areaMq: number, notes = '', luxuryMaterials = false, centralHeating = false) =>
      patch(p => ({
        ...p,
        units: updateUnitsIn(p.units, unitId, u =>
          updateFloorsIn(u, floorId, f => ({
            ...f,
            rooms: [...f.rooms, { id: uuidv4(), name, roomType, areaMq, notes, luxuryMaterials, centralHeating }],
          })),
        ),
      })),
    [patch],
  );

  const updateRoom = useCallback(
    (unitId: string, floorId: string, roomId: string, updates: Partial<Omit<Room, 'id'>>) =>
      patch(p => ({
        ...p,
        units: updateUnitsIn(p.units, unitId, u =>
          updateFloorsIn(u, floorId, f => ({
            ...f,
            rooms: f.rooms.map(r => (r.id === roomId ? { ...r, ...updates } : r)),
          })),
        ),
      })),
    [patch],
  );

  const deleteRoom = useCallback(
    (unitId: string, floorId: string, roomId: string) =>
      patch(p => ({
        ...p,
        units: updateUnitsIn(p.units, unitId, u =>
          updateFloorsIn(u, floorId, f => ({
            ...f,
            rooms: f.rooms.filter(r => r.id !== roomId),
          })),
        ),
      })),
    [patch],
  );

  // ── Tariffs ───────────────────────────────────────────────────────────────────

  const addTariff = useCallback(
    (category: string, classe: string, value: number, unit: TariffUnit, sourceType: TariffSource, sourceNote: string) =>
      patch(p => ({
        ...p,
        tariffs: [...p.tariffs, { id: uuidv4(), category, classe, value, unit, sourceType, sourceNote }],
      })),
    [patch],
  );

  const updateTariff = useCallback(
    (id: string, updates: Partial<Omit<Tariff, 'id'>>) =>
      patch(p => ({
        ...p,
        tariffs: p.tariffs.map(t => (t.id === id ? { ...t, ...updates } : t)),
      })),
    [patch],
  );

  const deleteTariff = useCallback(
    (id: string) =>
      patch(p => ({ ...p, tariffs: p.tariffs.filter(t => t.id !== id) })),
    [patch],
  );

  // ── Scenarios ─────────────────────────────────────────────────────────────────

  const addScenario = useCallback(
    (partial: Omit<Scenario, 'id'>) =>
      patch(p => ({ ...p, scenarios: [...p.scenarios, { id: uuidv4(), ...partial }] })),
    [patch],
  );

  const updateScenario = useCallback(
    (id: string, updates: Partial<Omit<Scenario, 'id'>>) =>
      patch(p => ({
        ...p,
        scenarios: p.scenarios.map(s => (s.id === id ? { ...s, ...updates } : s)),
      })),
    [patch],
  );

  const deleteScenario = useCallback(
    (id: string) =>
      patch(p => ({ ...p, scenarios: p.scenarios.filter(s => s.id !== id) })),
    [patch],
  );

  // ── Value ─────────────────────────────────────────────────────────────────────

  const value: ProjectContextValue = {
    project,
    lastSaved,
    updateName,
    updateJurisdiction,
    updateRuleSet,
    exportProject,
    importProject,
    resetProject,
    addUnit,
    updateUnit,
    deleteUnit,
    addFloor,
    updateFloor,
    deleteFloor,
    addRoom,
    updateRoom,
    deleteRoom,
    addTariff,
    updateTariff,
    deleteTariff,
    addScenario,
    updateScenario,
    deleteScenario,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}
