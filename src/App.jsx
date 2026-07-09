import { useEffect, useMemo, useState } from "react";
import logo from "./Assets/vieward.png";

const USERS_KEY = "vieward_users_v2";
const LEGACY_USERS_KEY = "flowguard_react_users_v1";
const SESSION_KEY = "vieward_session_v2";
const BEDS_KEY = "vieward_beds_v2";
const LEGACY_BEDS_KEY = "flowguard_react_beds_v1";
const LOGS_KEY = "vieward_activity_logs";
const LOCK_KEY = "vieward_login_lock";
const CARE_MODE_KEY = "vieward_care_mode_v1";

const DEFAULT_USERS = [
  {
    id: "admin",
    name: "Administrator",
    username: "admin",
    password: "flowguard2026",
    role: "Admin",
    createdAt: "system"
  },
  {
    id: "nurse",
    name: "Nurse Demo",
    username: "nurse",
    password: "ward4b",
    role: "Nurse",
    createdAt: "system"
  }
];

const EMPTY_BEDS = Array.from({ length: 16 }, (_, index) =>
  createBed(index + 1, {
    status: "off",
    name: "",
    code: "",
    blood: "",
    diagnosis: "",
    drug: "",
    doctor: "",
    nurse: ""
  })
);

function createBed(id, overrides = {}) {
  return {
    id,
    name: "",
    code: "",
    blood: "",
    complaint: "",
    diagnosis: "",
    allergies: "",
    doctor: "",
    nurse: "",
    drug: "",
    dose: "",
    rate: 0,
    prescribed: 0,
    remaining: 0,
    bag: 500,
    status: "off",
    pump: `Pump A-${String(id).padStart(2, "0")}`,
    photo: "",
    notes: "",
    hr: "",
    spo2: "",
    rr: "",
    bp: "",
    temp: "",
    weight: "",
    height: "",
    ageMonths: "",
    sensorId: `BED-${String(id).padStart(2, "0")}`,
    lastSensorAt: "",
    incubatorId: `INC-${String(id).padStart(2, "0")}`,
    gestAgeWeeks: "",
    birthWeight: "",
    incubatorTemp: "",
    skinTemp: "",
    humidity: "",
    oxygen: "",
    noiseDb: "",
    lightLux: "",
    servoTempDelta: "",
    kangarooReady: "review",
    feedingMethod: "",
    apneaEvents: "",
    thermalTrend: "steady",
    ...overrides
  };
}

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeUsers() {
  const saved = loadJson(USERS_KEY, null) || loadJson(LEGACY_USERS_KEY, []);
  const merged = [...DEFAULT_USERS];
  if (Array.isArray(saved)) {
    saved.forEach((user) => {
      if (!user?.username) return;
      const clean = {
        id: user.id || user.username,
        name: user.name || user.username,
        username: user.username.trim(),
        password: user.password || "",
        role: user.role || "Nurse",
        createdAt: user.createdAt || "imported"
      };
      const index = merged.findIndex((item) => item.username.toLowerCase() === clean.username.toLowerCase());
      if (index >= 0) merged[index] = { ...merged[index], ...clean };
      else merged.push(clean);
    });
  }
  saveJson(USERS_KEY, merged);
  return merged;
}

function normalizeBeds() {
  const saved = loadJson(BEDS_KEY, null) || loadJson(LEGACY_BEDS_KEY, null);
  const source = Array.isArray(saved) && saved.length ? saved : EMPTY_BEDS;
  return source.map((bed, index) => createBed(bed.id || index + 1, bed));
}

function timeToEmpty(bed) {
  if (!Number(bed.rate) || !Number(bed.remaining)) return null;
  return Math.max(0, Math.round((Number(bed.remaining) / Number(bed.rate)) * 60));
}

function statusFor(bed, careMode = "adult") {
  if (bed.status === "off") return "off";
  if (careMode === "neonatal") {
    const incubatorTemp = Number(bed.incubatorTemp);
    const skinTemp = Number(bed.skinTemp);
    const humidity = Number(bed.humidity);
    const oxygen = Number(bed.oxygen);
    const noiseDb = Number(bed.noiseDb);
    if (
      (incubatorTemp && (incubatorTemp < 32 || incubatorTemp > 38)) ||
      (skinTemp && (skinTemp < 36 || skinTemp > 37.8)) ||
      (oxygen && (oxygen < 21 || oxygen > 45))
    ) return "crit";
    if (
      (humidity && (humidity < 45 || humidity > 85)) ||
      (noiseDb && noiseDb > 60) ||
      bed.thermalTrend === "rising" ||
      bed.thermalTrend === "falling"
    ) return "warn";
  }
  const tte = timeToEmpty(bed);
  const rate = Number(bed.rate);
  const prescribed = Number(bed.prescribed);
  const deviation = prescribed ? Math.abs((rate - prescribed) / prescribed) * 100 : 0;
  if (prescribed > 0 && rate <= 0) return "crit";
  if (tte !== null && tte <= 10) return "crit";
  if (bed.status === "crit") return "crit";
  if (deviation >= 15 || (tte !== null && tte <= 20) || bed.status === "warn") return "warn";
  return "ok";
}

function makeAlarms(bed, careMode = "adult") {
  if (bed.status === "off") return [];
  const alarms = [];
  const tte = timeToEmpty(bed);
  const rate = Number(bed.rate);
  const prescribed = Number(bed.prescribed);
  const deviation = prescribed ? Math.abs((rate - prescribed) / prescribed) * 100 : 0;

  if (prescribed > 0 && rate <= 0) {
    alarms.push({
      id: `${bed.id}-stopped`,
      bedId: bed.id,
      level: "crit",
      title: `Bed ${bed.id} flow stopped`,
      text: `${bed.drug || "Infusion"} is prescribed but current flow is 0 mL/hr.`
    });
  }
  if (tte !== null && tte <= 10) {
    alarms.push({
      id: `${bed.id}-bag-critical`,
      bedId: bed.id,
      level: "crit",
      title: `Bed ${bed.id} bag critical`,
      text: `Estimated time to empty is ${tte} minutes.`
    });
  } else if (tte !== null && tte <= 20) {
    alarms.push({
      id: `${bed.id}-bag-low`,
      bedId: bed.id,
      level: "warn",
      title: `Bed ${bed.id} bag low`,
      text: `Estimated time to empty is ${tte} minutes.`
    });
  }
  if (deviation >= 15 && rate > 0) {
    alarms.push({
      id: `${bed.id}-deviation`,
      bedId: bed.id,
      level: "warn",
      title: `Bed ${bed.id} rate deviation`,
      text: `${rate} mL/hr running vs ${prescribed} mL/hr prescribed.`
    });
  }
  if (careMode === "neonatal") {
    const incubatorTemp = Number(bed.incubatorTemp);
    const skinTemp = Number(bed.skinTemp);
    const humidity = Number(bed.humidity);
    const oxygen = Number(bed.oxygen);
    const noiseDb = Number(bed.noiseDb);
    if (incubatorTemp && (incubatorTemp < 32 || incubatorTemp > 38)) {
      alarms.push({
        id: `${bed.id}-incubator-temp`,
        bedId: bed.id,
        level: "crit",
        title: `Incubator ${bed.id} air temperature`,
        text: `Air temperature is ${incubatorTemp} C. Review incubator settings and probe placement.`
      });
    }
    if (skinTemp && (skinTemp < 36 || skinTemp > 37.8)) {
      alarms.push({
        id: `${bed.id}-skin-temp`,
        bedId: bed.id,
        level: "crit",
        title: `Neonate ${bed.id} skin temperature`,
        text: `Skin temperature is ${skinTemp} C. Confirm probe contact and clinical condition.`
      });
    }
    if (humidity && (humidity < 45 || humidity > 85)) {
      alarms.push({
        id: `${bed.id}-humidity`,
        bedId: bed.id,
        level: "warn",
        title: `Incubator ${bed.id} humidity drift`,
        text: `Humidity is ${humidity}%. Check water chamber and incubator seal.`
      });
    }
    if (oxygen && (oxygen < 21 || oxygen > 45)) {
      alarms.push({
        id: `${bed.id}-oxygen`,
        bedId: bed.id,
        level: "crit",
        title: `Incubator ${bed.id} oxygen concentration`,
        text: `Oxygen concentration is ${oxygen}%. Verify oxygen blender and saturation target.`
      });
    }
    if (noiseDb && noiseDb > 60) {
      alarms.push({
        id: `${bed.id}-noise`,
        bedId: bed.id,
        level: "warn",
        title: `Developmental care noise exposure`,
        text: `Noise is ${noiseDb} dB. Consider low-stimulation care cluster.`
      });
    }
  }
  return alarms;
}

function App() {
  const [users, setUsers] = useState(normalizeUsers);
  const [session, setSession] = useState(() => loadJson(SESSION_KEY, null));
  const [beds, setBeds] = useState(normalizeBeds);
  const [logs, setLogs] = useState(() => loadJson(LOGS_KEY, []));
  const [authMode, setAuthMode] = useState("login");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(1);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [careMode, setCareMode] = useState(() => loadJson(CARE_MODE_KEY, "adult"));
  const [silenced, setSilenced] = useState({});
  const [toast, setToast] = useState("");
  const [now, setNow] = useState(new Date());
  const [sensorPanelOpen, setSensorPanelOpen] = useState(false);
  const [sensorEndpoint, setSensorEndpoint] = useState(import.meta.env.VITE_SENSOR_API_URL || "");
  const [sensorPayload, setSensorPayload] = useState(sampleSensorPayload());

  const alarms = useMemo(() => beds.flatMap((bed) => makeAlarms(bed, careMode)), [beds, careMode]);
  const selected = beds.find((bed) => bed.id === selectedId) || beds[0];
  const filteredBeds = useMemo(() => {
    const search = query.trim().toLowerCase();
    return beds.filter((bed) => {
      const status = statusFor(bed, careMode);
      const content = [
        bed.id,
        bed.name,
        bed.code,
        bed.blood,
        bed.complaint,
        bed.diagnosis,
        bed.drug,
        bed.doctor,
        bed.nurse,
        bed.sensorId,
        bed.incubatorId,
        bed.gestAgeWeeks,
        bed.feedingMethod
      ].join(" ").toLowerCase();
      return (!search || content.includes(search)) && (filter === "all" || status === filter);
    });
  }, [beds, filter, query]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => saveJson(BEDS_KEY, beds), [beds]);
  useEffect(() => saveJson(USERS_KEY, users), [users]);
  useEffect(() => saveJson(LOGS_KEY, logs), [logs]);
  useEffect(() => saveJson(CARE_MODE_KEY, careMode), [careMode]);

  function flash(text) {
    setToast(text);
    window.setTimeout(() => setToast(""), 2600);
  }

  function addLog(text) {
    setLogs((current) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        time: new Date().toLocaleString("en-IN"),
        message: text
      },
      ...current
    ].slice(0, 150));
  }

  function login(username, password) {
    const cleanUsername = username.trim().toLowerCase();
    const lock = loadJson(LOCK_KEY, { attempts: 0, until: 0 });
    if (lock.until && Date.now() < lock.until) {
      const seconds = Math.ceil((lock.until - Date.now()) / 1000);
      setMessage(`Too many failed attempts. Try again in ${seconds} seconds.`);
      return;
    }

    const user = users.find(
      (item) => item.username.toLowerCase() === cleanUsername && item.password === password
    );
    if (!user) {
      const attempts = (lock.attempts || 0) + 1;
      const nextLock = attempts >= 5 ? { attempts: 0, until: Date.now() + 60_000 } : { attempts, until: 0 };
      saveJson(LOCK_KEY, nextLock);
      setMessage(attempts >= 5 ? "Account locked for 60 seconds." : "Invalid username or password.");
      return;
    }

    localStorage.removeItem(LOCK_KEY);
    const safeSession = {
      username: user.username,
      name: user.name,
      role: user.role,
      loginAt: new Date().toISOString()
    };
    setSession(safeSession);
    saveJson(SESSION_KEY, safeSession);
    addLog(`${user.name} logged in`);
    setMessage("");
  }

  function signup(form) {
    const username = form.username.trim();
    if (!username || !form.password || !form.name.trim()) {
      setMessage("Fill all required fields.");
      return;
    }
    if (form.password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (users.some((item) => item.username.toLowerCase() === username.toLowerCase())) {
      setMessage("This username already exists.");
      return;
    }
    setUsers([
      ...users,
      {
        id: `${Date.now()}`,
        name: form.name.trim(),
        username,
        password: form.password,
        role: form.role || "Nurse",
        createdAt: new Date().toISOString()
      }
    ]);
    setAuthMode("login");
    setMessage("Account created. Please log in.");
  }

  function changePassword(username, oldPassword, newPassword) {
    if (newPassword.length < 8) {
      setMessage("New password must be at least 8 characters.");
      return;
    }
    const cleanUsername = username.trim().toLowerCase();
    const user = users.find((item) => item.username.toLowerCase() === cleanUsername && item.password === oldPassword);
    if (!user) {
      setMessage("Old password is incorrect.");
      return;
    }
    setUsers(users.map((item) => item.username === user.username ? { ...item, password: newPassword } : item));
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setAuthMode("login");
    setMessage("Password changed. Please log in again.");
  }

  function logout() {
    if (session) addLog(`${session.name} logged out`);
    setSession(null);
    localStorage.removeItem(SESSION_KEY);
  }

  function updateBeds(nextBeds, logText) {
    setBeds(nextBeds);
    if (logText) addLog(logText);
  }

  function saveBed(nextBed) {
    updateBeds(
      beds.map((bed) => bed.id === nextBed.id ? normalizeBedNumbers(nextBed) : bed),
      `Bed ${nextBed.id} updated`
    );
    setSelectedId(nextBed.id);
    setEditing(null);
    flash(`Bed ${nextBed.id} saved`);
  }

  function resetBed(id) {
    updateBeds(
      beds.map((bed) => bed.id === id ? createBed(id, { status: "off" }) : bed),
      `Bed ${id} reset and marked vacant`
    );
    flash(`Bed ${id} reset`);
  }

  function deleteBed(id) {
    updateBeds(beds.filter((bed) => bed.id !== id), `Bed ${id} deleted`);
  }

  function addBed() {
    const nextId = Math.max(0, ...beds.map((bed) => Number(bed.id))) + 1;
    updateBeds([...beds, createBed(nextId, { status: "off" })], `Bed ${nextId} added`);
    flash(`Bed ${nextId} added`);
  }

  function applySensorPayload(rawPayload = sensorPayload) {
    try {
      const payload = JSON.parse(rawPayload);
      const updates = Array.isArray(payload) ? payload : [payload];
      let changed = false;
      const nextBeds = beds.map((bed) => {
        const incoming = updates.find((item) =>
          Number(item.bedId || item.id) === Number(bed.id) || item.sensorId === bed.sensorId
        );
        if (!incoming) return bed;
        changed = true;
        return normalizeBedNumbers({
          ...bed,
          sensorId: incoming.sensorId || bed.sensorId,
          rate: incoming.rate ?? bed.rate,
          prescribed: incoming.prescribed ?? bed.prescribed,
          remaining: incoming.remaining ?? bed.remaining,
          bag: incoming.bag ?? bed.bag,
          status: incoming.status || bed.status,
          incubatorTemp: incoming.incubatorTemp ?? bed.incubatorTemp,
          skinTemp: incoming.skinTemp ?? bed.skinTemp,
          humidity: incoming.humidity ?? bed.humidity,
          oxygen: incoming.oxygen ?? bed.oxygen,
          noiseDb: incoming.noiseDb ?? bed.noiseDb,
          lightLux: incoming.lightLux ?? bed.lightLux,
          servoTempDelta: incoming.servoTempDelta ?? bed.servoTempDelta,
          thermalTrend: incoming.thermalTrend ?? bed.thermalTrend,
          apneaEvents: incoming.apneaEvents ?? bed.apneaEvents,
          hr: incoming.hr ?? bed.hr,
          spo2: incoming.spo2 ?? bed.spo2,
          rr: incoming.rr ?? bed.rr,
          bp: incoming.bp ?? bed.bp,
          temp: incoming.temp ?? bed.temp,
          lastSensorAt: new Date().toLocaleString("en-IN")
        });
      });
      if (!changed) {
        setMessage("Sensor payload did not match any bedId or sensorId.");
        return;
      }
      updateBeds(nextBeds, "Sensor payload applied to dashboard");
      flash("Sensor data applied");
      setMessage("");
    } catch {
      setMessage("Invalid sensor JSON. Check the example format.");
    }
  }

  async function fetchSensorEndpoint() {
    if (!sensorEndpoint.trim()) {
      setMessage("Add a sensor endpoint URL first.");
      return;
    }
    try {
      const response = await fetch(sensorEndpoint.trim(), { cache: "no-store" });
      if (!response.ok) throw new Error("Request failed");
      const data = await response.json();
      setSensorPayload(JSON.stringify(data, null, 2));
      applySensorPayload(JSON.stringify(data));
    } catch {
      setMessage("Could not fetch sensor endpoint. Check CORS, URL, and Vercel env var.");
    }
  }

  function downloadPatientSheet(bed) {
    downloadCsv(`vieward-bed-${bed.id}-patient-sheet.csv`, patientRows(bed));
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
    <main className={`app ${darkMode ? "dark" : ""} ${careMode === "neonatal" ? "neonatal-mode" : "adult-mode"}`}>
      {toast && <div className="toast">{toast}</div>}

      <header className="topbar">
        <div className="brand-wrap">
          <img src={logo} alt="VieWard logo" className="header-logo" />
          <div className="brand-copy">
            <strong className="brand">VieWard</strong>
            <span>Every Bed. Every Beat.</span>
          </div>
          <span className="ward-label">{careMode === "neonatal" ? "Neonatal ICU" : "Adult ICU"}</span>
        </div>

        <div className="live-clock">
          <strong>{now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</strong>
          <span>{now.toLocaleDateString("en-IN")}</span>
        </div>

        <div className="top-actions">
          <div className="mode-switch" aria-label="Care mode switch">
            <button className={careMode === "adult" ? "active" : ""} onClick={() => setCareMode("adult")}>Adult</button>
            <button className={careMode === "neonatal" ? "active" : ""} onClick={() => setCareMode("neonatal")}>Neonatal</button>
          </div>
          <button onClick={() => setDarkMode(!darkMode)}>{darkMode ? "Light" : "Dark"}</button>
          <button onClick={() => setSensorPanelOpen(true)}>Sensor Gateway</button>
          <button onClick={() => downloadCsv("vieward-all-patients.csv", allRows(beds))}>Download Sheets</button>
          <span className="user-chip">{session.name} | {session.role}</span>
          <button className="danger-btn" onClick={logout}>Logout</button>
        </div>
      </header>

      <section className="metrics">
        {careMode === "neonatal" ? (
          <>
            <Metric label="Active Incubators" value={beds.filter((bed) => bed.status !== "off").length} />
            <Metric label="Thermal Alerts" value={beds.filter((bed) => ["crit", "warn"].includes(statusFor(bed, "neonatal"))).length} danger />
            <Metric label="Humidity Drift" value={beds.filter((bed) => {
              const humidity = Number(bed.humidity);
              return humidity && (humidity < 45 || humidity > 85);
            }).length} warn />
            <Metric label="Kangaroo Ready" value={beds.filter((bed) => bed.kangarooReady === "ready").length} />
          </>
        ) : (
          <>
            <Metric label="Occupied Beds" value={beds.filter((bed) => bed.status !== "off").length} />
            <Metric label="Vacant Beds" value={beds.filter((bed) => bed.status === "off").length} />
            <Metric label="Critical Patients" value={beds.filter((bed) => statusFor(bed, "adult") === "crit").length} danger />
            <Metric label="Low / Empty Bags" value={beds.filter((bed) => {
              const tte = timeToEmpty(bed);
              return tte !== null && tte <= 20;
            }).length} warn />
          </>
        )}
      </section>

      {message && <div className="notice">{message}</div>}

      <section className="workspace">
        <div className="main-column">
          <div className="toolbar">
            <div className="filter-bar">
              {[
                ["all", "All"],
                ["off", "Vacant"],
                ["ok", "Stable"],
                ["warn", "Warning"],
                ["crit", "Critical"]
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={filter === value ? "active" : ""}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search bed, patient, drug, doctor, nurse, sensor"
            />
            <button className="primary" onClick={addBed}>Add Bed</button>
          </div>

          <div className="bed-grid">
            {filteredBeds.map((bed) => (
              <BedCard
                key={bed.id}
                bed={bed}
                careMode={careMode}
                selected={selectedId === bed.id}
                onSelect={() => {
                  setSelectedId(bed.id);
                  setViewing(bed);
                }}
                onEdit={() => setEditing(bed)}
                onReset={() => window.confirm(`Reset Bed ${bed.id} and discharge patient?`) && resetBed(bed.id)}
                onDelete={() => window.confirm(`Delete Bed ${bed.id}?`) && deleteBed(bed.id)}
                onDownload={() => downloadPatientSheet(bed)}
              />
            ))}
          </div>
        </div>

        <aside className="side">
          <Panel title="Active Alarms">
            {alarms.length === 0 ? (
              <p className="muted">No active alarms.</p>
            ) : alarms.map((alarm) => (
              <div
                key={alarm.id}
                className={`alarm ${alarm.level} ${alarm.level === "crit" && !silenced[alarm.id] ? "blink" : ""}`}
              >
                <strong>{alarm.title}</strong>
                <p>{alarm.text}</p>
                <button onClick={() => setSilenced({ ...silenced, [alarm.id]: !silenced[alarm.id] })}>
                  {silenced[alarm.id] ? "Unsilence" : "Silence"}
                </button>
              </div>
            ))}
          </Panel>

          <Panel title="Selected Bed">
            <PatientDetails
              bed={selected}
              careMode={careMode}
              onEdit={() => setEditing(selected)}
              onDownload={() => downloadPatientSheet(selected)}
            />
          </Panel>

          {careMode === "neonatal" && (
            <Panel title="NICU Concept Layer">
              <NeonatalConcepts beds={beds} />
            </Panel>
          )}

          <Panel title="Ward Activity Log">
            <div className="panel-actions">
              <button onClick={() => downloadCsv("vieward-activity-log.csv", [["Time", "Activity"], ...logs.map((log) => [log.time, log.message])])}>
                Download Logs
              </button>
              <button className="danger-btn" onClick={() => {
                setLogs([]);
                saveJson(LOGS_KEY, []);
              }}>
                Clear
              </button>
            </div>
            {logs.length === 0 ? (
              <p className="muted">No activity yet.</p>
            ) : logs.slice(0, 8).map((log) => (
              <div key={log.id} className="activity-item">
                <strong>{log.time}</strong>
                <span>{log.message}</span>
              </div>
            ))}
          </Panel>
        </aside>
      </section>

      {viewing && (
        <Modal title="Patient Details" onClose={() => setViewing(null)}>
          <PatientDetails
            bed={viewing}
            careMode={careMode}
            expanded
            onEdit={() => {
              setEditing(viewing);
              setViewing(null);
            }}
            onDownload={() => downloadPatientSheet(viewing)}
          />
        </Modal>
      )}

      {editing && (
        <EditModal
          bed={editing}
          careMode={careMode}
          onClose={() => setEditing(null)}
          onSave={saveBed}
        />
      )}

      {sensorPanelOpen && (
        <Modal title="Arduino Sensor Gateway" onClose={() => setSensorPanelOpen(false)}>
          <SensorGateway
            endpoint={sensorEndpoint}
            setEndpoint={setSensorEndpoint}
            payload={sensorPayload}
            setPayload={setSensorPayload}
            applyPayload={() => applySensorPayload()}
            fetchEndpoint={fetchSensorEndpoint}
            careMode={careMode}
          />
        </Modal>
      )}
    </main>
  );
}

function AuthScreen({ mode, setMode, message, login, signup, changePassword }) {
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    oldPassword: "",
    newPassword: "",
    role: "Nurse"
  });

  const update = (field, value) => setForm({ ...form, [field]: value });

  return (
    <main className="auth-page">
      <section className="auth-card">
        <img src={logo} alt="VieWard logo" className="login-logo" />
        <h1>VieWard</h1>
        <p>Every Bed. Every Beat.</p>

        {mode === "login" && (
          <form onSubmit={(event) => {
            event.preventDefault();
            login(form.username, form.password);
          }}>
            <label>Username</label>
            <input value={form.username} onChange={(event) => update("username", event.target.value)} autoComplete="username" required />
            <label>Password</label>
            <input type="password" value={form.password} onChange={(event) => update("password", event.target.value)} autoComplete="current-password" required />
            <button className="primary">Login</button>
          </form>
        )}

        {mode === "signup" && (
          <form onSubmit={(event) => {
            event.preventDefault();
            signup(form);
          }}>
            <label>Full name</label>
            <input value={form.name} onChange={(event) => update("name", event.target.value)} required />
            <label>Username</label>
            <input value={form.username} onChange={(event) => update("username", event.target.value)} required />
            <label>Password</label>
            <input type="password" value={form.password} onChange={(event) => update("password", event.target.value)} required />
            <label>Role</label>
            <select value={form.role} onChange={(event) => update("role", event.target.value)}>
              <option>Nurse</option>
              <option>Doctor</option>
              <option>Admin</option>
            </select>
            <button className="primary">Create Account</button>
          </form>
        )}

        {mode === "password" && (
          <form onSubmit={(event) => {
            event.preventDefault();
            changePassword(form.username, form.oldPassword, form.newPassword);
          }}>
            <label>Username</label>
            <input value={form.username} onChange={(event) => update("username", event.target.value)} required />
            <label>Old password</label>
            <input type="password" value={form.oldPassword} onChange={(event) => update("oldPassword", event.target.value)} required />
            <label>New password</label>
            <input type="password" value={form.newPassword} onChange={(event) => update("newPassword", event.target.value)} required />
            <button className="primary">Change Password</button>
          </form>
        )}

        <div className="auth-links">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Create Account</button>
          <button className={mode === "password" ? "active" : ""} onClick={() => setMode("password")}>Edit Password</button>
        </div>

        {message && <p className="message">{message}</p>}
        <p className="auth-note">Default access: admin / flowguard2026. Frontend auth is for prototype use; production security should move to a backend.</p>
      </section>
    </main>
  );
}

function Metric({ label, value, danger, warn }) {
  return (
    <article className={`metric ${danger ? "danger" : ""} ${warn ? "warn" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function BedCard({ bed, careMode, selected, onSelect, onEdit, onDownload, onDelete, onReset }) {
  const status = statusFor(bed, careMode);
  const tte = timeToEmpty(bed);
  const bagPercent = Number(bed.bag) ? Math.max(0, Math.min(100, Math.round((Number(bed.remaining) / Number(bed.bag)) * 100))) : 0;

  return (
    <article className={`bed ${status} ${selected ? "selected" : ""}`}>
      <div className="bed-head">
        <Avatar bed={bed} />
        <div>
          <strong>Bed {String(bed.id).padStart(2, "0")}</strong>
          <span>{bed.name || "Vacant Bed"}</span>
        </div>
        <em>{statusLabel(status)}</em>
      </div>

      <div className="patient-summary">
        <strong>{bed.code || "No patient assigned"}</strong>
        <span>{bed.diagnosis || "No diagnosis recorded"}</span>
      </div>

      {careMode === "neonatal" ? (
        <div className="infusion-summary neonatal-summary">
          <Info label="Air Temp" value={bed.incubatorTemp ? `${bed.incubatorTemp} C` : "--"} />
          <Info label="Skin Temp" value={bed.skinTemp ? `${bed.skinTemp} C` : "--"} />
          <Info label="Humidity" value={bed.humidity ? `${bed.humidity}%` : "--"} />
          <Info label="Oxygen" value={bed.oxygen ? `${bed.oxygen}%` : "--"} />
        </div>
      ) : (
        <>
          <div className="infusion-summary">
            <Info label="Drug" value={bed.drug || "None"} />
            <Info label="Rate" value={`${Number(bed.rate) || 0} mL/hr`} />
            <Info label="Remaining" value={`${Number(bed.remaining) || 0} mL`} />
            <Info label="ETA" value={tte === null ? "--" : `${tte} min`} />
          </div>

          <div className="bag-meter">
            <i style={{ width: `${bagPercent}%` }} />
          </div>
        </>
      )}

      <div className="card-actions">
        <button onClick={onSelect}>Details</button>
        <button onClick={onEdit}>Edit</button>
        <button onClick={onDownload}>Sheet</button>
        {bed.status === "off" ? (
          <button className="danger-btn" onClick={onDelete}>Delete</button>
        ) : (
          <button className="warning-btn" onClick={onReset}>Reset</button>
        )}
      </div>
    </article>
  );
}

function PatientDetails({ bed, careMode = "adult", expanded, onEdit, onDownload }) {
  return (
    <div className="details">
      <div className="patient-banner">
        <Avatar bed={bed} big />
        <div>
          <strong>{bed.name || "Vacant Bed"}</strong>
          <span>Patient ID: PT-{String(bed.id).padStart(3, "0")} | Sensor: {bed.sensorId}</span>
        </div>
      </div>

      <h3>Patient Information</h3>
      <Row label="Age / Sex" value={bed.code || "-"} />
      <Row label="Blood Group" value={bed.blood || "-"} />
      <Row label="Weight" value={bed.weight || "-"} />
      <Row label="Height" value={bed.height || "-"} />

      <h3>Clinical Information</h3>
      <Row label="Chief Complaint" value={bed.complaint || "-"} />
      <Row label="Diagnosis" value={bed.diagnosis || "-"} />
      <Row label="Allergies" value={bed.allergies || "-"} />

      <h3>Vitals</h3>
      <Row label="Heart Rate" value={bed.hr || "-"} />
      <Row label="SpO2" value={bed.spo2 || "-"} />
      <Row label="Resp. Rate" value={bed.rr || "-"} />
      <Row label="Blood Pressure" value={bed.bp || "-"} />
      <Row label="Temperature" value={bed.temp || "-"} />

      {careMode === "neonatal" && (
        <>
          <h3>Incubator Environment</h3>
          <Row label="Incubator ID" value={bed.incubatorId || "-"} />
          <Row label="Gestational Age" value={bed.gestAgeWeeks ? `${bed.gestAgeWeeks} weeks` : "-"} />
          <Row label="Birth Weight" value={bed.birthWeight ? `${bed.birthWeight} g` : "-"} />
          <Row label="Air Temperature" value={bed.incubatorTemp ? `${bed.incubatorTemp} C` : "-"} />
          <Row label="Skin Temperature" value={bed.skinTemp ? `${bed.skinTemp} C` : "-"} />
          <Row label="Humidity" value={bed.humidity ? `${bed.humidity}%` : "-"} />
          <Row label="Oxygen" value={bed.oxygen ? `${bed.oxygen}%` : "-"} />
          <Row label="Noise Exposure" value={bed.noiseDb ? `${bed.noiseDb} dB` : "-"} />
          <Row label="Light Exposure" value={bed.lightLux ? `${bed.lightLux} lux` : "-"} />
          <Row label="Servo Delta" value={bed.servoTempDelta ? `${bed.servoTempDelta} C` : "-"} />
          <Row label="Thermal Trend" value={bed.thermalTrend || "-"} />
          <Row label="Kangaroo Readiness" value={kangarooLabel(bed.kangarooReady)} />
          <Row label="Feeding Method" value={bed.feedingMethod || "-"} />
          <Row label="Apnea Events" value={bed.apneaEvents || "-"} />
        </>
      )}

      <h3>Infusion</h3>
      <Row label="Drug / Fluid" value={bed.drug || "-"} />
      <Row label="Dose" value={bed.dose || "-"} />
      <Row label="Flow Rate" value={`${Number(bed.rate) || 0} mL/hr`} />
      <Row label="Prescribed Rate" value={`${Number(bed.prescribed) || 0} mL/hr`} />
      <Row label="Remaining Volume" value={`${Number(bed.remaining) || 0} mL`} />
      <Row label="Pump ID" value={bed.pump || "-"} />
      <Row label="Last Sensor Update" value={bed.lastSensorAt || "-"} />

      {expanded && (
        <>
          <h3>Care Team</h3>
          <Row label="Doctor" value={bed.doctor || "-"} />
          <Row label="Nurse" value={bed.nurse || "-"} />
          <h3>Clinical Notes</h3>
          <Row label="Notes" value={bed.notes || "-"} />
        </>
      )}

      <div className="card-actions">
        <button onClick={onEdit}>Edit Patient</button>
        <button onClick={onDownload}>Download Sheet</button>
      </div>
    </div>
  );
}

function EditModal({ bed, careMode = "adult", onClose, onSave }) {
  const [form, setForm] = useState(bed);
  const update = (field, value) => setForm({ ...form, [field]: value });
  const number = (field, value) => update(field, Number(value) || 0);

  return (
    <Modal title={`Patient Profile Editor - Bed ${bed.id}`} onClose={onClose}>
      <form onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}>
        <div className="form-grid">
          <Field label="Patient Name" value={form.name} onChange={(value) => update("name", value)} />
          <Field label="Age / Sex" value={form.code} onChange={(value) => update("code", value)} />
          <Field label="Blood Group" value={form.blood} onChange={(value) => update("blood", value)} />
          <Field label="Weight (kg)" value={form.weight} onChange={(value) => update("weight", value)} />
          <Field label="Height (cm)" value={form.height} onChange={(value) => update("height", value)} />
          <Field label="Age (Months)" value={form.ageMonths} onChange={(value) => update("ageMonths", value)} />
          <Field label="Chief Complaint" value={form.complaint} onChange={(value) => update("complaint", value)} />
          <Field label="Diagnosis" value={form.diagnosis} onChange={(value) => update("diagnosis", value)} />
          <Field label="Allergies" value={form.allergies} onChange={(value) => update("allergies", value)} />
          <Field label="Doctor" value={form.doctor} onChange={(value) => update("doctor", value)} />
          <Field label="Nurse" value={form.nurse} onChange={(value) => update("nurse", value)} />
          <Field label="Sensor ID" value={form.sensorId} onChange={(value) => update("sensorId", value)} />
          <Field label="Drug / Fluid" value={form.drug} onChange={(value) => update("drug", value)} />
          <Field label="Dose" value={form.dose} onChange={(value) => update("dose", value)} />
          <Field label="Heart Rate" value={form.hr} onChange={(value) => update("hr", value)} />
          <Field label="SpO2" value={form.spo2} onChange={(value) => update("spo2", value)} />
          <Field label="Respiratory Rate" value={form.rr} onChange={(value) => update("rr", value)} />
          <Field label="Blood Pressure" value={form.bp} onChange={(value) => update("bp", value)} />
          <Field label="Temperature" value={form.temp} onChange={(value) => update("temp", value)} />
          {careMode === "neonatal" && (
            <>
              <Field label="Incubator ID" value={form.incubatorId} onChange={(value) => update("incubatorId", value)} />
              <Field label="Gestational Age (weeks)" value={form.gestAgeWeeks} onChange={(value) => update("gestAgeWeeks", value)} numeric />
              <Field label="Birth Weight (g)" value={form.birthWeight} onChange={(value) => update("birthWeight", value)} numeric />
              <Field label="Incubator Air Temp (C)" value={form.incubatorTemp} onChange={(value) => update("incubatorTemp", value)} numeric />
              <Field label="Skin Temp (C)" value={form.skinTemp} onChange={(value) => update("skinTemp", value)} numeric />
              <Field label="Humidity (%)" value={form.humidity} onChange={(value) => update("humidity", value)} numeric />
              <Field label="Oxygen (%)" value={form.oxygen} onChange={(value) => update("oxygen", value)} numeric />
              <Field label="Noise (dB)" value={form.noiseDb} onChange={(value) => update("noiseDb", value)} numeric />
              <Field label="Light (lux)" value={form.lightLux} onChange={(value) => update("lightLux", value)} numeric />
              <Field label="Servo Delta (C)" value={form.servoTempDelta} onChange={(value) => update("servoTempDelta", value)} numeric />
              <div>
                <label>Thermal Trend</label>
                <select value={form.thermalTrend || "steady"} onChange={(event) => update("thermalTrend", event.target.value)}>
                  <option value="steady">Steady</option>
                  <option value="rising">Rising</option>
                  <option value="falling">Falling</option>
                </select>
              </div>
              <div>
                <label>Kangaroo Readiness</label>
                <select value={form.kangarooReady || "review"} onChange={(event) => update("kangarooReady", event.target.value)}>
                  <option value="ready">Ready</option>
                  <option value="review">Needs Review</option>
                  <option value="hold">Hold</option>
                </select>
              </div>
              <Field label="Feeding Method" value={form.feedingMethod} onChange={(value) => update("feedingMethod", value)} />
              <Field label="Apnea Events" value={form.apneaEvents} onChange={(value) => update("apneaEvents", value)} numeric />
            </>
          )}
          <Field label="Flow Rate (mL/hr)" value={form.rate} onChange={(value) => number("rate", value)} numeric />
          <Field label="Prescribed Rate (mL/hr)" value={form.prescribed} onChange={(value) => number("prescribed", value)} numeric />
          <Field label="Remaining Volume (mL)" value={form.remaining} onChange={(value) => number("remaining", value)} numeric />
          <div>
            <label>Status</label>
            <select value={form.status} onChange={(event) => update("status", event.target.value)}>
              <option value="ok">Stable</option>
              <option value="warn">Warning</option>
              <option value="crit">Critical</option>
              <option value="off">Vacant</option>
            </select>
          </div>
          <div>
            <label>Patient Photo</label>
            <input type="file" accept="image/*" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => update("photo", reader.result);
              reader.readAsDataURL(file);
            }} />
          </div>
          <div className="full">
            <label>Clinical Notes</label>
            <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} />
          </div>
        </div>
        <button className="primary">Save Patient</button>
      </form>
    </Modal>
  );
}

function SensorGateway({ endpoint, setEndpoint, payload, setPayload, applyPayload, fetchEndpoint, careMode = "adult" }) {
  return (
    <div className="sensor-gateway">
      <p className="muted">
        Arduino can send readings to a backend/Vercel API, then this dashboard can fetch that JSON.
        For quick testing, paste sensor JSON below and apply it directly.
      </p>
      <label>Sensor API URL</label>
      <div className="endpoint-row">
        <input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} placeholder="https://your-api.example.com/latest" />
        <button onClick={fetchEndpoint}>Fetch</button>
      </div>
      <label>Sensor JSON</label>
      <textarea value={payload} onChange={(event) => setPayload(event.target.value)} />
      <button className="primary" onClick={applyPayload}>Apply Sensor Payload</button>
      <pre>{careMode === "neonatal" ? `Expected neonatal format:
{
  "bedId": 1,
  "sensorId": "BED-01",
  "incubatorTemp": 36.5,
  "skinTemp": 36.8,
  "humidity": 65,
  "oxygen": 28,
  "noiseDb": 48,
  "lightLux": 120,
  "servoTempDelta": 0.2,
  "thermalTrend": "steady",
  "hr": 142,
  "spo2": 96,
  "rr": 42
}` : `Expected adult format:
{
  "bedId": 1,
  "sensorId": "BED-01",
  "rate": 72,
  "prescribed": 80,
  "remaining": 140,
  "status": "ok",
  "hr": 82,
  "spo2": 98
}`}</pre>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-bg">
      <section className="modal">
        <div className="modal-head">
          <h2>{title}</h2>
          <button onClick={onClose}>Close</button>
        </div>
        {children}
      </section>
    </div>
  );
}

function Field({ label, value, onChange, numeric }) {
  return (
    <div>
      <label>{label}</label>
      <input
        type={numeric ? "number" : "text"}
        inputMode={numeric ? "decimal" : undefined}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function Avatar({ bed, big }) {
  if (bed.photo) {
    return <img className={`avatar ${big ? "big" : ""}`} src={bed.photo} alt={`${bed.name || "Patient"} profile`} />;
  }
  return <div className={`avatar ${big ? "big" : ""}`}>{(bed.name || "V").slice(0, 1).toUpperCase()}</div>;
}

function Panel({ title, children }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function NeonatalConcepts({ beds }) {
  const active = beds.filter((bed) => bed.status !== "off");
  const thermalDrift = active.filter((bed) => bed.thermalTrend === "rising" || bed.thermalTrend === "falling").length;
  const kangarooReady = active.filter((bed) => bed.kangarooReady === "ready").length;
  const highStimulus = active.filter((bed) => Number(bed.noiseDb) > 60 || Number(bed.lightLux) > 600).length;

  return (
    <div className="concept-grid">
      <ConceptCard title="Thermal Drift Watch" value={thermalDrift} text="Prototype trend flag combining incubator air, skin temp, and servo delta." />
      <ConceptCard title="Kangaroo-Care Window" value={kangarooReady} text="Readiness idea based on stable temperature, oxygen, and low alarm burden." />
      <ConceptCard title="Developmental Stress" value={highStimulus} text="Noise/light exposure concept to support low-stimulation care clustering." />
    </div>
  );
}

function ConceptCard({ title, value, text }) {
  return (
    <div className="concept-card">
      <strong>{value}</strong>
      <span>{title}</span>
      <p>{text}</p>
    </div>
  );
}

function kangarooLabel(value) {
  if (value === "ready") return "Ready";
  if (value === "hold") return "Hold";
  return "Needs Review";
}

function statusLabel(status) {
  if (status === "crit") return "Critical";
  if (status === "warn") return "Warning";
  if (status === "ok") return "Stable";
  return "Vacant";
}

function normalizeBedNumbers(bed) {
  return {
    ...bed,
    rate: Number(bed.rate) || 0,
    prescribed: Number(bed.prescribed) || 0,
    remaining: Number(bed.remaining) || 0,
    bag: Number(bed.bag) || 500
  };
}

function patientRows(bed) {
  const rows = [
    ["VieWard Patient Infusion Sheet", ""],
    ["Generated", new Date().toLocaleString("en-IN")],
    ["Bed", bed.id],
    ["Patient", bed.name],
    ["Age / Sex", bed.code],
    ["Blood Group", bed.blood],
    ["Complaint", bed.complaint],
    ["Diagnosis", bed.diagnosis],
    ["Allergies", bed.allergies],
    ["Doctor", bed.doctor],
    ["Nurse", bed.nurse],
    ["Drug", bed.drug],
    ["Dose", bed.dose],
    ["Rate", bed.rate],
    ["Prescribed", bed.prescribed],
    ["Remaining", bed.remaining],
    ["Status", statusFor(bed)],
    ["Pump", bed.pump],
    ["Sensor ID", bed.sensorId],
    ["Notes", bed.notes]
  ];
  return [
    ...rows,
    ["Incubator ID", bed.incubatorId],
    ["Gestational Age", bed.gestAgeWeeks],
    ["Birth Weight", bed.birthWeight],
    ["Incubator Air Temp", bed.incubatorTemp],
    ["Skin Temp", bed.skinTemp],
    ["Humidity", bed.humidity],
    ["Oxygen", bed.oxygen],
    ["Noise dB", bed.noiseDb],
    ["Light lux", bed.lightLux],
    ["Servo Delta", bed.servoTempDelta],
    ["Thermal Trend", bed.thermalTrend],
    ["Kangaroo Readiness", kangarooLabel(bed.kangarooReady)],
    ["Feeding Method", bed.feedingMethod],
    ["Apnea Events", bed.apneaEvents]
  ];
}

function allRows(beds) {
  return [
    ["Bed", "Patient", "Age/Sex", "Blood", "Diagnosis", "Drug", "Rate", "Prescribed", "Remaining", "Status", "Doctor", "Nurse", "Sensor ID", "Incubator", "Air Temp", "Skin Temp", "Humidity", "Oxygen"],
    ...beds.map((bed) => [
      bed.id,
      bed.name,
      bed.code,
      bed.blood,
      bed.diagnosis,
      bed.drug,
      bed.rate,
      bed.prescribed,
      bed.remaining,
      statusFor(bed),
      bed.doctor,
      bed.nurse,
      bed.sensorId,
      bed.incubatorId,
      bed.incubatorTemp,
      bed.skinTemp,
      bed.humidity,
      bed.oxygen
    ])
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

function sampleSensorPayload() {
  return JSON.stringify({
    bedId: 1,
    sensorId: "BED-01",
    rate: 72,
    prescribed: 80,
    remaining: 140,
    status: "ok",
    hr: 82,
    spo2: 98,
    rr: 18,
    bp: "118/76",
    temp: "98.6 F"
  }, null, 2);
}

export default App;
