import { useEffect, useRef, useState, useCallback } from 'react';
import { ref, onValue, update, set, get } from 'firebase/database';
import { database, isFirebaseConfigured } from './config';
import { seedBeds, emptyBed, BED_COUNT } from '../data/bedSeed';
import { seedDemoBeds, stepSimulation } from '../data/simulate';
import { rangesFor, classify, worstStatus, STATUS_RANK } from '../data/vitalRanges';

const STALE_MS = 8000; // no sensor push for 8s+ while occupied => "signal fault"
const TRACE_LEN = 30;

export function computeStatus(bed) {
  if (!bed || !bed.mode) return 'vacant';
  const r = rangesFor(bed.mode);
  const stale = bed.lastUpdate && Date.now() - bed.lastUpdate > STALE_MS;

  const vitalStatuses = Object.keys(r).map((k) =>
    bed.vitals && bed.vitals[k] != null ? classify(bed.vitals[k], r[k]) : 'fault'
  );
  let worst = worstStatus(vitalStatuses);

  if (bed.ivPrescribedRate > 0 && bed.iv && bed.iv.rate != null) {
    const dev = Math.abs(bed.iv.rate - bed.ivPrescribedRate) / bed.ivPrescribedRate;
    const ivStatus = dev > 0.25 ? 'critical' : dev > 0.12 ? 'warning' : 'stable';
    worst = worstStatus([worst, ivStatus]);
  }

  if (stale) worst = STATUS_RANK[worst] > STATUS_RANK.warning ? worst : 'fault';
  return worst;
}

export function useWardData() {
  const [beds, setBeds] = useState(() => seedBeds());
  const [traces, setTraces] = useState({});
  const [auditLog, setAuditLog] = useState({}); // { [bedId]: [{t, text}] }
  const prevStatus = useRef({});
  const demoSeeded = useRef(false);

  const logAudit = useCallback((bedId, text) => {
    setAuditLog((prev) => {
      const list = [{ t: Date.now(), text }, ...(prev[bedId] || [])].slice(0, 10);
      return { ...prev, [bedId]: list };
    });
  }, []);

  // --- Data source: Firebase (production) or local simulation (demo) ---
  useEffect(() => {
    if (isFirebaseConfigured) {
      const bedsRef = ref(database, 'beds');
      // Self-provision: if the DB has no beds node yet, create empty beds.
      get(bedsRef).then((snap) => {
        if (!snap.exists()) set(bedsRef, seedBeds());
      });
      const unsub = onValue(bedsRef, (snap) => {
        const val = snap.val();
        if (val) setBeds(val);
      });
      return () => unsub();
    }

    // --- Simulation fallback ---
    if (!demoSeeded.current) {
      setBeds((b) => seedDemoBeds(b));
      demoSeeded.current = true;
    }
    const interval = setInterval(() => {
      setBeds((b) => stepSimulation(b));
    }, 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Derived: hr trace history per bed, for the sparkline ---
  useEffect(() => {
    setTraces((prev) => {
      const next = { ...prev };
      Object.values(beds).forEach((bed) => {
        if (!bed.mode || bed.vitals?.hr == null) return;
        const list = [...(next[bed.id] || []), bed.vitals.hr].slice(-TRACE_LEN);
        next[bed.id] = list;
      });
      return next;
    });
  }, [beds]);

  // --- Derived: auto-clear the "acknowledged" flag when status changes ---
  useEffect(() => {
    Object.values(beds).forEach((bed) => {
      const status = computeStatus(bed);
      if (prevStatus.current[bed.id] && prevStatus.current[bed.id] !== status && bed.ack) {
        if (isFirebaseConfigured) {
          update(ref(database, `beds/${bed.id}`), { ack: false });
        } else {
          setBeds((b) => ({ ...b, [bed.id]: { ...b[bed.id], ack: false } }));
        }
      }
      prevStatus.current[bed.id] = status;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beds]);

  const writeBed = useCallback((bedId, patch) => {
    if (isFirebaseConfigured) {
      update(ref(database, `beds/${bedId}`), patch);
    } else {
      setBeds((b) => ({ ...b, [bedId]: { ...b[bedId], ...patch } }));
    }
  }, []);

  const admitPatient = useCallback((bedId, { mode, patient, ivPrescribedRate, ivVolumeOrdered }, actor) => {
    const r = rangesFor(mode);
    const vitals = {};
    Object.keys(r).forEach((k) => { vitals[k] = (r[k].normal[0] + r[k].normal[1]) / 2; });
    writeBed(bedId, {
      mode,
      patient: { ...patient, admittedAt: Date.now() },
      ivPrescribedRate: ivPrescribedRate || 0,
      ivVolumeOrdered: ivVolumeOrdered || 0,
      vitals,
      iv: { rate: ivPrescribedRate || 0, volumeInfused: 0 },
      lastUpdate: Date.now(),
      ack: false,
    });
    logAudit(bedId, `Patient admitted (${mode === 'adult' ? 'Adult' : 'Neonatal'} mode) by ${actor}`);
  }, [writeBed, logAudit]);

  const dischargeBed = useCallback((bedId, actor) => {
    const n = Number(bedId.replace('bed', ''));
    const blank = emptyBed(n);
    if (isFirebaseConfigured) {
      set(ref(database, `beds/${bedId}`), blank);
    } else {
      setBeds((b) => ({ ...b, [bedId]: blank }));
    }
    logAudit(bedId, `Patient discharged by ${actor}`);
  }, [logAudit]);

  const acknowledgeAlarm = useCallback((bedId, actor) => {
    writeBed(bedId, { ack: true });
    logAudit(bedId, `Alarm acknowledged by ${actor}`);
  }, [writeBed, logAudit]);

  const bedList = Object.keys(beds)
    .sort()
    .map((id) => beds[id])
    .filter(Boolean);

  return {
    beds: bedList,
    traces,
    auditLog,
    admitPatient,
    dischargeBed,
    acknowledgeAlarm,
    isLive: isFirebaseConfigured,
    bedCount: BED_COUNT,
  };
}
