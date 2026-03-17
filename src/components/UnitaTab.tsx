import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Tooltip,
  Stack,
  Alert,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ApartmentIcon from '@mui/icons-material/Apartment';
import InfoTooltip from './InfoTooltip';
import { useProject } from '../context/ProjectContext';
import {
  Unit,
  UnitType,
  UNIT_TYPE_LABELS,
  CATEGORY_OPTIONS_A,
  CATEGORY_OPTIONS_C,
  CLASS_OPTIONS,
  RoomType,
  ROOM_TYPE_LABELS,
} from '../models/types';

// ── Room type chip colors ──────────────────────────────────────────────────────

const ROOM_CHIP_COLORS: Record<
  RoomType,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
> = {
  Main: 'primary',
  Kitchen: 'success',
  AccessoryDirect: 'info',
  AccessoryComplementary: 'secondary',
  Excluded: 'default',
};

// ── Unit Dialog ───────────────────────────────────────────────────────────────

interface UnitDialogProps {
  open: boolean;
  initial?: Partial<Unit>;
  onClose: () => void;
  onSave: (name: string, unitType: UnitType, category: string, classe: string) => void;
}

function UnitDialog({ open, initial, onClose, onSave }: UnitDialogProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [unitType, setUnitType] = useState<UnitType>(initial?.unitType ?? 'DwellingA');
  const [category, setCategory] = useState(initial?.targetCategory ?? 'A/3');
  const [classe, setClasse] = useState(initial?.targetClass ?? '1');

  const catOptions = unitType === 'DwellingA' ? CATEGORY_OPTIONS_A : CATEGORY_OPTIONS_C;

  function reset() {
    setName(initial?.name ?? '');
    setUnitType(initial?.unitType ?? 'DwellingA');
    setCategory(initial?.targetCategory ?? 'A/3');
    setClasse(initial?.targetClass ?? '1');
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSave() {
    if (!name.trim()) return;
    onSave(name.trim(), unitType, category, classe);
    handleClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial?.id ? 'Modifica Unità' : 'Nuova Unità Immobiliare'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            fullWidth
            label="Nome Unità"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="es. Abitazione piano terra-primo-secondo"
            helperText="Nome descrittivo per identificare l'unità nel progetto (es. 'Appartamento A/3 sub. 3')."
          />
          <FormControl fullWidth>
            <InputLabel>Tipo Unità</InputLabel>
            <Select
              value={unitType}
              label="Tipo Unità"
              onChange={e => {
                const t = e.target.value as UnitType;
                setUnitType(t);
                setCategory(t === 'DwellingA' ? 'A/3' : 'C/2');
              }}
            >
              {(['DwellingA', 'PertinenzaC', 'Other'] as UnitType[]).map(t => (
                <MenuItem key={t} value={t}>
                  {UNIT_TYPE_LABELS[t]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Alert severity="info" sx={{ py: 0.5 }}>
            <strong>Abitazione (Gruppo A)</strong>: le unità abitative (A/1–A/11) hanno
            consistenza in <em>vani</em>.
            <br />
            <strong>Pertinenza (Gruppo C)</strong>: magazzini, depositi, box ecc. (C/1–C/7) hanno
            consistenza in <em>m²</em>. La pertinenza IMU-agevolabile deve essere C/2, C/6 o C/7.
          </Alert>
          {unitType !== 'Other' && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Categoria Target</InputLabel>
                <Select
                  value={category}
                  label="Categoria Target"
                  onChange={e => setCategory(e.target.value)}
                >
                  {catOptions.map(c => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Classe</InputLabel>
                <Select
                  value={classe}
                  label="Classe"
                  onChange={e => setClasse(e.target.value)}
                >
                  {CLASS_OPTIONS.map(c => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <InfoTooltip text="Categoria e classe si leggono dalla visura catastale attuale dell'unità (es. 'Cat: A/3 – Cl: 2'). Se stai simulando uno scenario post-fusione, scegli la categoria che ipotizzi assegnerà l'Agenzia (di solito A/3 o A/2). Usa la scheda Scenari per confrontare più ipotesi." />
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annulla</Button>
        <Button variant="contained" onClick={handleSave} disabled={!name.trim()}>
          {initial?.id ? 'Salva' : 'Aggiungi'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Room Dialog ───────────────────────────────────────────────────────────────

interface RoomDialogProps {
  open: boolean;
  title: string;
  initial?: { name?: string; roomType?: RoomType; areaMq?: number; notes?: string };
  onClose: () => void;
  onSave: (name: string, roomType: RoomType, areaMq: number, notes: string) => void;
}

function RoomDialog({ open, title, initial, onClose, onSave }: RoomDialogProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [roomType, setRoomType] = useState<RoomType>(initial?.roomType ?? 'Main');
  const [areaMq, setAreaMq] = useState(initial?.areaMq?.toString() ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  function handleClose() {
    setName(initial?.name ?? '');
    setRoomType(initial?.roomType ?? 'Main');
    setAreaMq(initial?.areaMq?.toString() ?? '');
    setNotes(initial?.notes ?? '');
    onClose();
  }

  function handleSave() {
    const area = parseFloat(areaMq);
    if (!name.trim() || isNaN(area) || area <= 0) return;
    onSave(name.trim(), roomType, area, notes);
    handleClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            fullWidth
            label="Nome Vano"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="es. Soggiorno, Camera matrimoniale, Bagno..."
            helperText="Usa nomi descrittivi come in planimetria: 'Camera 1', 'Bagno padronale', 'Ripostiglio'"
          />
          <FormControl fullWidth>
            <InputLabel>Tipo Vano</InputLabel>
            <Select
              value={roomType}
              label="Tipo Vano"
              onChange={e => setRoomType(e.target.value as RoomType)}
            >
              {(Object.keys(ROOM_TYPE_LABELS) as RoomType[]).map(rt => (
                <MenuItem key={rt} value={rt}>
                  {ROOM_TYPE_LABELS[rt]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Alert severity="info" sx={{ py: 0.5 }}>
            <strong>Principale</strong>: soggiorni, camere da letto, studi, sale → 1 vano ciascuno.<br />
            <strong>Cucina</strong>: cucina abitabile con impianti fissi → 1 vano (come principale).<br />
            <strong>Accessorio diretto</strong>: bagni, ingressi, corridoi, disimpegni, ripostigli di servizio → contato 1/3 di vano.<br />
            <strong>Accessorio complementare</strong>: cantine, soffitte, sgomberi a sé → contato 1/4 di vano.<br />
            <strong>Escluso</strong>: spazi non computabili (es. vano scala condominiale, locale tecnico).
          </Alert>
          <TextField
            fullWidth
            label="Area Netta (m²)"
            type="number"
            inputProps={{ step: '0.5', min: '0.1' }}
            value={areaMq}
            onChange={e => setAreaMq(e.target.value)}
            helperText="Area netta interna al lordo dei muri interni, al netto dei muri perimetrali — leggila dalla planimetria catastale"
            InputProps={{
              endAdornment: (
                <InfoTooltip text="L'area di ogni vano si legge dalla planimetria catastale depositata (disponibile in visura su Sister). In alternativa, misurarla direttamente con metro o laser. Usare sempre l'area NETTA interna (esclusi i muri perimetrali), non la superficie lorda. La planimetria catastale riporta di solito le dimensioni di ciascun locale." />
              ),
            }}
          />
          <TextField
            fullWidth
            label="Note"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            multiline
            rows={2}
            placeholder="es. 'balcone comunicante', 'altezza ridotta 2.20 m', 'finestra doppia esposizione'"
            helperText="Campo facoltativo per annotazioni utili al calcolo o alla verifica"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annulla</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!name.trim() || !areaMq || parseFloat(areaMq) <= 0}
        >
          Salva
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Floor section ─────────────────────────────────────────────────────────────

interface FloorSectionProps {
  unitId: string;
  floor: { id: string; name: string; rooms: { id: string; name: string; roomType: RoomType; areaMq: number; notes: string }[] };
}

function FloorSection({ unitId, floor }: FloorSectionProps) {
  const { addRoom, updateRoom, deleteRoom, updateFloor, deleteFloor } = useProject();
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<{ id: string; name: string; roomType: RoomType; areaMq: number; notes: string } | null>(null);
  const [editingFloorName, setEditingFloorName] = useState(false);
  const [floorNameVal, setFloorNameVal] = useState(floor.name);

  const totalMq = floor.rooms.filter(r => r.roomType !== 'Excluded').reduce((s, r) => s + r.areaMq, 0);

  return (
    <Box sx={{ mb: 1 }}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        {/* Floor header */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          {editingFloorName ? (
            <>
              <TextField
                size="small"
                value={floorNameVal}
                onChange={e => setFloorNameVal(e.target.value)}
                sx={{ flex: 1 }}
              />
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  updateFloor(unitId, floor.id, floorNameVal);
                  setEditingFloorName(false);
                }}
              >
                OK
              </Button>
              <Button size="small" onClick={() => setEditingFloorName(false)}>
                ✕
              </Button>
            </>
          ) : (
            <>
              <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600 }}>
                🏢 {floor.name}
              </Typography>
              <Chip label={`${floor.rooms.length} vani · ${totalMq.toFixed(1)} m²`} size="small" color="info" />
              <Tooltip title="Rinomina Piano">
                <IconButton size="small" onClick={() => { setFloorNameVal(floor.name); setEditingFloorName(true); }}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Elimina Piano">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    if (window.confirm(`Eliminare il piano "${floor.name}" e tutti i suoi vani?`)) {
                      deleteFloor(unitId, floor.id);
                    }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Stack>

        {/* Rooms table */}
        {floor.rooms.length > 0 && (
          <Table size="small" sx={{ mb: 1 }}>
            <TableHead>
              <TableRow>
                <TableCell><strong>Vano</strong></TableCell>
                <TableCell><strong>Tipo</strong></TableCell>
                <TableCell align="right"><strong>m²</strong></TableCell>
                <TableCell><strong>Note</strong></TableCell>
                <TableCell align="center"><strong>Azioni</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {floor.rooms.map(room => (
                <TableRow key={room.id} hover>
                  <TableCell>{room.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={ROOM_TYPE_LABELS[room.roomType]}
                      size="small"
                      color={ROOM_CHIP_COLORS[room.roomType]}
                    />
                  </TableCell>
                  <TableCell align="right">{room.areaMq.toFixed(1)}</TableCell>
                  <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {room.notes}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Modifica">
                      <IconButton size="small" onClick={() => setEditRoom(room)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Elimina">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteRoom(unitId, floor.id, room.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setAddRoomOpen(true)}
        >
          Aggiungi Vano
        </Button>
      </Paper>

      {/* Add room dialog */}
      <RoomDialog
        open={addRoomOpen}
        title={`Nuovo Vano – ${floor.name}`}
        onClose={() => setAddRoomOpen(false)}
        onSave={(name, roomType, areaMq, notes) => {
          addRoom(unitId, floor.id, name, roomType, areaMq, notes);
          setAddRoomOpen(false);
        }}
      />

      {/* Edit room dialog */}
      {editRoom && (
        <RoomDialog
          open={true}
          title={`Modifica Vano – ${editRoom.name}`}
          initial={editRoom}
          onClose={() => setEditRoom(null)}
          onSave={(name, roomType, areaMq, notes) => {
            updateRoom(unitId, floor.id, editRoom.id, { name, roomType, areaMq, notes });
            setEditRoom(null);
          }}
        />
      )}
    </Box>
  );
}

// ── Main UnitaTab ─────────────────────────────────────────────────────────────

export default function UnitaTab() {
  const { project, addUnit, updateUnit, deleteUnit, addFloor } = useProject();
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [addFloorDialogs, setAddFloorDialogs] = useState<Record<string, boolean>>({});
  const [newFloorNames, setNewFloorNames] = useState<Record<string, string>>({});

  const unitTypeBadge: Record<UnitType, 'primary' | 'secondary' | 'default'> = {
    DwellingA: 'primary',
    PertinenzaC: 'secondary',
    Other: 'default',
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Unità Immobiliari
      </Typography>

      {project.units.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Aggiungi le unità immobiliari da fondere. Di solito: una o più abitazioni (Gruppo A) e,
          facoltativamente, una pertinenza (Gruppo C, es. C/2 magazzino/deposito).
          <br />
          <strong>Fonte dati geometria</strong>: la planimetria catastale di ciascuna unità è
          consultabile gratuitamente su{' '}
          <a href="https://sister.agenziaentrate.gov.it" target="_blank" rel="noopener noreferrer">
            sister.agenziaentrate.gov.it
          </a>{' '}
          inserendo i dati identificativi dell'immobile (Comune, foglio, particella, subalterno).
        </Alert>
      )}

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => { setEditUnit(null); setUnitDialogOpen(true); }}
        sx={{ mb: 2 }}
      >
        Aggiungi Unità
      </Button>

      {project.units.map(unit => (
        <Accordion key={unit.id} sx={{ mb: 1 }} defaultExpanded={project.units.length === 1}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', pr: 2 }}>
              <ApartmentIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
                {unit.name}
              </Typography>
              <Chip
                label={UNIT_TYPE_LABELS[unit.unitType]}
                size="small"
                color={unitTypeBadge[unit.unitType]}
              />
              {unit.unitType !== 'Other' && (
                <Chip
                  label={`${unit.targetCategory} cl.${unit.targetClass}`}
                  size="small"
                  variant="outlined"
                />
              )}
              <Chip
                label={`${unit.floors.length} piani · ${unit.floors.reduce((s, f) => s + f.rooms.length, 0)} vani`}
                size="small"
              />
              <Tooltip title="Modifica Unità">
                <IconButton
                  size="small"
                  onClick={e => { e.stopPropagation(); setEditUnit(unit); setUnitDialogOpen(true); }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Elimina Unità">
                <IconButton
                  size="small"
                  color="error"
                  onClick={e => {
                    e.stopPropagation();
                    if (window.confirm(`Eliminare l'unità "${unit.name}"?`)) deleteUnit(unit.id);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </AccordionSummary>

          <AccordionDetails>
            {unit.floors.map(floor => (
              <FloorSection key={floor.id} unitId={unit.id} floor={floor} />
            ))}

            <Divider sx={{ my: 1 }} />

            {/* Add floor */}
            {addFloorDialogs[unit.id] ? (
              <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
                <TextField
                  size="small"
                  label="Nome Piano"
                  value={newFloorNames[unit.id] ?? ''}
                  onChange={e => setNewFloorNames(prev => ({ ...prev, [unit.id]: e.target.value }))}
                  placeholder="es. Piano Terra, Primo Piano..."
                />
                <Button
                  variant="contained"
                  size="small"
                  disabled={!newFloorNames[unit.id]?.trim()}
                  onClick={() => {
                    addFloor(unit.id, newFloorNames[unit.id].trim());
                    setNewFloorNames(prev => ({ ...prev, [unit.id]: '' }));
                    setAddFloorDialogs(prev => ({ ...prev, [unit.id]: false }));
                  }}
                >
                  Aggiungi
                </Button>
                <Button
                  size="small"
                  onClick={() => setAddFloorDialogs(prev => ({ ...prev, [unit.id]: false }))}
                >
                  Annulla
                </Button>
              </Stack>
            ) : (
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setAddFloorDialogs(prev => ({ ...prev, [unit.id]: true }))}
                sx={{ mt: 1 }}
              >
                Aggiungi Piano
              </Button>
            )}
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Unit dialog: add */}
      <UnitDialog
        open={unitDialogOpen && !editUnit}
        onClose={() => setUnitDialogOpen(false)}
        onSave={(name, unitType, category, classe) => {
          addUnit(name, unitType, category, classe);
          setUnitDialogOpen(false);
        }}
      />

      {/* Unit dialog: edit */}
      {editUnit && (
        <UnitDialog
          open={unitDialogOpen}
          initial={editUnit}
          onClose={() => { setUnitDialogOpen(false); setEditUnit(null); }}
          onSave={(name, unitType, category, classe) => {
            updateUnit(editUnit.id, { name, unitType, targetCategory: category, targetClass: classe });
            setUnitDialogOpen(false);
            setEditUnit(null);
          }}
        />
      )}
    </Box>
  );
}
