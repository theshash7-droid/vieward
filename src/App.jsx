import { useMemo, useState, useEffect } from "react";
import logo from "./Assets/vieward.png";
const USERS_KEY = "flowguard_react_users_v1";
const SESSION_KEY = "flowguard_react_session_v1";
const BEDS_KEY = "flowguard_react_beds_v1";

const defaultUsers = [
  { name: "Administrator", username: "admin", password: "flowguard2026", role: "Admin" },
  { name: "Nurse Demo", username: "nurse", password: "ward4b", role: "Nurse" }
];
const defaultBeds = Array.from(
  { length: 16 },
  (_, i) =>
    bed(
      i + 1,   // Bed Number
      "",      // Patient Name
      "",      // Age / Sex
      "",      // Blood Group
      "",      // Diagnosis
      "",      // Drug
      0,       // Flow Rate
      0,       // Prescribed Rate
      0,       // Remaining Volume
      "off",   // Status
      "",      // Nurse
      ""       // Doctor
    )
);



function bed(id, name, code, blood, diagnosis, drug, rate, prescribed, remaining, status, nurse, doctor) {
  return {
    id,
    name,
    code,
    blood,
    complaint: "",
    hr: "",
    spo2: "",
    rr: "",
    bp: "",
    temp: "",
    dose: "",
    diagnosis,
    drug,
    rate,
    prescribed,
    remaining,
    bag: status === "off" ? 0 : 500,
    status,
    nurse,
    doctor,
    allergies: id === 2 ? "Penicillin" : "None known",
    pump: status === "off" ? "-" : `Pump A-${String(id).padStart(2, "0")}`,
    photo: "",
    notes: status === "crit" ? "Requires immediate clinical review." : "Monitoring active."
  };
}

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function timeToEmpty(item) {
  if (!item.rate || !item.remaining) return null;
  return Math.round((item.remaining / item.rate) * 60);
}

function statusFor(item) {
  const tte = timeToEmpty(item);
  const deviation = item.prescribed ? Math.abs((item.rate - item.prescribed) / item.prescribed) * 100 : 0;
  if (item.status === "off") return "off";
  if (item.prescribed > 0 && item.rate <= 0) return "crit";
  if (tte !== null && tte <= 10) return "crit";
  if (item.status === "crit") return "crit";
  if (deviation >= 15 || (tte !== null && tte <= 20) || item.status === "warn") return "warn";
  return "ok";
}

function App() {
  const [users, setUsers] = useState(() => load(USERS_KEY, defaultUsers));
  const [session, setSession] = useState(() => load(SESSION_KEY, null));
  const [currentTime, setCurrentTime] = useState(new Date());
  const [beds, setBeds] = useState(() => load(BEDS_KEY, defaultBeds));
  const [authMode, setAuthMode] = useState("login");
  const [selectedId, setSelectedId] = useState(1);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [toast, setToast] = useState("");
  const [silenced, setSilenced] = useState({});
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");

  const selected = beds.find((item) => item.id === selectedId) || beds[0];
  const alarms = useMemo(() => beds.flatMap(makeAlarms), [beds]);
  const filteredBeds = beds.filter((item) => {
    const haystack = `${item.id} ${item.name} ${item.code} ${item.drug} ${item.nurse} ${item.doctor} ${item.diagnosis}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });
  useEffect(() => {
  const timer = setInterval(() => {
    setCurrentTime(new Date());
  }, 1000);

  return () => clearInterval(timer);
}, []);

  function updateUsers(next) {
    setUsers(next);
    save(USERS_KEY, next);
  }

  function updateBeds(next) {
    setBeds(next);
    save(BEDS_KEY, next);
  }

  function login(username, password) {
    const user = users.find((item) => item.username === username && item.password === password);
    if (!user) return setMessage("Invalid username or password.");
    setSession(user);
    save(SESSION_KEY, user);
    setMessage("");
  }

  function signup(form) {
    if (users.some((item) => item.username === form.username)) return setMessage("This username already exists.");
    const user = { name: form.name, username: form.username, password: form.password, role: form.role || "Nurse" };
    updateUsers([...users, user]);
    setAuthMode("login");
    setMessage("Account created. Please log in.");
  }

  function changePassword(username, oldPassword, newPassword) {
    const user = users.find((item) => item.username === username && item.password === oldPassword);
    if (!user) return setMessage("Old password is incorrect.");
    const next = users.map((item) => item.username === username ? { ...item, password: newPassword } : item);
    updateUsers(next);
    setAuthMode("login");
    setMessage("Password changed. Please log in again.");
  }

  function logout() {
    setSession(null);
    localStorage.removeItem(SESSION_KEY);
  }

  function saveBed(nextBed) {
    updateBeds(beds.map((item) => item.id === nextBed.id ? nextBed : item));
    setEditing(null);
    setSelectedId(nextBed.id);
  }

  function downloadPatientSheet(item) {
    const rows = [
      ["FlowGuard ICU Patient Sheet", ""],
      ["Bed", item.id],
      ["Patient", item.name],
      ["Patient code", item.code],
      ["Blood group", item.blood],
      ["Allergies", item.allergies],
      ["Doctor", item.doctor],
      ["Diagnosis", item.diagnosis],
      ["Drug", item.drug],
      ["Current rate", item.rate],
      ["Prescribed rate", item.prescribed],
      ["Remaining", item.remaining],
      ["Time to empty", timeToEmpty(item) ?? ""],
      ["Status", statusFor(item)],
      ["Pump", item.pump],
      ["Nurse", item.nurse],
      ["Notes", item.notes]
    ];
    downloadCsv(`bed-${item.id}-patient-sheet.csv`, rows);
  }

  if (!session) {
    return (
      <AuthScreen
        mode={authMode}
        setMode={setAuthMode}
        message={message}
        login={login}
        signup={signup}
        changePassword={changePassword}
      />
    );
  }

  return (
    <main className="app">
      {toast && (
  <div className="toast">
    {toast}
  </div>
)}
      <header className="topbar">
       <div className="brand-wrap">
  <img src={logo} alt="VieWard" className="header-logo" />

  <div>
    <strong className="brand">VieWard</strong>
    <span>Every Bed. Every Beat.</span>
  </div>
</div>
<div className="live-clock">
  <div>
    {currentTime.toLocaleDateString("en-IN")}
  </div>

  <div>
    {currentTime.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })}
  </div>
</div>
        <div className="top-actions">
          <span>{session.name} | {session.role}</span>
          <button onClick={() => downloadCsv("VieWard-all-patients.csv", allRows(beds))}>Download All Sheets</button>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <section className="metrics">
        <Metric label="Active IV lines" value={beds.filter((b) => b.status !== "off").length} />
        <Metric label="Critical alarms" value={alarms.filter((a) => a.level === "crit").length} danger />
        <Metric label="Warnings" value={alarms.filter((a) => a.level === "warn").length} warn />
        <Metric label="Bag due <20 min" value={beds.filter((b) => {
          const tte = timeToEmpty(b);
          return tte !== null && tte <= 20;
        }).length} warn />
      </section>

      <section className="workspace">
        <div>
          <div className="toolbar">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search bed, patient, drug, doctor, nurse" />
<button
  onClick={() => {
    const nextId =
      Math.max(...beds.map((b) => b.id)) + 1;

    const newBed = bed(
      nextId,
      "",
      "",
      "",
      "",
      "",
      0,
      0,
      0,
      "off",
      "",
      ""
    );

    setBeds([...beds, newBed]); setToast(`BED ${nextId} added successfully`);

setTimeout(() => {
  setToast("");
}, 5000);
  }}
>
  + Add New Bed
</button>          </div>
          <div className="bed-grid">
            {filteredBeds.map((item) => (
              <BedCard
                key={item.id}
                item={item}
                selected={selectedId === item.id}
                onSelect={() => setViewing(item)}
                onEdit={() => setEditing(item)}
                onDownload={() => downloadPatientSheet(item)}
                onDelete={() => {
  if (
    window.confirm(
      `Delete BED ${item.id}?`
    )
  ) {
    setBeds(
      beds.filter(
        (b) => b.id !== item.id
      )
    );
  }
}}
              />
            ))}
          </div>
        </div>

        <aside className="side">
          <Panel title="Alarms">
            {alarms.length === 0 && <p className="muted">No active alarms.</p>}
            {alarms.map((alarm) => (
              <div key={alarm.id} className={`alarm ${alarm.level} ${alarm.level === "crit" && !silenced[alarm.id] ? "blink" : ""}`}>
                <strong>{alarm.title}</strong>
                <p>{alarm.text}</p>
                <button onClick={() => setSilenced({ ...silenced, [alarm.id]: !silenced[alarm.id] })}>
                  {silenced[alarm.id] ? "Unsilence" : "Silence"}
                </button>
              </div>
            ))}
          </Panel>

          
        </aside>
      </section>

{viewing && (
  <div className="modal-bg">
    <div className="modal">

      <div className="modal-head">
        <h2>Patient Details</h2>

        <button
          type="button"
          onClick={() => setViewing(null)}
        >
          Close
        </button>
      </div>

      <PatientDetails
        item={viewing}
        onEdit={() => {
          setEditing(viewing);
          setViewing(null);
        }}
        onDownload={() =>
          downloadPatientSheet(viewing)
          
        }
      />

    </div>
  </div>
)}



      {editing && <EditModal item={editing} onClose={() => setEditing(null)} onSave={saveBed} />}
    </main>
  );
}

function AuthScreen({ mode, setMode, message, login, signup, changePassword }) {
  const [form, setForm] = useState({ name: "", username: "", password: "", oldPassword: "", newPassword: "", role: "Nurse" });
  const update = (field, value) => setForm({ ...form, [field]: value });

  return (
    <main className="auth-page">
      <section className="auth-card">
        <img
  src={logo}
  alt="VieWard"
  className="login-logo"
/>

<h1>VieWard</h1>
<p>Every Bed. Every Beat.</p>

        {mode === "login" && (
          <form onSubmit={(e) => { e.preventDefault(); login(form.username, form.password); }}>
            <input placeholder="Username" value={form.username} onChange={(e) => update("username", e.target.value)} required />
            <input placeholder="Password" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required />
            <button className="primary">Login</button>
          </form>
        )}

        {mode === "signup" && (
          <form onSubmit={(e) => { e.preventDefault(); signup(form); }}>
            <input placeholder="Full name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
            <input placeholder="Username" value={form.username} onChange={(e) => update("username", e.target.value)} required />
            <input placeholder="Password" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required />
            <select value={form.role} onChange={(e) => update("role", e.target.value)}>
              <option>Nurse</option>
              <option>Doctor</option>
              <option>Admin</option>
            </select>
            <button className="primary">Create Account</button>
          </form>
        )}

        {mode === "password" && (
          <form onSubmit={(e) => { e.preventDefault(); changePassword(form.username, form.oldPassword, form.newPassword); }}>
            <input placeholder="Username" value={form.username} onChange={(e) => update("username", e.target.value)} required />
            <input placeholder="Old password" type="password" value={form.oldPassword} onChange={(e) => update("oldPassword", e.target.value)} required />
            <input placeholder="New password" type="password" value={form.newPassword} onChange={(e) => update("newPassword", e.target.value)} required />
            <button className="primary">Change Password</button>
          </form>
        )}

        <div className="auth-links">
          <button onClick={() => setMode("login")}>Login</button>
          <button onClick={() => setMode("signup")}>Create account</button>
          <button onClick={() => setMode("password")}>Edit password</button>
        </div>
        {message && <p className="message">{message}</p>}
      </section>
    </main>
  );
}

function Metric({ label, value, danger, warn }) {
  return <article className={`metric ${danger ? "danger" : warn ? "warn" : ""}`}><span>{label}</span><strong>{value}</strong></article>;
}


function BedCard({ item, selected, onSelect, onEdit, onDownload, onDelete }) {
  const status = statusFor(item);

  return (
    <article className={`bed ${status} ${selected ? "selected" : ""}`}>
      <div className="bed-head">
        <Avatar item={item} />

        <div>
          <strong>BED {String(item.id).padStart(2, "0")}</strong>

          <span>
            {item.name || `Patient #${String(item.id).padStart(3, "0")}`}
          </span>
        </div>

       <em
  style={{
    color:
      status === "crit"
        ? "#ef4444"
        : status === "warn"
        ? "#f59e0b"
        : status === "ok"
        ? "#22c55e"
        : "#60a5fa",
    fontWeight: 700
  }}
>
  {status === "off"
    ? "VACANT"
    : status === "ok"
    ? "STABLE"
    : status === "warn"
    ? "WARNING"
    : "CRITICAL"}
</em>
      </div>
<div style={{ marginTop: "12px" }}>
  <strong>
    {item.name || "Vacant Bed"}
  </strong>

  <div style={{ marginTop: "4px" }}>
    {item.code || "No patient assigned"}
  </div>
</div>

      <div style={{ marginTop: "12px" }}>
  <strong>Diagnosis</strong>

  <div style={{ marginTop: "4px" }}>
    {item.diagnosis || "Not Assigned"}
  </div>
</div>

<div style={{ marginTop: "12px" }}>
  <strong>Drug</strong>

  <div style={{ marginTop: "4px" }}>
    {item.drug || "No Active Infusion"}
  </div>
</div>

<div style={{ marginTop: "12px" }}>
  <strong>Rate</strong>

  <div style={{ marginTop: "4px" }}>
    {item.rate || 0} mL/hr
  </div>
</div>

<div style={{ marginTop: "12px" }}>
  <strong>Remaining</strong>

  <div style={{ marginTop: "4px" }}>
    {item.remaining || 0} mL
  </div>
</div>
      
      <div className="card-actions">
        <button onClick={onSelect}>
          Patient Details
        </button>
        <button
  onClick={onDelete}
  style={{
    background: "#ef4444",
    color: "white"
  }}
>
  Delete
</button>

        <button onClick={onEdit}>
          Edit
        </button>
      </div>
    </article>
  );
}


function Panel({ title, children }) {
  return <section className="panel"><h2>{title}</h2>{children}</section>;
}
function PatientDetails({ item, onEdit, onDownload }) {
  return (
    <div className="details">

      <div className="patient-banner">
        <Avatar item={item} big />

        <div>
          <strong>{item.name}</strong>

          <span>
            Patient ID: PT-{String(item.id).padStart(3, "0")}
          </span>
        </div>
      </div>

      <h3>Patient Information</h3>

      <Row label="Patient Name" value={item.name || "-"} />
      <Row label="Age / Sex" value={item.code || "-"} />
      <Row label="Blood Group" value={item.blood || "-"} />

      <h3>Clinical Information</h3>

      <Row label="Chief Complaint" value={item.complaint || "-"} />
      <Row label="Diagnosis" value={item.diagnosis || "-"} />
      <Row label="Allergies" value={item.allergies || "-"} />

      <h3>Vital Parameters</h3>

      <Row label="Heart Rate" value={item.hr || "--"} />
      <Row label="SpO₂" value={item.spo2 || "--"} />
      <Row label="Respiratory Rate" value={item.rr || "--"} />
      <Row label="Blood Pressure" value={item.bp || "--/--"} />
      <Row label="Temperature" value={item.temp || "--"} />

      <h3>Medication & Infusion</h3>

      <Row label="Drug / Fluid" value={item.drug || "-"} />
      <Row label="Dose" value={item.dose || "-"} />
      <Row label="Flow Rate" value={`${item.rate} mL/hr`} />
      <Row label="Prescribed Rate" value={`${item.prescribed} mL/hr`} />
      <Row label="Remaining Volume" value={`${item.remaining} mL`} />
      <Row label="Pump ID" value={item.pump || "-"} />

      <h3>Care Team</h3>

      <Row label="Doctor" value={item.doctor || "-"} />
      <Row label="Nurse" value={item.nurse || "-"} />

      <h3>Clinical Notes</h3>

      <Row label="Notes" value={item.notes || "-"} />

      <div className="card-actions">
        <button onClick={onEdit}>
          Edit Patient
        </button>

        <button onClick={onDownload}>
          Download Sheet
        </button>
      </div>

    </div>
  );
}



function Avatar({ item, big }) {
  if (item.photo) {
    return <img className={`avatar ${big ? "big" : ""}`} src={item.photo} alt={`${item.name} patient`} />;
  }
  return <div className={`avatar ${big ? "big" : ""}`}>{item.name.slice(0, 1)}</div>;
}

function Row({ label, value }) {
  return <div className="row"><span>{label}</span><strong>{value}</strong></div>;
}
function EditModal({ item, onClose, onSave }) {
  const [form, setForm] = useState(item);

  const update = (field, value) =>
    setForm({ ...form, [field]: value });

  const number = (field, value) =>
    update(field, Number(value) || 0);

  return (
    <div className="modal-bg">
      <form
        className="modal"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <div className="modal-head">
          <h2>Patient Profile Editor</h2>

          <button
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="form-grid">

          <input
            value={form.name}
            onChange={(e) =>
              update("name", e.target.value)
            }
            placeholder="Patient Name"
          />

          <input
            value={form.code}
            onChange={(e) =>
              update("code", e.target.value)
            }
            placeholder="Age / Sex"
          />

          <input
            value={form.blood}
            onChange={(e) =>
              update("blood", e.target.value)
            }
            placeholder="Blood Group"
          />

          <input
            value={form.complaint || ""}
            onChange={(e) =>
              update("complaint", e.target.value)
            }
            placeholder="Chief Complaint"
          />

          <input
            value={form.diagnosis}
            onChange={(e) =>
              update("diagnosis", e.target.value)
            }
            placeholder="Diagnosis"
          />

          <input
            value={form.allergies}
            onChange={(e) =>
              update("allergies", e.target.value)
            }
            placeholder="Allergies"
          />

          <input
            value={form.doctor}
            onChange={(e) =>
              update("doctor", e.target.value)
            }
            placeholder="Doctor"
          />

          <input
            value={form.nurse}
            onChange={(e) =>
              update("nurse", e.target.value)
            }
            placeholder="Nurse"
          />

          <input
            value={form.drug}
            onChange={(e) =>
              update("drug", e.target.value)
            }
            placeholder="Drug / Fluid"
          />

          <input
            value={form.dose || ""}
            onChange={(e) =>
              update("dose", e.target.value)
            }
            placeholder="Dose"
          />

          <input
            value={form.hr || ""}
            onChange={(e) =>
              update("hr", e.target.value)
            }
            placeholder="Heart Rate"
          />

          <input
            value={form.spo2 || ""}
            onChange={(e) =>
              update("spo2", e.target.value)
            }
            placeholder="SpO₂"
          />

          <input
            value={form.rr || ""}
            onChange={(e) =>
              update("rr", e.target.value)
            }
            placeholder="Respiratory Rate"
          />

          <input
            value={form.bp || ""}
            onChange={(e) =>
              update("bp", e.target.value)
            }
            placeholder="Blood Pressure"
          />

          <input
            value={form.temp || ""}
            onChange={(e) =>
              update("temp", e.target.value)
            }
            placeholder="Temperature"
          />

          <input
            type="number"
            value={form.rate}
            onChange={(e) =>
              number("rate", e.target.value)
            }
            placeholder="Flow Rate"
          />

          <input
            type="number"
            value={form.prescribed}
            onChange={(e) =>
              number("prescribed", e.target.value)
            }
            placeholder="Prescribed Rate"
          />

          <input
            type="number"
            value={form.remaining}
            onChange={(e) =>
              number("remaining", e.target.value)
            }
            placeholder="Remaining Volume"
          />

          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (!file) return;

              const reader =
                new FileReader();

              reader.onload = () => {
                update(
                  "photo",
                  reader.result
                );
              };

              reader.readAsDataURL(file);
            }}
          />

          <select
            value={form.status}
            onChange={(e) =>
              update("status", e.target.value)
            }
          >
            <option value="ok">
              Stable
            </option>

            <option value="warn">
              Warning
            </option>

            <option value="crit">
              Critical
            </option>

            <option value="off">
              Vacant
            </option>
          </select>

          <textarea
            value={form.notes}
            onChange={(e) =>
              update("notes", e.target.value)
            }
            placeholder="Clinical Notes"
          />
        </div>

        <button className="primary">
          Save Patient
        </button>
      </form>
    </div>
  );
}



function makeAlarms(item) {
  if (item.status === "off") return [];
  const out = [];
  const tte = timeToEmpty(item);
  const deviation = item.prescribed ? Math.abs((item.rate - item.prescribed) / item.prescribed) * 100 : 0;
  if (item.prescribed > 0 && item.rate <= 0) out.push({ id: `${item.id}-stop`, level: "crit", title: `Bed ${item.id} flow stopped`, text: `${item.drug} is prescribed but current rate is 0.` });
  if (tte !== null && tte <= 10) out.push({ id: `${item.id}-bagcrit`, level: "crit", title: `Bed ${item.id} bag critical`, text: `Estimated time to empty is ${tte} minutes.` });
  else if (tte !== null && tte <= 20) out.push({ id: `${item.id}-bagwarn`, level: "warn", title: `Bed ${item.id} bag low`, text: `Estimated time to empty is ${tte} minutes.` });
  if (deviation >= 15 && item.rate > 0) out.push({ id: `${item.id}-dev`, level: "warn", title: `Bed ${item.id} rate deviation`, text: `${item.rate} mL/h vs ${item.prescribed} mL/h prescribed.` });
  return out;
}

function simulateAlarm(beds, updateBeds) {
  const active = beds.filter((item) => item.status !== "off");
  const target = active[Math.floor(Math.random() * active.length)];
  updateBeds(beds.map((item) => item.id === target.id ? { ...item, status: "crit", rate: 0, remaining: 0 } : item));
}

function allRows(beds) {
  return [
    ["Bed", "Patient", "Code", "Blood", "Diagnosis", "Drug", "Rate", "Prescribed", "Remaining", "Status", "Doctor", "Nurse"],
    ...beds.map((item) => [item.id, item.name, item.code, item.blood, item.diagnosis, item.drug, item.rate, item.prescribed, item.remaining, statusFor(item), item.doctor, item.nurse])
  ];
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default App;
