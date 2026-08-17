import { rangesFor, classify } from '../data/vitalRanges';
import StatusBadge from './StatusBadge';
import Modal from './Modal';

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0 dark:border-slate-700/60">
      <span className="font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-800 dark:text-slate-100">{value || '—'}</span>
    </div>
  );
}
function SectionTitle({ children }) {
  return <div className="mb-1 mt-5 text-sm font-bold text-slate-900 first:mt-0 dark:text-slate-50">{children}</div>;
}

function buildSheetText(bed, status) {
  const p = bed.patient || {};
  return [
    `VieWard Patient Sheet`,
    `Generated ${new Date().toLocaleString('en-GB')}`,
    ``,
    `Bed: ${bed.label} (${bed.mode === 'adult' ? 'Adult' : 'Neonatal'} mode)`,
    `Status: ${status}`,
    ``,
    `Patient: ${p.name || '-'}`,
    `MRN: ${p.mrn || '-'}`,
    `Age/Sex: ${p.age || '-'} / ${p.sex || '-'}`,
    `Blood Group: ${p.bloodGroup || '-'}`,
    `Chief Complaint: ${p.chiefComplaint || '-'}`,
    `Diagnosis: ${p.diagnosis || '-'}`,
    `Allergies: ${p.allergies || 'None known'}`,
    ``,
    `Drug/Fluid: ${p.drug || '-'} (${p.dose || '-'})`,
    `Prescribed Rate: ${bed.ivPrescribedRate || 0} mL/hr`,
    `Current Flow Rate: ${bed.iv?.rate?.toFixed(0) || 0} mL/hr`,
    `Volume Infused: ${bed.iv?.volumeInfused?.toFixed(0) || 0} / ${bed.ivVolumeOrdered || 0} mL`,
    `Pump ID: ${p.pumpId || '-'}`,
    ``,
    `Doctor: ${p.doctor || '-'}`,
    `Nurse: ${p.nurse || '-'}`,
    ``,
    `Notes: ${p.notes || '-'}`,
  ].join('\n');
}

function downloadSheet(bed, status) {
  const blob = new Blob([buildSheetText(bed, status)], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${bed.label.replace(' ', '_')}_${(bed.patient?.mrn || 'patient')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PatientDetailsModal({ bed, status, onClose, onEdit, onDischarge, canEdit }) {
  const p = bed.patient || {};
  const r = rangesFor(bed.mode);

  return (
    <Modal title={`${bed.label} — Patient Details`} onClose={onClose} wide>
      <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/40">
        <div className="h-11 w-11 rounded-lg bg-gradient-to-br from-cyan-200 to-cyan-400 dark:from-cyan-600 dark:to-cyan-800" />
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Patient ID: {p.mrn || '—'}</div>
          <StatusBadge status={status} className="mt-1" />
        </div>
      </div>

      <SectionTitle>Patient Information</SectionTitle>
      <Row label="Patient Name" value={p.name} />
      <Row label="Age / Sex" value={p.age ? `${p.age} ${bed.mode === 'neonatal' ? 'days' : 'yrs'} / ${p.sex || '-'}` : null} />
      <Row label="Blood Group" value={p.bloodGroup} />

      <SectionTitle>Clinical Information</SectionTitle>
      <Row label="Chief Complaint" value={p.chiefComplaint} />
      <Row label="Diagnosis" value={p.diagnosis} />
      <Row label="Allergies" value={p.allergies || 'None known'} />
      {bed.mode === 'neonatal' && (
        <>
          <Row label="Height" value={p.heightCm ? `${p.heightCm} cm` : null} />
          <Row label="Age (Months)" value={p.ageMonths} />
        </>
      )}

      <SectionTitle>Vital Parameters</SectionTitle>
      {Object.keys(r).map((k) => {
        const val = bed.vitals?.[k];
        const cls = val != null ? classify(val, r[k]) : 'fault';
        const color = cls === 'critical' ? 'text-red-600 dark:text-red-400' : cls === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100';
        return (
          <div key={k} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0 dark:border-slate-700/60">
            <span className="font-semibold text-slate-500 dark:text-slate-400">{r[k].label}</span>
            <span className={`font-mono-num font-bold ${color}`}>{val != null ? `${val.toFixed(1)} ${r[k].unit}` : '--'}</span>
          </div>
        );
      })}

      <SectionTitle>Medication &amp; Infusion</SectionTitle>
      <Row label="Drug / Fluid" value={p.drug} />
      <Row label="Dose" value={p.dose} />
      <Row label="Flow Rate" value={`${bed.iv?.rate?.toFixed(0) ?? 0} mL/hr`} />
      <Row label="Prescribed Rate" value={`${bed.ivPrescribedRate || 0} mL/hr`} />
      <Row label="Remaining Volume" value={`${Math.max(0, (bed.ivVolumeOrdered || 0) - (bed.iv?.volumeInfused || 0)).toFixed(0)} mL`} />
      <Row label="Pump ID" value={p.pumpId} />

      <SectionTitle>Care Team</SectionTitle>
      <Row label="Doctor" value={p.doctor} />
      <Row label="Nurse" value={p.nurse} />

      <SectionTitle>Clinical Notes</SectionTitle>
      <Row label="Notes" value={p.notes} />

      <div className="mt-6 flex flex-wrap gap-2.5">
        {canEdit && (
          <button onClick={onEdit} className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
            Edit Patient
          </button>
        )}
        <button onClick={() => downloadSheet(bed, status)} className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
          Download Sheet
        </button>
        {canEdit && (
          <button onClick={onDischarge} className="flex-1 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20">
            Discharge Bed
          </button>
        )}
      </div>
    </Modal>
  );
}
