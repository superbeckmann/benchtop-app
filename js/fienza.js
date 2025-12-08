// fienza.js — handles Fienza Basins dropdown + placement
import { BenchtopCanvas } from './canvas.js';

let fienzaData = [];
let fienzaLoaded = false;

/**
 * Load Excel file and populate dropdown
 */
export async function loadFienzaBasinsFromURL(url) {
  const response = await fetch(url);
  const blob = await response.blob();

  const reader = new FileReader();
  reader.onload = (e) => {
    const workbook = XLSX.read(e.target.result, { type: 'binary' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    fienzaData = XLSX.utils.sheet_to_json(sheet);
    fienzaLoaded = true;

    console.log("Parsed fienzaData sample:", fienzaData.slice(0, 5));

    ensureBadgeAnchor();
    updateFienzaDropdown(); // apply filter immediately after load
  };

  reader.readAsBinaryString(blob);
}

/**
 * Safely parse Excel values, skipping "NA" or "-"
 */
function parseSafe(value) {
  const cleaned = String(value).trim().toUpperCase();
  if (cleaned === 'NA' || cleaned === '-') return null;
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

/**
 * Populate dropdown with optional double filter
 */
function populateFienzaDropdown(onlyDouble) {
  const select = document.getElementById('fienzaSelect');
  if (!select) return;

  select.innerHTML = '<option value="">— Select —</option>';

  if (!fienzaLoaded || !Array.isArray(fienzaData)) return;

  const filtered = onlyDouble
    ? fienzaData.filter(row => String(row['double'] || '').trim().toUpperCase() === 'Y')
    : fienzaData;

  if (filtered.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'No matching basins';
    opt.disabled = true;
    select.appendChild(opt);
    return;
  }

  filtered.forEach(row => {
    if (row['Item Code'] && row['Description']) {
      const opt = document.createElement('option');
      opt.value = row['Item Code'];
      opt.textContent = row['Description'];
      select.appendChild(opt);
    }
  });
}

/**
 * Badge handling
 */
function ensureBadgeAnchor() {
  const select = document.getElementById('fienzaSelect');
  if (!select) return;

  let badge = document.getElementById('fienzaBadge');
  if (!badge) {
    badge = document.createElement('span');
    badge.id = 'fienzaBadge';
    badge.style.marginLeft = '8px';
    badge.style.padding = '2px 8px';
    badge.style.borderRadius = '12px';
    badge.style.fontSize = '0.85rem';
    badge.style.fontWeight = '600';
    badge.style.verticalAlign = 'middle';
    select.insertAdjacentElement('afterend', badge);
  }
}

function setDoubleBadgeVisible(visible) {
  const badge = document.getElementById('fienzaBadge');
  if (!badge) return;

  if (visible) {
    badge.textContent = 'Double mode';
    badge.style.backgroundColor = '#e6f4ff';
    badge.style.color = '#0b6bdc';
    badge.style.border = '1px solid #b6d7ff';
    badge.style.display = 'inline-block';
  } else {
    badge.textContent = '';
    badge.style.display = 'none';
  }
}

/**
 * Decide whether to filter by double
 */
export function updateFienzaDropdown(isDoubleMode) {
  const select = document.getElementById('fienzaSelect');
  if (!select) return;

  const data = getFienzaData() || [];
  select.innerHTML = '';

  // Filter based on mode
  const filtered = isDoubleMode
    ? data.filter(row => String(row['double']).trim().toUpperCase() === 'Y')
    : data;

  // Populate dropdown
  for (const row of filtered) {
    const opt = document.createElement('option');
    opt.value = row['Item Code'];
    opt.textContent = `${row['Item Code']} — ${row['Description']}`;
    select.appendChild(opt);
  }

  // ✅ Prevent auto-selection
  select.insertAdjacentHTML('afterbegin', '<option value="" selected disabled>— Select basin —</option>');
  select.selectedIndex = 0;
}



// Hook into UI events
document.getElementById('sizeSelect')?.addEventListener('change', updateFienzaDropdown);
document.getElementById('doubleOption')?.addEventListener('change', updateFienzaDropdown);

// ==============================
// Step 3: Confirm wiring
// ==============================
document.getElementById('sizeSelect')?.addEventListener('change', () => {
  console.log("Size changed, updating dropdown");
  updateFienzaDropdown();
});

document.getElementById('doubleOption')?.addEventListener('change', () => {
  console.log("Double checkbox toggled, updating dropdown");
  updateFienzaDropdown();
});

/**
 * Place holes or cut-out based on selected basin
 */
export function placeFienzaHoles(App, updatePlacementButtons) {
  const code = document.getElementById('fienzaSelect').value;
  const position = document.getElementById('tapPosition').value; // '12', '10', or '2'
  const match = fienzaData.find(row => row['Item Code'] === code);
  if (!match) return;

  const sizeSelect = document.getElementById('sizeSelect');
  const size = parseInt(sizeSelect?.value, 10);

  const checkbox = document.getElementById('doubleMode');
  const userWantsDouble = !!checkbox?.checked;
  const basinSupportsDouble = String(match.double || '').trim().toUpperCase() === 'Y';
  const isDouble = basinSupportsDouble && userWantsDouble;

  // ==============================
  // Cut-out basins
  // ==============================
  if (String(match.cut_out || '').trim().toUpperCase() === 'Y') {
    // Clear everything first
    BenchtopCanvas.clearTaphole1();
    BenchtopCanvas.clearWastehole1();
    BenchtopCanvas.clearTaphole2();
    BenchtopCanvas.clearWastehole2();
    BenchtopCanvas.clearCutout();

    const shape = String(match['setCutout'] || '').trim().toLowerCase();
    const radius = parseSafe(match['c_radius']);
    const length = parseSafe(match['c_l']);
    const width = parseSafe(match['c_w']);
    const offsetX = parseSafe(match['c_x']);
    const offsetY = parseSafe(match['c_y']);

    // Circle diameter from c_l/c_w
    let diameter = null;
    if (shape === 'circle') {
      if (Number.isFinite(length) && Number.isFinite(width)) {
        diameter = (length + width) / 2;
      } else if (Number.isFinite(length)) {
        diameter = length;
      } else if (Number.isFinite(width)) {
        diameter = width;
      }
    }

    // ✅ Tell canvas which orientation is active
    BenchtopCanvas.setTapOrientation(position);

    // ✅ Place cut-out with orientation-specific fields
    BenchtopCanvas.setCutout({
      shape,
      diameter,
      length,
      width,
      cornerRadius: Number.isFinite(radius) ? radius : 0,
      offsetX: Number.isFinite(offsetX) ? offsetX : 0,
      offsetY: Number.isFinite(offsetY) ? offsetY : 0,

      // orientation-specific placements
      '12_c_x': parseSafe(match['12_c_x']),
      '12_c_y': parseSafe(match['12_c_y']),
      '10_c_x': parseSafe(match['10_c_x']),
      '10_c_y': parseSafe(match['10_c_y']),
      '2_c_x': parseSafe(match['2_c_x']),
      '2_c_y': parseSafe(match['2_c_y'])
    });

    BenchtopCanvas.draw();
    App.updateReport();

    // ✅ Populate dropdown, no auto placement
    updateTapPositionOptions(match);
    updatePlacementButtons();
    return;
  }

  // ==============================
  // Hole placement basins
  // ==============================
  BenchtopCanvas.clearTaphole1();
  BenchtopCanvas.clearWastehole1();
  BenchtopCanvas.clearTaphole2();
  BenchtopCanvas.clearWastehole2();
  BenchtopCanvas.clearCutout();

  let t1x, t1y, w1x, w1y, t2x, t2y, w2x, w2y;

  if (isDouble && [1200, 1500, 1800].includes(size)) {
    // Double basin logic
    if (position === 'double_split_2_10') {
      t1x = parseSafe(match[`${size}_10l_t_x`]);
      t1y = parseSafe(match[`${size}_10l_t_y`]);
      w1x = parseSafe(match[`${size}_10l_w_x`]);
      w1y = parseSafe(match[`${size}_10l_w_y`]);

      t2x = parseSafe(match[`${size}_2r_t2_x`]);
      t2y = parseSafe(match[`${size}_2r_t2_y`]);
      w2x = parseSafe(match[`${size}_2r_w2_x`]);
      w2y = parseSafe(match[`${size}_2r_w2_y`]);
    } else {
      let posKey = position || '';
      if (posKey.startsWith('10')) posKey = '10';
      else if (posKey.startsWith('12')) posKey = '12';
      else if (posKey.startsWith('2')) posKey = '2';

      t1x = parseSafe(match[`${size}_${posKey}_t_x`]);
      t1y = parseSafe(match[`${size}_${posKey}_t_y`]);
      w1x = parseSafe(match[`${size}_${posKey}_w_x`]);
      w1y = parseSafe(match[`${size}_${posKey}_w_y`]);

      t2x = parseSafe(match[`${size}_${posKey}_t2_x`]);
      t2y = parseSafe(match[`${size}_${posKey}_t2_y`]);
      w2x = parseSafe(match[`${size}_${posKey}_w2_x`]);
      w2y = parseSafe(match[`${size}_${posKey}_w2_y`]);
    }

    if (Number.isFinite(t1x) && Number.isFinite(t1y)) {
      BenchtopCanvas.setTaphole1({ offsetX: t1x, offsetY: t1y });
    }
    if (Number.isFinite(w1x) && Number.isFinite(w1y)) {
      BenchtopCanvas.setWastehole1({ offsetX: w1x, offsetY: w1y });
    }
    if (Number.isFinite(t2x) && Number.isFinite(t2y)) {
      BenchtopCanvas.setTaphole2({ offsetX: t2x, offsetY: t2y });
    }
    if (Number.isFinite(w2x) && Number.isFinite(w2y)) {
      BenchtopCanvas.setWastehole2({ offsetX: w2x, offsetY: w2y });
    }
  } else {
    // Single mode: always use T1/W1
    if (position === 'nth') {
      w1x = parseSafe(match['nth_w_x']);
      w1y = parseSafe(match['nth_w_y']);
    } else {
      t1x = parseSafe(match[`${position}_t_x`]);
      t1y = parseSafe(match[`${position}_t_y`]);
      w1x = parseSafe(match[`${position}_w_x`]);
      w1y = parseSafe(match[`${position}_w_y`]);
    }

    if (Number.isFinite(t1x) && Number.isFinite(t1y)) {
      BenchtopCanvas.setTaphole1({ offsetX: t1x, offsetY: t1y });
    } else {
      BenchtopCanvas.clearTaphole1();
    }

    if (Number.isFinite(w1x) && Number.isFinite(w1y)) {
      BenchtopCanvas.setWastehole1({ offsetX: w1x, offsetY: w1y });
    } else {
      BenchtopCanvas.clearWastehole1();
    }
  }

  BenchtopCanvas.draw();
  App.updateReport();
  BenchtopCanvas.updateInputs();
  updatePlacementButtons();

  // 🔍 Debug: log current orientation and cutout state
  console.log('Orientation check:',
    BenchtopCanvas.getTapOrientation?.(),
    'cutout:', BenchtopCanvas.hasCutout?.() ? 'present' : 'none'
  );

  // ✅ Ensure manual panel mirrors T1/W1 in double mode
  requestAnimationFrame(() => {
    if (!document.getElementById('doubleMode')?.checked) return;
    const t1 = BenchtopCanvas.getTaphole1?.();
    const w1 = BenchtopCanvas.getWastehole1?.();
    const tapX = document.getElementById('tapX');
    const tapY = document.getElementById('tapY');
    const wasteX = document.getElementById('wasteX');
    const wasteY = document.getElementById('wasteY');
    if (tapX && tapY && t1) {
      tapX.value = String(t1.offsetX ?? '');
      tapY.value = String(t1.offsetY ?? '');
    }
    if (wasteX && wasteY && w1) {
      wasteX.value = String(w1.offsetX ?? '');
      wasteY.value = String(w1.offsetY ?? '');
    }

  });
}

/**
 * Update tap position dropdown based on mode, aligned to size-specific Excel headers,
 * and place holes on selection (preserving sign). Supports single and double,
 * including T2 for double positions and split option when available.
 */
export function updateTapPositionOptions(match) {
  const select = document.getElementById('tapPosition');
  if (!select || !match) return;

  const doubleCheckbox = document.getElementById('doubleMode');
  const isDouble = !!doubleCheckbox?.checked;

  const sizeSelect = document.getElementById('sizeSelect');
  const size = parseInt(sizeSelect?.value, 10);

  // Helpers
  const parseCell = v => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (s === '' || s.toUpperCase() === 'NA') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const addOptionSingle = (label, tx, ty, valueToken) => {
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return;
    const opt = document.createElement('option');
    opt.value = valueToken;          // '12', '10', or '2'
    opt.textContent = label;
    opt.dataset.tx = String(tx);     // T1 coords
    opt.dataset.ty = String(ty);
    select.appendChild(opt);
  };

  const addOptionDouble = (label, t1x, t1y, t2x, t2y, valueToken) => {
    if (![t1x, t1y, t2x, t2y].every(Number.isFinite)) return;
    const opt = document.createElement('option');
    opt.value = valueToken;          // '12', '10', or '2' (or 'split')
    opt.textContent = label;
    opt.dataset.tx = String(t1x);    // T1
    opt.dataset.ty = String(t1y);
    opt.dataset.t2x = String(t2x);   // T2
    opt.dataset.t2y = String(t2y);
    select.appendChild(opt);
  };

  // Build fresh
  select.innerHTML = '';

  // Always include "No tap hole"
  const noneOpt = document.createElement('option');
  noneOpt.value = 'nth';
  noneOpt.textContent = isDouble ? 'Double — No tap hole' : 'Single — No tap hole';
  noneOpt.dataset.tx = '';
  noneOpt.dataset.ty = '';
  noneOpt.dataset.t2x = '';
  noneOpt.dataset.t2y = '';
  select.appendChild(noneOpt);

  // Capability checks
  const supportsDouble = String(match.double || '').trim().toUpperCase() === 'Y';
  const allowedDoubleSizes = [1200, 1500, 1800];

  // Key maps
  const singleSizeKeys = {
    '10': { tx: `${size}_10_t_x`, ty: `${size}_10_t_y` },
    '12': { tx: `${size}_12_t_x`, ty: `${size}_12_t_y` },
    '2':  { tx: `${size}_2_t_x`,  ty: `${size}_2_t_y` }
  };

  const singlePlainKeys = {
    '10': { tx: '10_t_x', ty: '10_t_y' },
    '12': { tx: '12_t_x', ty: '12_t_y' },
    '2':  { tx: '2_t_x',  ty: '2_t_y' }
  };

  // Double mode: explicit T1 and T2 keys for aligned positions
  const doubleKeys = {
    '10': {
      t1x: `${size}_10_t_x`,  t1y: `${size}_10_t_y`,
      t2x: `${size}_10_t2_x`, t2y: `${size}_10_t2_y`
    },
    '12': {
      t1x: `${size}_12_t_x`,  t1y: `${size}_12_t_y`,
      t2x: `${size}_12_t2_x`, t2y: `${size}_12_t2_y`
    },
    '2': {
      t1x: `${size}_2_t_x`,   t1y: `${size}_2_t_y`,
      t2x: `${size}_2_t2_x`,  t2y: `${size}_2_t2_y`
    }
  };

  // Split keys per your placement code (10L for T1, 2R for T2)
  const splitKeys = {
    t1x: `${size}_10l_t_x`,  t1y: `${size}_10l_t_y`,
    t2x: `${size}_2r_t2_x`,  t2y: `${size}_2r_t2_y`
  };

  // Populate options
  if (isDouble && allowedDoubleSizes.includes(size) && supportsDouble) {
    ['10', '12', '2'].forEach(pos => {
      const k = doubleKeys[pos];
      const t1x = parseCell(match[k.t1x]);
      const t1y = parseCell(match[k.t1y]);
      const t2x = parseCell(match[k.t2x]);
      const t2y = parseCell(match[k.t2y]);
      addOptionDouble(`Double — ${pos} o’clock`, t1x, t1y, t2x, t2y, pos);
    });

    // Optional split option
    const t1xSplit = parseCell(match[splitKeys.t1x]);
    const t1ySplit = parseCell(match[splitKeys.t1y]);
    const t2xSplit = parseCell(match[splitKeys.t2x]);
    const t2ySplit = parseCell(match[splitKeys.t2y]);
    if ([t1xSplit, t1ySplit, t2xSplit, t2ySplit].every(Number.isFinite)) {
      addOptionDouble('Double — 2 & 10 o’clock split', t1xSplit, t1ySplit, t2xSplit, t2ySplit, 'split');
    }
  } else {
    // Single mode: prefer size-prefixed headers, fallback to plain cut-out keys
    ['10', '12', '2'].forEach(pos => {
      const ks = singleSizeKeys[pos];
      let tx = parseCell(match[ks.tx]);
      let ty = parseCell(match[ks.ty]);

      if (!Number.isFinite(tx) || !Number.isFinite(ty)) {
        const kp = singlePlainKeys[pos];
        tx = parseCell(match[kp.tx]);
        ty = parseCell(match[kp.ty]);
      }

      addOptionSingle(`Single — ${pos} o’clock`, tx, ty, pos);
    });
  }

  // Ensure no auto placement: default to "No tap hole"
  select.value = 'nth';

  // Remove previous listeners to avoid duplicates (keep same element reference)
  select.replaceWith(select.cloneNode(true));
  const freshSelect = document.getElementById('tapPosition');

// Bind placement on selection
freshSelect.addEventListener('change', () => {
  const sel = freshSelect.options[freshSelect.selectedIndex];
  if (!sel) return;

  const txStr = sel.dataset.tx || '';
  const tyStr = sel.dataset.ty || '';
  const t2xStr = sel.dataset.t2x || '';
  const t2yStr = sel.dataset.t2y || '';

  if (sel.value === 'nth' || txStr === '' || tyStr === '') {
    BenchtopCanvas.clearTaphole1();
    BenchtopCanvas.clearTaphole2();

    // ✅ Explicitly set orientation to 'nth'
    BenchtopCanvas.setTapOrientation('nth');

    BenchtopCanvas.draw();
    App.updateReport();

    if (typeof updatePlacementButtons === 'function') {
      updatePlacementButtons();
    }
    return;
  }

  const t1x = Number(txStr);
  const t1y = Number(tyStr);

  if (!Number.isFinite(t1x) || !Number.isFinite(t1y)) return;

  // Place T1
  BenchtopCanvas.setTaphole1({ offsetX: t1x, offsetY: t1y });

  // ✅ Only place T2 if this option is a "Double" selection
  if (sel.textContent.startsWith('Double')) {
    const t2x = Number(t2xStr);
    const t2y = Number(t2yStr);
    if (Number.isFinite(t2x) && Number.isFinite(t2y)) {
      BenchtopCanvas.setTaphole2({ offsetX: t2x, offsetY: t2y });
    } else {
      BenchtopCanvas.clearTaphole2();
    }
  } else {
    BenchtopCanvas.clearTaphole2();
  }

  // Update orientation for cutout
  BenchtopCanvas.setTapOrientation(sel.value);

  BenchtopCanvas.draw();
  App.updateReport();

  if (typeof updatePlacementButtons === 'function') {
    updatePlacementButtons();
  }
});
}

export function getFienzaData() {
  return fienzaData;
}
