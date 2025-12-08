// app.js
import { BenchtopCanvas, setCanvasHooks } from '../js/canvas.js';

// ==============================
// App Module
// ==============================
const report = document.getElementById('report');
const sizeSelect = document.getElementById('sizeSelect');
const wasteSelect = document.getElementById('wasteSize');
const doubleCheckbox = document.getElementById('doubleCheckbox');
const fienzaSelect = document.getElementById('fienzaSelect');

// Example: parsed from fienza_basins.xlsx
// Replace with actual XLSX parsing logic
const fienzaBasins = [
  { Description: "Model A", double: "Y" },
  { Description: "Model B", double: "N" },
  { Description: "Model C", double: "Y" },
  { Description: "Model D", double: "N" }
];

function updateReport() {
  report.textContent = BenchtopCanvas.getReport();
}

function reset() {
  BenchtopCanvas.setSize(parseInt(sizeSelect.value, 10));
  updateReport();
}

function getWasteSize() {
  return parseInt(wasteSelect.value, 10);
}

function getReport() {
  return BenchtopCanvas.getReport();
}

// Safe UI refresh helper
function refreshUI() {
  BenchtopCanvas.draw();
  updateReport();
  if (typeof window.updatePlacementButtons === 'function') {
    window.updatePlacementButtons();
  } else {
    document.dispatchEvent(new Event('placement:update'));
  }
}

// ==============================
// Manual input event wiring
// ==============================
['tapX','tapY','wasteX','wasteY','tap2X','tap2Y','waste2X','waste2Y']
  .forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    // Always call applyManualInputs on input
    el.addEventListener('input', () => {
      applyManualInputs();
    });
  });

function parseIntegerOrNull(str) {
  if (str === '' || str === '-') return null; // incomplete → skip
  if (/^-?\d+$/.test(str.trim())) return parseInt(str, 10);
  return null;
}

function applyManualInputs() {
  const xTap    = parseIntegerOrNull(document.getElementById('tapX')?.value ?? '');
  const yTap    = parseIntegerOrNull(document.getElementById('tapY')?.value ?? '');
  const xWaste  = parseIntegerOrNull(document.getElementById('wasteX')?.value ?? '');
  const yWaste  = parseIntegerOrNull(document.getElementById('wasteY')?.value ?? '');
  const xTap2   = parseIntegerOrNull(document.getElementById('tap2X')?.value ?? '');
  const yTap2   = parseIntegerOrNull(document.getElementById('tap2Y')?.value ?? '');
  const xWaste2 = parseIntegerOrNull(document.getElementById('waste2X')?.value ?? '');
  const yWaste2 = parseIntegerOrNull(document.getElementById('waste2Y')?.value ?? '');

  let updated = false;

  // ✅ Primary holes: T1/W1
  if (xTap !== null && yTap !== null) {
    BenchtopCanvas.setTaphole1({ offsetX: xTap, offsetY: yTap });
    updated = true;
  }
  if (xWaste !== null && yWaste !== null) {
    BenchtopCanvas.setWastehole1({ offsetX: xWaste, offsetY: yWaste });
    updated = true;
  }

  // ✅ Secondary holes: T2/W2
  if (xTap2 !== null && yTap2 !== null) {
    BenchtopCanvas.setTaphole2({ offsetX: xTap2, offsetY: yTap2 });
    updated = true;
  }
  if (xWaste2 !== null && yWaste2 !== null) {
    BenchtopCanvas.setWastehole2({ offsetX: xWaste2, offsetY: yWaste2 });
    updated = true;
  }

  // Only redraw if something was updated
  if (updated) {
    BenchtopCanvas.draw();
    updateReport();
    if (typeof window.updatePlacementButtons === 'function') {
      window.updatePlacementButtons();
    }
  }
}

// ==============================
// Basin logic
// ==============================
function applyBasin() {
  const shape = document.getElementById('basinShape').value;
  if (!shape) {
    BenchtopCanvas.clearBasin();
    refreshUI();
    return;
  }

  const offsetX = parseInt(document.getElementById('basinX')?.value, 10) || 0;
  const offsetY = parseInt(document.getElementById('basinY')?.value, 10) || 0;

  const basinObj = { shape, offsetX, offsetY };

  if (shape === 'circle') {
    const d = parseInt(document.getElementById('basinDiameter')?.value, 10);
    basinObj.diameter = !isNaN(d) ? d : 35;
  } else if (shape === 'square') {
    const s = parseInt(document.getElementById('basinSide')?.value, 10);
    basinObj.size = !isNaN(s) ? s : 300;
  } else if (shape === 'rect') {
    const w = parseInt(document.getElementById('basinWidth')?.value, 10);
    const h = parseInt(document.getElementById('basinHeight')?.value, 10);
    basinObj.width = !isNaN(w) ? w : 300;
    basinObj.height = !isNaN(h) ? h : 200;
  }

  BenchtopCanvas.setBasin(basinObj);
  refreshUI();
}

// ==============================
// Fienza Basins logic
// ==============================
function populateFienzaDropdown(onlyDouble) {
  if (!fienzaSelect) return;
  fienzaSelect.innerHTML = "";

  const filtered = onlyDouble
    ? fienzaBasins.filter(row => row.double === "Y")
    : fienzaBasins;

  if (filtered.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = "No matching basins";
    opt.disabled = true;
    fienzaSelect.appendChild(opt);
    return;
  }

  filtered.forEach(row => {
    const opt = document.createElement('option');
    opt.value = row.Description;
    opt.textContent = row.Description;
    fienzaSelect.appendChild(opt);
  });
}



// ==============================
// Exported App API
// ==============================
export const App = {
  reset,
  updateReport,
  getWasteSize,
  getReport,
  applyManualInputs,
  applyBasin,

  // Explicit clear methods for manual control
  clearTaphole1() {
    BenchtopCanvas.clearTaphole1();
    BenchtopCanvas.draw();
    App.updateReport();
    updatePlacementButtons();
  },

  clearWastehole1() {
    BenchtopCanvas.clearWastehole1();
    BenchtopCanvas.draw();
    App.updateReport();
    updatePlacementButtons();
  },

  clearTaphole2() {
    BenchtopCanvas.clearTaphole2();
    BenchtopCanvas.draw();
    App.updateReport();
    updatePlacementButtons();
  },

  clearWastehole2() {
    BenchtopCanvas.clearWastehole2();
    BenchtopCanvas.draw();
    App.updateReport();
    updatePlacementButtons();
  },

  clearAll() {
    BenchtopCanvas.clearTaphole1();
    BenchtopCanvas.clearWastehole1();
    BenchtopCanvas.clearTaphole2();
    BenchtopCanvas.clearWastehole2();
    BenchtopCanvas.clearBasin();
    BenchtopCanvas.clearCutout();

    if (fienzaSelect) fienzaSelect.value = "";
    const tapPosition = document.getElementById('tapPosition');
    if (tapPosition) tapPosition.selectedIndex = 0;

    const ids = [
      'tapX','tapY','wasteX','wasteY',
      'tap2X','tap2Y','waste2X','waste2Y'
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    BenchtopCanvas.draw();
    App.updateReport();
    updatePlacementButtons();
  }
};


// Hook App into Canvas for callbacks
setCanvasHooks({ getWasteSize, onUpdateReport: updateReport });

// Expose globally for inline onclick handlers
window.App = App;
