import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
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
  FormControlLabel,
  Switch,
  Chip,
  IconButton,
  Grid,
  Alert,
  Tooltip,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useProject } from '../context/ProjectContext';
import { Scenario, CATEGORY_OPTIONS_A, CATEGORY_OPTIONS_C, CLASS_OPTIONS } from '../models/types';
import InfoTooltip from './InfoTooltip';

function emptyScenario(dwellingUnitId = '', pertinenzaUnitId = ''): Omit<Scenario, 'id'> {
  return {
    name: '',
    dwellingUnitId,
    dwellingCategory: 'A/3',
    dwellingClass: '1',
    pertinenzaUnitId,
    pertinenzaCategory: 'C/2',
    pertinenzaClass: '1',
    enablePertinenza: false,
    enableImu: false,
    imuAliquota: 0.0076,
    imuIsMainHome: true,
    imuDetrazione: 200,
  };
}

interface ScenarioDialogProps {
  open: boolean;
  initial?: Scenario;
  onClose: () => void;
  onSave: (data: Omit<Scenario, 'id'>) => void;
}

function ScenarioDialog({ open, initial, onClose, onSave }: ScenarioDialogProps) {
  const { project } = useProject();
  const dwellingUnits = project.units.filter(u => u.unitType === 'DwellingA' || u.unitType === 'Other');
  const pertinenzaUnits = project.units.filter(u => u.unitType === 'PertinenzaC' || u.unitType === 'Other');

  const [form, setForm] = useState<Omit<Scenario, 'id'>>(
    initial
      ? {
          name: initial.name,
          dwellingUnitId: initial.dwellingUnitId,
          dwellingCategory: initial.dwellingCategory,
          dwellingClass: initial.dwellingClass,
          pertinenzaUnitId: initial.pertinenzaUnitId,
          pertinenzaCategory: initial.pertinenzaCategory,
          pertinenzaClass: initial.pertinenzaClass,
          enablePertinenza: initial.enablePertinenza,
          enableImu: initial.enableImu,
          imuAliquota: initial.imuAliquota,
          imuIsMainHome: initial.imuIsMainHome,
          imuDetrazione: initial.imuDetrazione,
        }
      : emptyScenario(dwellingUnits[0]?.id ?? '', pertinenzaUnits[0]?.id ?? ''),
  );

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  function handleClose() {
    onClose();
  }

  function handleSave() {
    if (!form.name.trim() || !form.dwellingUnitId) return;
    onSave({ ...form, name: form.name.trim() });
    handleClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{initial ? 'Modifica Scenario' : 'Nuovo Scenario'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            fullWidth
            label="Nome Scenario"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="es. S1 – A/3 invariato + C/2 pertinenza"
            helperText="Nome libero per distinguere gli scenari nel confronto finale"
          />

          <Alert severity="info" sx={{ py: 0.5 }}>
            Ogni scenario associa la geometria inserita a una <strong>categoria/classe catastale</strong> e
            a una <strong>tariffa d’estimo</strong>. Puoi creare più scenari per confrontare ipotesi diverse
            (es. categoria attuale vs categoria prevista dopo la fusione).
          </Alert>

          {/* ── Abitazione ──────────────────────────────────────────── */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Abitazione Principale (Gruppo A)
              </Typography>
              <InfoTooltip text="Categoria: leggi dalla visura catastale attuale (es. 'A/3') oppure scegli la categoria che pensi verrà assegnata post-fusione. Per confronto: A/1=signorile, A/2=civile, A/3=economica, A/4=popolare, A/5=ultrapopolare, A/6=rurale, A/7=villini, A/8=ville, A/9=castelli. Classe: 1=peggio, usualmente 3–5=ottimo nella zona." />
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Unità</InputLabel>
                  <Select
                    value={form.dwellingUnitId}
                    label="Unità"
                    onChange={e => set('dwellingUnitId', e.target.value)}
                  >
                    {dwellingUnits.length === 0 && (
                      <MenuItem value="" disabled>Nessuna unità abitazione</MenuItem>
                    )}
                    {dwellingUnits.map(u => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Categoria</InputLabel>
                  <Select
                    value={form.dwellingCategory}
                    label="Categoria"
                    onChange={e => set('dwellingCategory', e.target.value)}
                  >
                    {CATEGORY_OPTIONS_A.map(c => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Classe</InputLabel>
                  <Select
                    value={form.dwellingClass}
                    label="Classe"
                    onChange={e => set('dwellingClass', e.target.value)}
                  >
                    {CLASS_OPTIONS.map(c => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* ── Pertinenza ──────────────────────────────────────────── */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.enablePertinenza}
                  onChange={e => set('enablePertinenza', e.target.checked)}
                />
              }
              label={<Typography variant="subtitle2" fontWeight={700}>Pertinenza (Gruppo C)</Typography>}
            />
            {form.enablePertinenza && (
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Unità Pertinenza</InputLabel>
                    <Select
                      value={form.pertinenzaUnitId}
                      label="Unità Pertinenza"
                      onChange={e => set('pertinenzaUnitId', e.target.value)}
                    >
                      {pertinenzaUnits.length === 0 && (
                        <MenuItem value="" disabled>Nessuna unità pertinenza</MenuItem>
                      )}
                      {pertinenzaUnits.map(u => (
                        <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Categoria</InputLabel>
                    <Select
                      value={form.pertinenzaCategory}
                      label="Categoria"
                      onChange={e => set('pertinenzaCategory', e.target.value)}
                    >
                      {CATEGORY_OPTIONS_C.map(c => (
                        <MenuItem key={c} value={c}>{c}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Classe</InputLabel>
                    <Select
                      value={form.pertinenzaClass}
                      label="Classe"
                      onChange={e => set('pertinenzaClass', e.target.value)}
                    >
                      {CLASS_OPTIONS.map(c => (
                        <MenuItem key={c} value={c}>{c}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            )}
          </Paper>

          {/* ── IMU ─────────────────────────────────────────────────── */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.enableImu}
                  onChange={e => set('enableImu', e.target.checked)}
                />
              }
              label={<Typography variant="subtitle2" fontWeight={700}>Stima IMU</Typography>}
            />
            {form.enableImu && (
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Aliquota IMU (%)"
                    type="number"
                    inputProps={{ step: '0.01', min: '0', max: '10.6' }}
                    value={(form.imuAliquota * 100).toFixed(2)}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) set('imuAliquota', v / 100);
                    }}
                    helperText="Trovala nella delibera comunale IMU del tuo Comune"
                    InputProps={{
                      endAdornment: (
                        <InfoTooltip text="L'aliquota IMU è fissata ogni anno dalla delibera comunale. Cercala sul sito del tuo Comune, sezione 'Tributi / IMU', oppure sul portale del MEF (finanze.gov.it → fiscalità locale). L'aliquota base di legge è 0.76% (7.6‰). I Comuni possono modificarla entro i limiti di legge. Per 'abitazione principale' le categorie A/2–A/7 sono di norma esenti da IMU; A/1, A/8, A/9 pagano IMU anche come abitazione principale." />
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Detrazione IMU (€)"
                    type="number"
                    inputProps={{ step: '50', min: '0' }}
                    value={form.imuDetrazione}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) set('imuDetrazione', v);
                    }}
                    helperText="200 € fissi per legge per le cat. A/1, A/8, A/9 (abitaz. principale)"
                    InputProps={{
                      endAdornment: (
                        <InfoTooltip text="La detrazione di 200 € è prevista per legge solo per le categorie A/1, A/8 e A/9 usate come abitazione principale. Per le altre categorie A/2–A/7 l'IMU è normalmente assente se è abitazione principale, quindi la detrazione non si applica. Inserisci 0 se non applicabile." />
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.imuIsMainHome}
                        onChange={e => set('imuIsMainHome', e.target.checked)}
                      />
                    }
                    label="Abitazione principale"
                  />
                </Grid>
              </Grid>
            )}
          </Paper>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annulla</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!form.name.trim() || !form.dwellingUnitId}
        >
          {initial ? 'Salva' : 'Aggiungi'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── ScenariTab ────────────────────────────────────────────────────────────────

export default function ScenariTab() {
  const { project, addScenario, updateScenario, deleteScenario } = useProject();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editScenario, setEditScenario] = useState<Scenario | null>(null);

  function getUnitName(id: string) {
    return project.units.find(u => u.id === id)?.name ?? '(non trovata)';
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Scenari di Calcolo
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Crea uno o più scenari per confrontare i risultati con diverse ipotesi di categoria/classe
        (es. A/3 invariato vs A/2 riclassificato). Ogni scenario usa la stessa geometria ma tariffe
        diverse. La rendita catastale finale si calcola nella scheda <strong>Risultati</strong>.
      </Alert>

      {project.units.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Aggiungi prima le unità immobiliari nella scheda "Unità".
        </Alert>
      )}

      {project.tariffs.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Aggiungi le tariffe d'estimo nella scheda "Tariffe" per ottenere i valori di rendita.
        </Alert>
      )}

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => { setEditScenario(null); setDialogOpen(true); }}
        sx={{ mb: 2 }}
        disabled={project.units.length === 0}
      >
        Aggiungi Scenario
      </Button>

      {project.scenarios.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          Nessuno scenario configurato. Crea almeno uno scenario per calcolare la rendita.
        </Paper>
      )}

      {project.scenarios.map(s => (
        <Accordion key={s.id} sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', pr: 2 }}>
              <Typography sx={{ flex: 1, fontWeight: 600 }}>{s.name}</Typography>
              <Chip label={s.dwellingCategory} size="small" color="primary" />
              {s.enablePertinenza && (
                <Chip label={`+ ${s.pertinenzaCategory}`} size="small" color="secondary" />
              )}
              {s.enableImu && <Chip label="IMU" size="small" color="warning" />}
              <Tooltip title="Modifica">
                <IconButton size="small" onClick={e => { e.stopPropagation(); setEditScenario(s); setDialogOpen(true); }}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Elimina">
                <IconButton
                  size="small"
                  color="error"
                  onClick={e => {
                    e.stopPropagation();
                    if (window.confirm(`Eliminare lo scenario "${s.name}"?`)) deleteScenario(s.id);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Abitazione</Typography>
                <Typography variant="body1">
                  {getUnitName(s.dwellingUnitId)} — {s.dwellingCategory} cl.{s.dwellingClass}
                </Typography>
              </Grid>
              {s.enablePertinenza && (
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Pertinenza</Typography>
                  <Typography variant="body1">
                    {getUnitName(s.pertinenzaUnitId)} — {s.pertinenzaCategory} cl.{s.pertinenzaClass}
                  </Typography>
                </Grid>
              )}
              {s.enableImu && (
                <Grid item xs={12}>
                  <Divider sx={{ mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    IMU: aliquota {(s.imuAliquota * 100).toFixed(2)}% — detrazione {s.imuDetrazione} € —{' '}
                    {s.imuIsMainHome ? 'abitazione principale' : 'seconda casa / altro'}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Dialog: add */}
      <ScenarioDialog
        open={dialogOpen && !editScenario}
        onClose={() => setDialogOpen(false)}
        onSave={data => {
          addScenario(data);
          setDialogOpen(false);
        }}
      />

      {/* Dialog: edit */}
      {editScenario && (
        <ScenarioDialog
          open={dialogOpen}
          initial={editScenario}
          onClose={() => { setDialogOpen(false); setEditScenario(null); }}
          onSave={data => {
            updateScenario(editScenario.id, data);
            setDialogOpen(false);
            setEditScenario(null);
          }}
        />
      )}
    </Box>
  );
}
