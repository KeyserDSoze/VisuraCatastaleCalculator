import { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Divider,
  LinearProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import { useProject } from '../context/ProjectContext';
import { runScenario, ScenarioResult, RenditaResult } from '../engine/calculator';
import { ROOM_TYPE_LABELS, RoomType } from '../models/types';

// ── Currency formatter ────────────────────────────────────────────────────────

function eur(v: number | undefined) {
  if (v === undefined) return '—';
  return v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
}

function num(v: number, decimals = 2) {
  return v.toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// ── AuditTrail for one unit result ────────────────────────────────────────────

function AuditTrailPanel({ result }: { result: RenditaResult }) {
  const trace = result.trace;

  if (result.consistenzaUnit === 'mq') {
    return (
      <Box>
        <Typography variant="body2">
          Consistenza m²: <strong>{num(trace.totalMq)} m²</strong>
        </Typography>
        <Typography variant="body2">
          Tariffa: <strong>{eur(result.tariffa)} /m²</strong>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          <strong>Rendita = {num(trace.totalMq)} × {eur(result.tariffa)} = {eur(result.rendita)}</strong>
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {trace.floors.map(floor => (
        <Box key={floor.floorId} sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            {floor.floorName} — {num(floor.floorVaniRaw)} vani grezzi
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Vano</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell align="right">m²</TableCell>
                <TableCell align="right">Coeff.</TableCell>
                <TableCell align="right">Contributo (vani)</TableCell>
                <TableCell>Note</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {floor.rooms.map(room => (
                <TableRow key={room.roomId} sx={{ opacity: room.baseCoeff === 0 ? 0.5 : 1 }}>
                  <TableCell>{room.roomName}</TableCell>
                  <TableCell>
                    <Chip
                      label={ROOM_TYPE_LABELS[room.roomType as RoomType]}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">{num(room.areaMq)}</TableCell>
                  <TableCell align="right">
                    {room.baseCoeff === 0 ? '—' : num(room.baseCoeff, 4)}
                  </TableCell>
                  <TableCell align="right">
                    <strong>{room.baseCoeff === 0 ? '—' : num(room.vaniEquivalent, 4)}</strong>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {room.ragguaglioNote}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ))}

      <Divider sx={{ my: 1 }} />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="body2">
          Vani grezzi (Σ): <strong>{num(trace.vaniRaw, 4)}</strong>
        </Typography>
        {trace.dipendenzaAdj !== 0 && (
          <Typography variant="body2">
            + Incremento dipendenze: <strong>{num(trace.dipendenzaAdj, 4)}</strong>
          </Typography>
        )}
        <Typography variant="body2">
          Vani rettificati: <strong>{num(trace.vaniAdjusted, 4)}</strong>
        </Typography>
        <Typography variant="body2">
          Arrotondamento al ½ vano: <strong>{num(trace.vaniRounded, 1)} vani</strong>
        </Typography>
        <Divider sx={{ my: 0.5 }} />
        <Typography variant="body2">
          Tariffa d'estimo: <strong>{result.tariffaLabel}</strong>
        </Typography>
        <Typography variant="body1" fontWeight={700} color="primary">
          Rendita = {num(trace.vaniRounded, 1)} × {eur(result.tariffa)} = {eur(result.rendita)}
        </Typography>
      </Box>
    </Box>
  );
}

// ── Scenario result card ──────────────────────────────────────────────────────

function ScenarioCard({ result }: { result: ScenarioResult }) {
  const { flags, warnings } = result;

  return (
    <Paper sx={{ mb: 2, overflow: 'hidden' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'primary.main',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="h6" sx={{ flex: 1 }}>
          {result.scenarioName}
        </Typography>
        {flags.luxuryThreshold && (
          <Tooltip title="Superficie > 240 m² — possibile abitazione di lusso">
            <Chip icon={<WarningAmberIcon />} label="Lusso" color="warning" size="small" />
          </Tooltip>
        )}
        {flags.imuAtRisk && (
          <Tooltip title="Categoria IMU-assoggettata anche come abitazione principale">
            <Chip icon={<WarningAmberIcon />} label="IMU a rischio" color="warning" size="small" />
          </Tooltip>
        )}
        {flags.pertinenzaAgevolabile && (
          <Tooltip title="Pertinenza agevolabile per IMU abitazione principale">
            <Chip icon={<CheckCircleIcon />} label="Pertinenza OK" color="success" size="small" />
          </Tooltip>
        )}
      </Box>

      <Box sx={{ p: 2 }}>
        {/* Warnings */}
        {warnings.map((w, i) => (
          <Alert key={i} severity="warning" sx={{ mb: 1 }} icon={<WarningAmberIcon />}>
            {w}
          </Alert>
        ))}

        {/* Summary numbers */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {result.dwelling && (
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">RC Abitazione</Typography>
                <Typography variant="h6" color="primary">
                  {eur(result.dwelling.rendita)}
                </Typography>
                <Typography variant="caption">
                  {num(result.dwelling.consistenza, 1)} vani × {eur(result.dwelling.tariffa)}/vano
                </Typography>
              </Paper>
            </Grid>
          )}
          {result.pertinenza && (
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">RC Pertinenza</Typography>
                <Typography variant="h6" color="secondary">
                  {eur(result.pertinenza.rendita)}
                </Typography>
                <Typography variant="caption">
                  {num(result.pertinenza.consistenza)} m² × {eur(result.pertinenza.tariffa)}/m²
                </Typography>
              </Paper>
            </Grid>
          )}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              variant="outlined"
              sx={{ p: 1.5, textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}
            >
              <Typography variant="caption" sx={{ opacity: 0.8 }}>RC Totale</Typography>
              <Typography variant="h6">{eur(result.renditaTotale)}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>rendita annua</Typography>
            </Paper>
          </Grid>
          {result.imuEstimate !== undefined && (
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  textAlign: 'center',
                  bgcolor: result.imuEstimate === 0 ? 'success.light' : 'warning.light',
                }}
              >
                <Typography variant="caption" color="text.secondary">IMU stimata</Typography>
                <Typography variant="h6">
                  {result.imuEstimate === 0 ? 'ESENTE' : eur(result.imuEstimate)}
                </Typography>
                {result.imuBase !== undefined && (
                  <Typography variant="caption">
                    Base: {eur(result.imuBase)}
                  </Typography>
                )}
              </Paper>
            </Grid>
          )}
        </Grid>

        {/* Audit trail */}
        {result.dwelling && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">
                Dettaglio Calcolo — {result.dwelling.unitName}
              </Typography>
              <Chip
                label={`${num(result.dwelling.consistenza, 1)} vani`}
                size="small"
                color="primary"
                sx={{ ml: 1 }}
              />
            </AccordionSummary>
            <AccordionDetails>
              <AuditTrailPanel result={result.dwelling} />
            </AccordionDetails>
          </Accordion>
        )}

        {result.pertinenza && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">
                Dettaglio Calcolo — {result.pertinenza.unitName}
              </Typography>
              <Chip
                label={`${num(result.pertinenza.consistenza)} m²`}
                size="small"
                color="secondary"
                sx={{ ml: 1 }}
              />
            </AccordionSummary>
            <AccordionDetails>
              <AuditTrailPanel result={result.pertinenza} />
            </AccordionDetails>
          </Accordion>
        )}
      </Box>
    </Paper>
  );
}

// ── Comparison table ──────────────────────────────────────────────────────────

function ComparisonTable({ results }: { results: ScenarioResult[] }) {
  if (results.length === 0) return null;
  const maxRendita = Math.max(...results.map(r => r.renditaTotale), 1);

  return (
    <Paper sx={{ mb: 3, overflow: 'hidden' }}>
      <Box sx={{ p: 2, bgcolor: 'grey.100' }}>
        <Typography variant="h6">Confronto Scenari</Typography>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Scenario</TableCell>
              <TableCell align="right">RC Abitazione</TableCell>
              <TableCell align="right">RC Pertinenza</TableCell>
              <TableCell align="right">RC Totale</TableCell>
              <TableCell align="right">IMU Stimata</TableCell>
              <TableCell>Flag</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map(r => (
              <TableRow key={r.scenarioId} hover>
                <TableCell>
                  <Typography fontWeight={600}>{r.scenarioName}</Typography>
                </TableCell>
                <TableCell align="right">{eur(r.dwelling?.rendita)}</TableCell>
                <TableCell align="right">{eur(r.pertinenza?.rendita)}</TableCell>
                <TableCell align="right">
                  <Box>
                    <Typography fontWeight={700} color="primary">
                      {eur(r.renditaTotale)}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(r.renditaTotale / maxRendita) * 100}
                      sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                    />
                  </Box>
                </TableCell>
                <TableCell align="right">
                  {r.imuEstimate !== undefined
                    ? r.imuEstimate === 0
                      ? <Chip label="ESENTE" size="small" color="success" />
                      : eur(r.imuEstimate)
                    : '—'}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {r.flags.luxuryThreshold && (
                      <Chip label="Lusso" size="small" color="warning" />
                    )}
                    {r.flags.imuAtRisk && (
                      <Chip label="IMU" size="small" color="error" />
                    )}
                    {r.warnings.length > 0 && (
                      <Tooltip title={r.warnings.join('\n')}>
                        <Chip
                          icon={<WarningAmberIcon />}
                          label={`${r.warnings.length} avvisi`}
                          size="small"
                          color="warning"
                        />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

// ── RisultatiTab ──────────────────────────────────────────────────────────────

export default function RisultatiTab() {
  const { project } = useProject();

  const results = useMemo<ScenarioResult[]>(() => {
    return project.scenarios.map(s => {
      const dwellingUnit = project.units.find(u => u.id === s.dwellingUnitId);
      const pertinenzaUnit = s.enablePertinenza
        ? project.units.find(u => u.id === s.pertinenzaUnitId)
        : undefined;

      return runScenario({
        scenarioId: s.id,
        scenarioName: s.name,
        dwellingUnit,
        dwellingCategory: s.dwellingCategory,
        dwellingClass: s.dwellingClass,
        pertinenzaUnit,
        pertinenzaCategory: s.pertinenzaCategory,
        pertinenzaClass: s.pertinenzaClass,
        enablePertinenza: s.enablePertinenza,
        tariffs: project.tariffs,
        ruleSet: project.ruleSet,
        enableImu: s.enableImu,
        imuAliquota: s.imuAliquota,
        imuIsMainHome: s.imuIsMainHome,
        imuDetrazione: s.imuDetrazione,
      });
    });
  }, [project]);

  if (project.scenarios.length === 0) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>Risultati</Typography>
        <Alert severity="info">
          Configura almeno uno scenario nella scheda "Scenari" per visualizzare i risultati.
        </Alert>
      </Box>
    );
  }

  const hasWarnings = results.some(r => r.warnings.length > 0);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Risultati del Calcolo
      </Typography>

      <Alert severity="warning" sx={{ mb: 2 }}>
        <strong>Stime indicative.</strong> I valori di rendita catastale sotto sono calcolati su base
        geometrica e tariffaria. Il classamento definitivo è determinato dall'Agenzia delle Entrate –
        Territorio. Rivolgersi a un tecnico abilitato per la pratica Docfa.
      </Alert>

      {hasWarnings && (
        <Alert severity="info" sx={{ mb: 2 }} icon={<InfoIcon />}>
          Alcuni scenari presentano avvisi. Espandi i dettagli di ciascuno scenario per visualizzarli.
        </Alert>
      )}

      <ComparisonTable results={results} />

      <Typography variant="h6" gutterBottom>
        Dettaglio per Scenario
      </Typography>

      {results.map(r => (
        <ScenarioCard key={r.scenarioId} result={r} />
      ))}
    </Box>
  );
}
