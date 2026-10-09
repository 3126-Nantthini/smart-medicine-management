
const MEDICINES_KEY = "smartmed_medicines_v2";
const TAKEN_KEY = "smartmed_dose_log_v2";

const $ = id => document.getElementById(id);

const form = $("medicineForm");
const medicineList = $("medicineList");
const doseList = $("doseList");
const searchInput = $("searchInput");
const statusFilter = $("statusFilter");

let medicines = loadData(MEDICINES_KEY, []);
let doseLog = loadData(TAKEN_KEY, {});
let editingId = null;

function loadData(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveData() {
  try {
    localStorage.setItem(MEDICINES_KEY, JSON.stringify(medicines));
    localStorage.setItem(TAKEN_KEY, JSON.stringify(doseLog));
    return true;
  } catch {
    alert("Your browser could not save the data. Check browser storage settings.");
    return false;
  }
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysUntil(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDate = new Date(`${dateString}T00:00:00`);
  return Math.round((expiryDate - today) / 86400000);
}

function getStatus(medicine) {
  const days = daysUntil(medicine.expiry);

  if (days < 0) {
    return { key: "expired", label: "Expired" };
  }

  if (days <= 30) {
    return { key: "soon", label: "Expiring soon" };
  }

  return { key: "active", label: "Active" };
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(
    undefined,
    { day: "2-digit", month: "short", year: "numeric" }
  );
}

function isDoseTaken(id) {
  return doseLog[localDateKey()]?.includes(id) ?? false;
}

function renderDashboard() {
  const active = medicines.filter(m => getStatus(m).key !== "expired");
  const alerts = medicines.filter(m => getStatus(m).key !== "active");
  const todayDoses = active;
  const completed = todayDoses.filter(m => isDoseTaken(m.id)).length;
  const percent = todayDoses.length
    ? Math.round((completed / todayDoses.length) * 100)
    : 0;

  $("total").textContent = medicines.length;
  $("active").textContent = active.length;
  $("expiryAlerts").textContent = alerts.length;
  $("progress").textContent = `${percent}%`;
  $("progressText").textContent =
    `${completed} of ${todayDoses.length} acknowledged`;
}

function renderMedicines() {
  const query = searchInput.value.trim().toLowerCase();
  const filter = statusFilter.value;

  const filtered = medicines.filter(m => {
    const matchesSearch =
      `${m.name} ${m.dosage} ${m.frequency}`.toLowerCase().includes(query);
    const matchesStatus = filter === "all" || getStatus(m).key === filter;
    return matchesSearch && matchesStatus;
  });

  if (!filtered.length) {
    medicineList.innerHTML = `
      <div class="empty-state">
        <strong>${medicines.length ? "No matching medicines" : "No medicines added yet"}</strong>
        ${medicines.length
          ? "Try changing your search or status filter."
          : "Use the form above to add your first medicine."}
      </div>`;
    return;
  }

  medicineList.innerHTML = filtered.map(m => {
    const status = getStatus(m);
    return `
      <article class="medicine-card">
        <div class="medicine-card-top">
          <div>
            <h3>${escapeHTML(m.name)}</h3>
            <p class="medicine-meta">${escapeHTML(m.dosage)} · ${escapeHTML(m.frequency)}</p>
          </div>
          <span class="status ${status.key}">${status.label}</span>
        </div>
        <p class="medicine-meta">
          Scheduled time: <strong>${escapeHTML(m.time)}</strong>
        </p>
        <div class="card-bottom">
          <span class="expiry-label">Expiry: ${formatDate(m.expiry)}</span>
          <div class="actions">
            <button class="small-btn" data-action="edit" data-id="${m.id}">Edit</button>
            <button class="danger-btn" data-action="delete" data-id="${m.id}">Delete</button>
          </div>
        </div>
      </article>`;
  }).join("");
}

function renderDoseList() {
  const active = medicines.filter(m => getStatus(m).key !== "expired");

  if (!active.length) {
    doseList.innerHTML = `
      <div class="empty-state">
        <strong>No active medicines to track</strong>
        Add a medicine with a valid expiry date to begin.
      </div>`;
    return;
  }

  doseList.innerHTML = active.map(m => {
    const taken = isDoseTaken(m.id);

    return `
      <article class="dose-card">
        <div class="dose-info">
          <strong>${escapeHTML(m.name)} · ${escapeHTML(m.dosage)}</strong>
          <span>${escapeHTML(m.time)} · ${escapeHTML(m.frequency)}</span>
        </div>
        ${taken
          ? `<span class="taken-label">✓ Acknowledged</span>
             <button class="small-btn" data-action="undo" data-id="${m.id}">Undo</button>`
          : `<button class="primary-btn" data-action="taken" data-id="${m.id}">Mark as taken</button>`}
      </article>`;
  }).join("");
}

function render() {
  renderDashboard();
  renderMedicines();
  renderDoseList();
}

function resetForm() {
  form.reset();
  editingId = null;
  $("formTitle").textContent = "Add a Medicine";
  $("submitBtn").textContent = "+ Add Medicine";
  $("cancelEdit").hidden = true;
}

form.addEventListener("submit", event => {
  event.preventDefault();

  const record = {
    id: editingId || (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 8)
    ),
    name: $("name").value.trim(),
    dosage: $("dosage").value.trim(),
    frequency: $("frequency").value,
    time: $("time").value,
    expiry: $("expiry").value
  };

  if (!record.name || !record.dosage ||
      !record.frequency || !record.time || !record.expiry) {
    alert("Please complete all medicine fields.");
    return;
  }

  if (editingId) {
    medicines = medicines.map(m => m.id === editingId ? record : m);
  } else {
    medicines.push(record);
  }

  if (!saveData()) return;

  resetForm();
  render();
});

medicineList.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;
  const medicine = medicines.find(m => m.id === id);
  if (!medicine) return;

  if (action === "edit") {
    editingId = id;
    $("name").value = medicine.name;
    $("dosage").value = medicine.dosage;
    $("frequency").value = medicine.frequency;
    $("time").value = medicine.time;
    $("expiry").value = medicine.expiry;
    $("formTitle").textContent = "Edit Medicine";
    $("submitBtn").textContent = "Save Changes";
    $("cancelEdit").hidden = false;
    $("medicineFormPanel").scrollIntoView({ behavior: "smooth" });
  }

  if (action === "delete") {
    if (!confirm(`Delete ${medicine.name} from your list?`)) return;

    medicines = medicines.filter(m => m.id !== id);

    Object.keys(doseLog).forEach(day => {
      doseLog[day] = doseLog[day].filter(savedId => savedId !== id);
      if (!doseLog[day].length) delete doseLog[day];
    });

    if (editingId === id) resetForm();

    if (!saveData()) return;
    render();
  }
});

doseList.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;
  const today = localDateKey();

  if (!doseLog[today]) doseLog[today] = [];

  if (action === "taken" && !doseLog[today].includes(id)) {
    doseLog[today].push(id);
  }

  if (action === "undo") {
    doseLog[today] = doseLog[today].filter(savedId => savedId !== id);
  }

  if (!doseLog[today].length) delete doseLog[today];

  if (!saveData()) return;
  render();
});

$("cancelEdit").addEventListener("click", resetForm);
searchInput.addEventListener("input", renderMedicines);
statusFilter.addEventListener("change", renderMedicines);

render();
