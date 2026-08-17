import { useState } from 'react';
import Modal from './Modal';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

export default function AdmitPatientModal({ bed, actorName, onClose, onSubmit }) {
  const existing = bed.patient || {};
  const [mode, setMode] = useState(bed.mode || 'adult');
  const [form, setForm] = useState({
    name: existing.name || '',
    mrn: existing.mrn || '',
    age: existing.age || '',
    sex: existing.sex || 'Female',
    bloodGroup: existing.bloodGroup || '',
    chiefComplaint: existing.chiefComplaint || '',
    diagnosis: existing.diagnosis || '',
    allergies: existing.allergies || '',
    heightCm: existing.heightCm || '',
    ageMonths: existing.ageMonths || '',
    drug: existing.drug || '',
    dose: existing.dose || '',
    pumpId: existing.pumpId || '',
    doctor: existing.doctor || '',
    nurse: existing.nurse || actorName || '',
    notes: existing.notes || '',
    ivPrescribedRate: bed.ivPrescribedRate || '',
    ivVolumeOrdered: bed.ivVolumeOrdered || '',
  });
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = () => {
    if (!form.name.trim()) { setError('Patient name is required.'); return; }
    onSubmit({
      mode,
      patient: {
        name: form.name.trim(), mrn: form.mrn.trim() || `PT-${bed.id.toUpperCase()}`,
        age: form.age, sex: form.sex, bloodGroup: form.bloodGroup,
        chiefComplaint: form.chiefComplaint, diagnosis: form.diagnosis, allergies: form.allergies,
        heightCm: form.heightCm, ageMonths: form.ageMonths,
        drug: form.drug, dose: form.dose, pumpId: form.pumpId,
        doctor: form.doctor, nurse: form.nurse, notes: form.notes,
      },
      ivPrescribedRate: Number(form.ivPrescribedRate) || 0,
      ivVolumeOrdered: Number(form.ivVolumeOrdered) || 0,
    });
  };

  return (
    <Modal title={`${bed.label} — Admit / Edit Patient`} onClose={onClose} wide>
      <div className="mb-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => setMode('adult')}
          className={`rounded-xl border p-3.5 text-center text-sm font-bold transition ${
            mode === 'adult' ? 'border-cyan-500 bg-cyan-50 text-cyan-700 dark:border-cyan-400 dark:bg-cyan-500/10 dark:text-cyan-400' : 'border-slate-200 text-slate-500 dark:border-slate-600 dark:text-slate-400'
          }`}
        >
          Adult / General ICU
        </button>
        <button
          onClick={() => setMode('neonatal')}
          className={`rounded-xl border p-3.5 text-center text-sm font-bold transition ${
            mode === 'neonatal' ? 'border-violet-500 bg-violet-50 text-violet-700 dark:border-violet-400 dark:bg-violet-500/10 dark:text-violet-400' : 'border-slate-200 text-slate-500 dark:border-slate-600 dark:text-slate-400'
          }`}
        >
          Neonatal / Incubator
        </button>
      </div>

      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</div>}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Patient Name"><input className={inputClass} value={form.name} onChange={set('name')} placeholder="Full name" /></Field>
        <Field label="MRN / Patient ID"><input className={inputClass} value={form.mrn} onChange={set('mrn')} placeholder="e.g. PT-0231" /></Field>
        <Field label={mode === 'adult' ? 'Age (years)' : 'Age (days)'}><input className={inputClass} type="number" min="0" value={form.age} onChange={set('age')} /></Field>
        <Field label="Sex">
          <select className={inputClass} value={form.sex} onChange={set('sex')}>
            <option>Female</option><option>Male</option><option>Other</option>
          </select>
        </Field>
        <Field label="Blood Group"><input className={inputClass} value={form.bloodGroup} onChange={set('bloodGroup')} placeholder="e.g. O+" /></Field>
        {mode === 'neonatal' && (
          <>
            <Field label="Height (cm)"><input className={inputClass} type="number" value={form.heightCm} onChange={set('heightCm')} /></Field>
            <Field label="Age (Months)"><input className={inputClass} type="number" value={form.ageMonths} onChange={set('ageMonths')} /></Field>
          </>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Chief Complaint"><input className={inputClass} value={form.chiefComplaint} onChange={set('chiefComplaint')} /></Field>
        <Field label="Diagnosis"><input className={inputClass} value={form.diagnosis} onChange={set('diagnosis')} /></Field>
      </div>
      <div className="mt-3">
        <Field label="Allergies"><input className={inputClass} value={form.allergies} onChange={set('allergies')} placeholder="None known" /></Field>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field label="Drug / Fluid"><input className={inputClass} value={form.drug} onChange={set('drug')} /></Field>
        <Field label="Dose"><input className={inputClass} value={form.dose} onChange={set('dose')} /></Field>
        <Field label="Prescribed IV Rate (mL/hr)"><input className={inputClass} type="number" min="0" value={form.ivPrescribedRate} onChange={set('ivPrescribedRate')} /></Field>
        <Field label="Total Volume Ordered (mL)"><input className={inputClass} type="number" min="0" value={form.ivVolumeOrdered} onChange={set('ivVolumeOrdered')} /></Field>
        <Field label="Pump ID"><input className={inputClass} value={form.pumpId} onChange={set('pumpId')} /></Field>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field label="Doctor"><input className={inputClass} value={form.doctor} onChange={set('doctor')} /></Field>
        <Field label="Nurse"><input className={inputClass} value={form.nurse} onChange={set('nurse')} /></Field>
      </div>
      <div className="mt-3">
        <Field label="Clinical Notes"><textarea className={inputClass} rows={2} value={form.notes} onChange={set('notes')} /></Field>
      </div>

      <div className="mt-6 flex justify-end gap-2.5">
        <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">Cancel</button>
        <button onClick={handleSubmit} className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-cyan-700">Save &amp; Mark Occupied</button>
      </div>
    </Modal>
  );
}
