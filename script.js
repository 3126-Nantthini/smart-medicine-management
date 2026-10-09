
const form = document.getElementById("medicineForm");
const medicineList = document.getElementById("medicineList");
const doseList = document.getElementById("doseList");

let medicines = [];
let taken = {};
let editingId = null;

try {
  medicines = JSON.parse(
    localStorage.getItem("smartMedicines") || "[]"
  );
} catch {
  medicines = [];
}

try {
  const saved = JSON.parse(
    localStorage.getItem("smartTaken") || "{}"
  );

  if (saved.date === new Date().toLocaleDateString()) {
    taken = saved.items || {};
  }
} catch {
  taken = {};
}

function saveData() {
  localStorage.setItem("smartMedicines", JSON.stringify(medicines));
  localStorage.setItem("smartTaken", JSON.stringify({
    date: new Date().toLocaleDateString(),
    items: taken
  }));
}

function isExpired(medicine) {
  return medicine.expiry < new Date().toISOString().slice(0, 10);
}

function addText(parent, tag, text, className = "") {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  parent.appendChild(element);
  return element;
}

function render() {
  document.getElementById("total").textContent = medicines.length;

  document.getElementById("expired").textContent =
    medicines.filter(isExpired).length;

  document.getElementById("due").textContent =
    medicines.filter(m => !isExpired(m)).length;

  medicineList.replaceChildren();

  if (!medicines.length) {
    addText(medicineList, "p", "No medicines added yet.", "empty-state");
  }

  medicines.forEach(medicine => {
    const card = document.createElement("article");
    card.className = "medicine-card";

    addText(card, "h3", medicine.name);
    addText(card, "p", "Dosage: " + medicine.dosage);
    addText(card, "p", "Frequency: " + medicine.frequency);
    addText(card, "p", "Reminder: " + medicine.time);

    addText(
      card,
      "p",
      "Expiry: " + medicine.expiry,
      isExpired(medicine) ? "warning" : "status"
    );

    const actions = document.createElement("div");
    actions.className = "actions";

    const edit = addText(actions, "button", "Edit", "secondary-btn");
    edit.type = "button";
    edit.addEventListener("click", () => editMedicine(medicine.id));

    const remove = addText(actions, "button", "Delete", "danger-btn");
    remove.type = "button";
    remove.addEventListener("click", () => {
      if (confirm("Delete " + medicine.name + "?")) {
        medicines = medicines.filter(m => m.id !== medicine.id);
        delete taken[medicine.id];
        saveData();
        render();
      }
    });

    card.appendChild(actions);
    medicineList.appendChild(card);
  });

  doseList.replaceChildren();

  const activeMedicines = medicines.filter(m => !isExpired(m));

  if (!activeMedicines.length) {
    addText(doseList, "p", "No active medicines to track.", "empty-state");
  }

  activeMedicines.forEach(medicine => {
    const card = document.createElement("article");
    card.className = "medicine-card";

    addText(card, "h3", medicine.name + " · " + medicine.time);

    addText(
      card,
      "p",
      taken[medicine.id]
        ? "Acknowledged as taken"
        : "Awaiting acknowledgement"
    );

    const toggle = addText(
      card,
      "button",
      taken[medicine.id] ? "Undo acknowledgement" : "Mark as taken",
      taken[medicine.id] ? "secondary-btn" : "primary-btn"
    );

    toggle.type = "button";
    toggle.addEventListener("click", () => {
      if (taken[medicine.id]) {
        delete taken[medicine.id];
      } else {
        taken[medicine.id] = true;
      }
      saveData();
      render();
    });

    doseList.appendChild(card);
  });
}

function editMedicine(id) {
  const medicine = medicines.find(m => m.id === id);
  if (!medicine) return;

  editingId = id;
  document.getElementById("name").value = medicine.name;
  document.getElementById("dosage").value = medicine.dosage;
  document.getElementById("frequency").value = medicine.frequency;
  document.getElementById("time").value = medicine.time;
  document.getElementById("expiry").value = medicine.expiry;

  document.getElementById("formTitle").textContent = "Edit Medicine";
  document.getElementById("submitBtn").textContent = "Save Changes";
  document.getElementById("cancelEdit").hidden = false;

  form.scrollIntoView({ behavior: "smooth" });
}

function resetForm() {
  editingId = null;
  form.reset();
  document.getElementById("formTitle").textContent = "Add a Medicine";
  document.getElementById("submitBtn").textContent = "Add Medicine";
  document.getElementById("cancelEdit").hidden = true;
}

document.getElementById("cancelEdit").addEventListener("click", resetForm);

form.addEventListener("submit", event => {
  event.preventDefault();

  const medicine = {
    id: editingId || String(Date.now()),
    name: document.getElementById("name").value.trim(),
    dosage: document.getElementById("dosage").value.trim(),
    frequency: document.getElementById("frequency").value,
    time: document.getElementById("time").value,
    expiry: document.getElementById("expiry").value
  };

  if (editingId) {
    medicines = medicines.map(m =>
      m.id === editingId ? medicine : m
    );
  } else {
    medicines.push(medicine);
  }

  saveData();
  resetForm();
  render();
});

render();
