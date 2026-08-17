import { rangesFor } from './vitalRanges';

const DEMO_PATIENTS = [
  { mode: 'adult', name: 'R. Sharma', mrn: 'MRN-10231', age: 58, sex: 'Male', note: 'Post-op cardiac observation', ivRate: 80 },
  { mode: 'adult', name: 'A. Mehta', mrn: 'MRN-10244', age: 71, sex: 'Female', note: 'Sepsis, on pressors', ivRate: 60 },
  { mode: 'neonatal', name: "Baby of S. Iyer", mrn: 'MRN-10256', age: 4, sex: 'Female', note: 'Preterm, 34 wks, respiratory support', ivRate: 4 },
  { mode: 'adult', name: 'K. Verma', mrn: 'MRN-10261', age: 45, sex: 'Male', note: 'Trauma, stable post-surgery', ivRate: 100 },
];

export function seedDemoBeds(baseBeds) {
  const beds = { ...baseBeds };
  const ids = Object.keys(beds);
  DEMO_PATIENTS.forEach((p, i) => {
    if (!ids[i]) return;
    const bed = beds[ids[i]];
    const r = rangesFor(p.mode);
    const vitals = {};
    Object.keys(r).forEach((k) => {
      vitals[k] = (r[k].normal[0] + r[k].normal[1]) / 2;
    });
    beds[ids[i]] = {
      ...bed,
      mode: p.mode,
      patient: { name: p.name, mrn: p.mrn, age: p.age, sex: p.sex, note: p.note, admittedAt: Date.now() - 1000 * 60 * 40 },
      ivPrescribedRate: p.ivRate,
      ivVolumeOrdered: p.mode === 'neonatal' ? 120 : 500,
      vitals,
      iv: { rate: p.ivRate, volumeInfused: p.mode === 'neonatal' ? 18 : 140 },
      lastUpdate: Date.now(),
    };
  });
  return beds;
}

/** Advances one simulated tick for every occupied bed. Pure function —
 * takes the current beds map, returns a new one. Mirrors, in spirit, what
 * a real ESP32 node pushing noisy-but-plausible sensor data looks like. */
export function stepSimulation(beds) {
  const next = {};
  Object.entries(beds).forEach(([id, bed]) => {
    if (!bed.mode) { next[id] = bed; return; }

    const r = rangesFor(bed.mode);
    const vitals = { ...bed.vitals };
    Object.keys(r).forEach((k) => {
      const rr = r[k];
      let v = vitals[k] ?? (rr.normal[0] + rr.normal[1]) / 2;
      const span = rr.normal[1] - rr.normal[0];
      let delta = (Math.random() - 0.5) * span * 0.12;
      if (Math.random() < 0.035) delta += (Math.random() < 0.5 ? -1 : 1) * span * (0.9 + Math.random() * 0.8);
      v += delta;
      const mid = (rr.normal[0] + rr.normal[1]) / 2;
      v += (mid - v) * 0.05;
      v = Math.max(rr.min, Math.min(rr.max, v));
      vitals[k] = v;
    });

    let rate = bed.iv.rate || bed.ivPrescribedRate;
    if (bed.ivPrescribedRate > 0) {
      rate += (Math.random() - 0.5) * bed.ivPrescribedRate * 0.05;
      if (Math.random() < 0.02) rate += (Math.random() < 0.5 ? -1 : 1) * bed.ivPrescribedRate * 0.3;
      rate = Math.max(0, rate);
    }
    const volumeInfused = Math.min(
      bed.ivVolumeOrdered || 99999,
      (bed.iv.volumeInfused || 0) + rate * (2 / 3600)
    );

    next[id] = { ...bed, vitals, iv: { rate, volumeInfused }, lastUpdate: Date.now() };
  });
  return next;
}
