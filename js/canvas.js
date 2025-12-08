// ===== Debug Version Marker =====
(function () {
  // Build a unique version string: YYYYMMDD + timestamp
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const version = `canvas.js ${dateStr}-${timeStr}`;

  // 1. Console log
  console.log("✅ Loaded:", version);

  // 2. DOM marker
  document.addEventListener('DOMContentLoaded', () => {
    const marker = document.createElement('div');
    marker.textContent = version;
    marker.style.position = 'fixed';
    marker.style.bottom = '10px';
    marker.style.right = '10px';
    marker.style.background = '#eee';
    marker.style.padding = '4px 8px';
    marker.style.fontSize = '12px';
    marker.style.zIndex = '9999';
    marker.style.border = '1px solid #333';
    document.body.appendChild(marker);
  });

  // 3. Global variable
  window.__canvasVersion = version;
})();


// ==============================
// Constants and canvas setup
// ==============================
const scale = 0.5; // 1 mm = 0.5 px
const heightMM = 465;    // fixed benchtop depth
let widthMM = 600;       // selected benchtop width
function mmToPx(mm) { return mm * scale; }

let canvas, ctx;
function ensureCanvas() {
  if (!canvas) {
    canvas = document.getElementById('benchtopCanvas');
    ctx = canvas?.getContext('2d');
  }
}

// ==============================
// Internal state (all in mm)
// ==============================
let taphole = null;
let wastehole = null;
let basin = null;
let cutout = null;
let dragging = null;
let placementMode = null;

let taphole1 = null;
let taphole2 = null;
let wastehole1 = null;
let wastehole2 = null;

let cornerRadius = 0;

// 🔒 Lock state
let holesLocked = false;
export function setHolesLocked(state) {
  holesLocked = state;
}

// Track tap orientation
let selectedTapOrientation = null;

// ==============================
// Hooks provided by app.js
// ==============================
let getWasteSizeHook = () => 70;
let onUpdateReportHook = () => { };

export function setCanvasHooks({ getWasteSize, onUpdateReport } = {}) {
  if (typeof getWasteSize === 'function') getWasteSizeHook = getWasteSize;
  if (typeof onUpdateReport === 'function') onUpdateReportHook = onUpdateReport;
}

// ==============================
// Drawing helpers
// ==============================
function drawArrowheadVertical(ctx, fromX, fromY, toX, toY) {
  const headlen = 10;
  const up = toY < fromY;
  const angle = up ? -Math.PI / 2 : Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6),
    toY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6),
    toY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.lineTo(toX, toY);
  ctx.stroke();
}

function drawArrowheadHorizontal(ctx, fromX, fromY, toX, toY) {
  const headlen = 10;
  const right = toX > fromX;
  const angle = right ? 0 : Math.PI;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6),
    toY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6),
    toY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.lineTo(toX, toY);
  ctx.stroke();
}

function drawArrowhead(ctx, fromX, fromY, toX, toY) {
  const headlen = 10;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6),
    toY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6),
    toY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.lineTo(toX, toY);
  ctx.stroke();
}

function drawHole(h, color, label, diameterMM, x0, y0, widthPx) {
  const baseX = x0 + widthPx / 2;
  const baseY = y0;

  const cx = baseX + mmToPx(h.offsetX);
  const cy = baseY + mmToPx(h.offsetY);
  const rPx = mmToPx(diameterMM / 2);

  ctx.beginPath();
  ctx.arc(cx, cy, rPx, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.4;
  ctx.fill();
  ctx.globalAlpha = 1.0;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#000';
  ctx.fillText(label, cx + rPx + 4, cy - 4);
}

// ==============================
// Drawing (mm -> px rendering)
// ==============================
function draw() {
  ensureCanvas();
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const widthPx = mmToPx(widthMM);
  const heightPx = mmToPx(heightMM);
  const x0 = (canvas.width - widthPx) / 2;
  const y0 = 20;

  // Benchtop outline
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0, y0, widthPx, heightPx);

  // Centerlines
  ctx.strokeStyle = '#aaa';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x0, y0 + heightPx / 2);
  ctx.lineTo(x0 + widthPx, y0 + heightPx / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x0 + widthPx / 2, y0);
  ctx.lineTo(x0 + widthPx / 2, y0 + heightPx);
  ctx.stroke();
  ctx.setLineDash([]);

  // Center marker
  ctx.beginPath();
  ctx.arc(x0 + widthPx / 2, y0 + heightPx / 2, 3, 0, 2 * Math.PI);
  ctx.fillStyle = '#000';
  ctx.fill();

  // Features
  if (taphole) drawHole(taphole, 'blue', 'T', 35, x0, y0, widthPx);
  if (wastehole) drawHole(wastehole, 'green', 'W', getWasteSizeHook(), x0, y0, widthPx);

  // Double mode holes
  if (taphole1) drawHole(taphole1, 'blue', 'T1', 35, x0, y0, widthPx);
  if (taphole2) drawHole(taphole2, 'red', 'T2', 35, x0, y0, widthPx);
  if (wastehole1) drawHole(wastehole1, 'green', 'W1', getWasteSizeHook(), x0, y0, widthPx);
  if (wastehole2) drawHole(wastehole2, 'orange', 'W2', getWasteSizeHook(), x0, y0, widthPx);

  if (basin) drawBasin(basin, x0, y0, widthPx);
  if (cutout) drawCutout(cutout, x0, y0, widthPx);

  // Legend
  drawLegend();

  // ==============================
  // Measurement arrows overlay
  // ==============================
  const showArrow = document.getElementById('showMeasurementArrow')?.checked;
  if (showArrow) {
    const baseX = x0 + widthPx / 2; // center X of benchtop
    const baseY = y0;               // back edge Y (top of benchtop)

    // Build hole list using stored color + label
    const holes = [
      taphole && { ...taphole, label: 'T' },
      wastehole && { ...wastehole, label: 'W' },
      taphole1 && { ...taphole1, label: 'T1' },
      taphole2 && { ...taphole2, label: 'T2' },
      wastehole1 && { ...wastehole1, label: 'W1' },
      wastehole2 && { ...wastehole2, label: 'W2' }
    ].filter(Boolean);

    for (const h of holes) {
      const holeX = baseX + mmToPx(h.offsetX);
      const holeY = baseY + mmToPx(h.offsetY);

      // --- Arrow 1: Back edge (vertical) → hole center ---
      ctx.strokeStyle = h.color || '#000'; // fallback black if missing
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(holeX, baseY);
      ctx.lineTo(holeX, holeY);
      ctx.stroke();

      drawArrowheadVertical(ctx, holeX, baseY, holeX, holeY);
      drawArrowheadVertical(ctx, holeX, holeY, holeX, baseY);

      // Label: absolute Y offset in mm
      const offsetYmm = Math.round(Math.abs(h.offsetY));
      const midY = (baseY + holeY) / 2;
      ctx.fillStyle = h.color || '#000';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${offsetYmm} mm (back edge)`, holeX, midY - 5);

      // --- Arrow 2: Centerline (horizontal) → hole center ---
      ctx.beginPath();
      ctx.moveTo(baseX, holeY);
      ctx.lineTo(holeX, holeY);
      ctx.stroke();

      drawArrowheadHorizontal(ctx, baseX, holeY, holeX, holeY);
      drawArrowheadHorizontal(ctx, holeX, holeY, baseX, holeY);

      // Label: absolute X offset in mm
      const offsetXmm = Math.round(Math.abs(h.offsetX));
      const midX = (baseX + holeX) / 2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${offsetXmm} mm (centerline)`, midX, holeY + 16);
    }
  }
}

// ==============================
// Basin drawing
// ==============================
function drawBasin(b, x0, y0, widthPx) {
  const baseX = x0 + widthPx / 2;
  const baseY = y0;
  const cx = baseX + mmToPx(b.offsetX ?? 0);
  const cy = baseY + mmToPx(b.offsetY ?? 0);

  ctx.save();
  ctx.beginPath();

  if (b.shape === 'circle' && Number.isFinite(b.diameter)) {
    const rPx = mmToPx(b.diameter) / 2;
    ctx.arc(cx, cy, rPx, 0, 2 * Math.PI);
  } else if (b.shape === 'square' && Number.isFinite(b.size)) {
    const sidePx = mmToPx(b.size);
    const rPx = Math.min(mmToPx(cornerRadius || 0), sidePx / 2);
    if (rPx > 0) {
      drawRoundedRect(ctx, cx - sidePx / 2, cy - sidePx / 2, sidePx, sidePx, rPx);
    } else {
      ctx.rect(cx - sidePx / 2, cy - sidePx / 2, sidePx, sidePx);
    }
  } else if (b.shape === 'rect' && Number.isFinite(b.width) && Number.isFinite(b.height)) {
    const wPx = mmToPx(b.width);
    const hPx = mmToPx(b.height);
    const rPx = Math.min(mmToPx(cornerRadius || 0), wPx / 2, hPx / 2);
    if (rPx > 0) {
      drawRoundedRect(ctx, cx - wPx / 2, cy - hPx / 2, wPx, hPx, rPx);
    } else {
      ctx.rect(cx - wPx / 2, cy - hPx / 2, wPx, hPx);
    }
  }

  ctx.fillStyle = 'rgba(128,128,128,0.3)';
  ctx.fill();
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

// Rounded rectangle helper
function drawRoundedRect(ctx, x, y, w, h, r) {
  const right = x + w;
  const bottom = y + h;

  ctx.moveTo(x + r, y);
  ctx.lineTo(right - r, y);
  ctx.quadraticCurveTo(right, y, right, y + r);

  ctx.lineTo(right, bottom - r);
  ctx.quadraticCurveTo(right, bottom, right - r, bottom);

  ctx.lineTo(x + r, bottom);
  ctx.quadraticCurveTo(x, bottom, x, bottom - r);

  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function drawCutout(c, x0, y0, widthPx) {
  const baseX = x0 + widthPx / 2;
  const baseY = y0;

  // Decide which coordinates to use based on orientation
  let cx, cy, usedBranch;
  if (selectedTapOrientation === '12' && Number.isFinite(c.pos12?.x) && Number.isFinite(c.pos12?.y)) {
    cx = baseX + mmToPx(c.pos12.x);
    cy = baseY + mmToPx(c.pos12.y);
    usedBranch = 'pos12';
  } else if (selectedTapOrientation === '10' && Number.isFinite(c.pos10?.x) && Number.isFinite(c.pos10?.y)) {
    cx = baseX + mmToPx(c.pos10.x);
    cy = baseY + mmToPx(c.pos10.y);
    usedBranch = 'pos10';
  } else if (selectedTapOrientation === '2' && Number.isFinite(c.pos2?.x) && Number.isFinite(c.pos2?.y)) {
    cx = baseX + mmToPx(c.pos2.x);
    cy = baseY + mmToPx(c.pos2.y);
    usedBranch = 'pos2';
  } else {
    const genX = c.offsetX ?? c.c_x ?? c.cx ?? 0;
    const genY = c.offsetY ?? c.c_y ?? c.cy ?? 0;
    cx = baseX + mmToPx(genX);
    cy = baseY + mmToPx(genY);
    usedBranch = 'generic';
  }

  // ✅ Step 2: record actual placement for reporting
const fromCenterMM = (cx - baseX) / mmToPx(1);
const fromBackMM   = (cy - baseY) / mmToPx(1);

  BenchtopCanvas.state.cutoutPlacement = {
    orientation: selectedTapOrientation,
    branch: usedBranch,
    cxPx: cx,
    cyPx: cy,
    fromCenterMM,
    fromBackMM,
    widthMM: Number.isFinite(c.width) ? c.width : null,
    lengthMM: Number.isFinite(c.length) ? c.length : null,
    diameterMM: (c.shape === 'circle' && Number.isFinite(c.length)) ? c.length : null,
    cornerRadiusMM: Number.isFinite(c.cornerRadius) ? c.cornerRadius : null
  };

  console.log('drawCutout placement:', BenchtopCanvas.state.cutoutPlacement);

  ctx.save();
  ctx.strokeStyle = 'orange';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);

  if (c.shape === 'circle' && Number.isFinite(c.length)) {
    const rPx = mmToPx(c.length) / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
    ctx.stroke();
  } else if ((c.shape === 'square' || c.shape === 'rect') &&
             Number.isFinite(c.width) && Number.isFinite(c.length)) {
    const wPx = mmToPx(c.width);
    const lPx = mmToPx(c.length);
    if (c.cornerRadius && c.cornerRadius > 0 && ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(cx - wPx / 2, cy - lPx / 2, wPx, lPx, mmToPx(c.cornerRadius));
      ctx.stroke();
    } else {
      ctx.strokeRect(cx - wPx / 2, cy - lPx / 2, wPx, lPx);
    }
  }

  ctx.restore();
}

// ==============================
// Legend drawing
// ==============================
function drawLegend() {
  ctx.save();
  ctx.font = '12px Arial';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const legendX = 20;
  const legendY = canvas.height - 100;
  const lineHeight = 18;
  let y = legendY;

  if (taphole) {
    ctx.fillStyle = 'blue';
    ctx.fillRect(legendX, y, 12, 12);
    ctx.fillStyle = '#000';
    ctx.fillText('Taphole = Blue', legendX + 20, y + 6);
    y += lineHeight;
  }
  if (wastehole) {
    ctx.fillStyle = 'green';
    ctx.fillRect(legendX, y, 12, 12);
    ctx.fillStyle = '#000';
    ctx.fillText('Waste hole = Green', legendX + 20, y + 6);
    y += lineHeight;
  }
  if (taphole1) {
    ctx.fillStyle = 'blue';
    ctx.fillRect(legendX, y, 12, 12);
    ctx.fillStyle = '#000';
    ctx.fillText('Taphole 1 = Blue', legendX + 20, y + 6);
    y += lineHeight;
  }
  if (wastehole1) {
    ctx.fillStyle = 'green';
    ctx.fillRect(legendX, y, 12, 12);
    ctx.fillStyle = '#000';
    ctx.fillText('Waste hole 1 = Green', legendX + 20, y + 6);
    y += lineHeight;
  }
  if (taphole2) {
    ctx.fillStyle = 'red';
    ctx.fillRect(legendX, y, 12, 12);
    ctx.fillStyle = '#000';
    ctx.fillText('Taphole 2 = Red', legendX + 20, y + 6);
    y += lineHeight;
  }
  if (wastehole2) {
    ctx.fillStyle = 'orange';
    ctx.fillRect(legendX, y, 12, 12);
    ctx.fillStyle = '#000';
    ctx.fillText('Waste hole 2 = Orange', legendX + 20, y + 6);
    y += lineHeight;
  }

  ctx.restore();
}

// ==============================
// Drag detection
// ==============================
function detectDrag(x, y, x0, y0, widthPx) {
  ensureCanvas();
  const baseX = x0 + widthPx / 2;
  const baseY = y0;

  const candidates = [];
  const add = (ref, rMM) => { if (ref) candidates.push({ ref, r: mmToPx(rMM / 2) }); };

  add(taphole, 35);
  add(wastehole, getWasteSizeHook());
  add(taphole1, 35);
  add(taphole2, 35);
  add(wastehole1, getWasteSizeHook());
  add(wastehole2, getWasteSizeHook());
  if (basin) candidates.push({ ref: basin, r: mmToPx(60) });

  dragging = null;
  for (const c of candidates) {
    const cx = baseX + mmToPx(c.ref.offsetX);
    const cy = baseY + mmToPx(c.ref.offsetY);
    if (Math.hypot(cx - x, cy - y) < c.r + 10) {
      dragging = c.ref;
      break;
    }
  }
}

// ==============================
// Drag handling
// ==============================
function handleDrag(x, y, x0, y0, widthPx) {
  if (!dragging) return;
  const baseX = x0 + widthPx / 2;
  const baseY = y0;

  const newOffsetX = Math.round((x - baseX) / scale);
  const newOffsetY = Math.round((y - baseY) / scale);

  const dx = newOffsetX - dragging.offsetX;
  const dy = newOffsetY - dragging.offsetY;

  dragging.offsetX = newOffsetX;
  dragging.offsetY = newOffsetY;

  if (holesLocked) {
    const group = getExistingHoles();
    for (const h of group) {
      if (h !== dragging) {
        h.offsetX += dx;
        h.offsetY += dy;
      }
    }
  }

  draw();
  onUpdateReportHook();
  updateInputs();
}

// ==============================
// Click placement (patched with colors)
// ==============================
function handleClick(x, y) {
  ensureCanvas();
  if (!placementMode) return;

  const widthPx = mmToPx(widthMM);
  const x0 = (canvas.width - widthPx) / 2;
  const y0 = 20;
  const baseX = x0 + widthPx / 2;
  const baseY = y0;

  const offsetX = Math.round((x - baseX) / scale);
  const offsetY = Math.round((y - baseY) / scale);

  if (placementMode === 'tap') {
    taphole = { offsetX, offsetY, color: 'blue' };
  } else if (placementMode === 'tap1') {
    taphole1 = { offsetX, offsetY, color: 'blue' };
  } else if (placementMode === 'tap2') {
    taphole2 = { offsetX, offsetY, color: 'red' };
  } else if (placementMode === 'waste') {
    wastehole = { offsetX, offsetY, color: 'green' };
  } else if (placementMode === 'waste1') {
    wastehole1 = { offsetX, offsetY, color: 'green' };
  } else if (placementMode === 'waste2') {
    wastehole2 = { offsetX, offsetY, color: 'orange' };
  }

  placementMode = null;
  draw();
  onUpdateReportHook();
  updateInputs();
}

// ==============================
// Existing holes list
// ==============================
function getExistingHoles() {
  const holes = [];
  if (taphole) holes.push(taphole);
  if (wastehole) holes.push(wastehole);
  if (taphole1) holes.push(taphole1);
  if (taphole2) holes.push(taphole2);
  if (wastehole1) holes.push(wastehole1);
  if (wastehole2) holes.push(wastehole2);
  return holes;
}

// ==============================
// Attach listeners
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  ensureCanvas();
  if (!canvas) return;

  canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const widthPx = mmToPx(widthMM);
    const x0 = (canvas.width - widthPx) / 2;
    const y0 = 20;
    detectDrag(e.clientX - rect.left, e.clientY - rect.top, x0, y0, widthPx);
  });

  canvas.addEventListener('mousemove', e => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const widthPx = mmToPx(widthMM);
    const x0 = (canvas.width - widthPx) / 2;
    const y0 = 20;
    handleDrag(e.clientX - rect.left, e.clientY - rect.top, x0, y0, widthPx);
  });

  canvas.addEventListener('mouseup', () => { dragging = null; });

  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    handleClick(e.clientX - rect.left, e.clientY - rect.top);
  });
});

// ==============================
// Inputs sync
// ==============================
function updateInputs() {
  const isDouble = !!document.getElementById('doubleMode')?.checked;

  const tx = document.getElementById('tapX');
  const ty = document.getElementById('tapY');
  if (tx && ty && taphole1) {
    if (!document.activeElement || (document.activeElement !== tx && document.activeElement !== ty)) {
      tx.value = taphole1.offsetX ?? '';
      ty.value = taphole1.offsetY ?? '';
    }
  }

  const wx = document.getElementById('wasteX');
  const wy = document.getElementById('wasteY');
  if (wx && wy && wastehole1) {
    if (!document.activeElement || (document.activeElement !== wx && document.activeElement !== wy)) {
      wx.value = wastehole1.offsetX ?? '';
      wy.value = wastehole1.offsetY ?? '';
    }
  }

  const t1x = document.getElementById('tap1X');
  const t1y = document.getElementById('tap1Y');
  if (t1x) t1x.value = taphole1?.offsetX ?? '';
  if (t1y) t1y.value = taphole1?.offsetY ?? '';

  const t2x = document.getElementById('tap2X');
  const t2y = document.getElementById('tap2Y');
  if (t2x) t2x.value = taphole2?.offsetX ?? '';
  if (t2y) t2y.value = taphole2?.offsetY ?? '';

  const w1x = document.getElementById('waste1X');
  const w1y = document.getElementById('waste1Y');
  if (w1x) w1x.value = wastehole1?.offsetX ?? '';
  if (w1y) w1y.value = wastehole1?.offsetY ?? '';

  const w2x = document.getElementById('waste2X');
  const w2y = document.getElementById('waste2Y');
  if (w2x) w2x.value = wastehole2?.offsetX ?? '';
  if (w2y) w2y.value = wastehole2?.offsetY ?? '';
}

// ==============================
// Reporting
// ==============================
function getReport() {
  const lines = [];

  function holeLine(obj, label, diaMM) {
    if (!obj) return '';
    const side = obj.offsetX < 0 ? 'LEFT' : (obj.offsetX > 0 ? 'RIGHT' : 'center');
    const sideText = obj.offsetX === 0
      ? `0mm from benchtop center`
      : `${Math.abs(obj.offsetX)}mm ${side} of benchtop center`;
    return `${label} Hole: ${sideText}, ${obj.offsetY}mm from back. Diameter ${diaMM}mm.`;
  }

  if (taphole1) lines.push(holeLine(taphole1, 'Tap 1', 35));
  if (wastehole1) lines.push(holeLine(wastehole1, 'Waste 1', getWasteSizeHook()));
  if (taphole2) lines.push(holeLine(taphole2, 'Tap 2', 35));
  if (wastehole2) lines.push(holeLine(wastehole2, 'Waste 2', getWasteSizeHook()));

  if (basin) {
    const side = basin.offsetX < 0 ? 'left' : 'right';
    let sizeText = '';
    if (basin.shape === 'circle') sizeText = `Ø${basin.diameter}mm`;
    else if (basin.shape === 'square') sizeText = `${basin.size}mm square`;
    else if (basin.shape === 'rect') sizeText = `${basin.width}mm × ${basin.height}mm rectangle`;

    let basinLine = `Basin (${basin.shape}): ${Math.abs(basin.offsetX)}mm ${side} of center, ${basin.offsetY}mm from back. Size ${sizeText}.`;
    if ((basin.shape === 'square' || basin.shape === 'rect') && cornerRadius > 0) {
      basinLine += ` Corner radius: ${Math.round(cornerRadius)}mm.`;
    }
    lines.push(basinLine);
  }

  if (cutout) {
    const p = BenchtopCanvas.state?.cutoutPlacement;
    if (p) {
      const dims = p.diameterMM ? `Ø${p.diameterMM}mm`
        : (p.widthMM && p.lengthMM ? `${p.lengthMM}mm × ${p.widthMM}mm` : `Cut-out`);
      const fromCenter = typeof p.fromCenterMM === 'number' ? `${p.fromCenterMM}mm from center` : '—';
      const fromBack = typeof p.fromBackMM === 'number' ? `${p.fromBackMM}mm from back` : '—';
      lines.push(`Cut-out: ${dims}, ${fromCenter}, ${fromBack}`);
    }
  }

  return lines.join('\n');
}

// ==============================
// BenchtopCanvas API
// ==============================
export const BenchtopCanvas = {
  // Size and orientation
  setSize(mm) {
    widthMM = mm;
    draw();
  },
  setTapOrientation(o) {
    selectedTapOrientation = o; // '12', '10', or '2'
    draw();
    onUpdateReportHook();
  },
  getTapOrientation() { return selectedTapOrientation; },

  // Single holes
  setTaphole(obj) {
    taphole = { ...obj, color: 'blue' };
    draw(); onUpdateReportHook(); updateInputs();
  },
  clearTaphole() { taphole = null; draw(); onUpdateReportHook(); },
  hasTaphole() { return !!taphole; },

  setWastehole(obj) {
    wastehole = { ...obj, color: 'green' };
    draw(); onUpdateReportHook(); updateInputs();
  },
  clearWastehole() { wastehole = null; draw(); onUpdateReportHook(); },
  hasWastehole() { return !!wastehole; },

  // Double holes
  setTaphole1(obj) {
    taphole1 = { ...obj, color: 'blue' };
    draw(); onUpdateReportHook(); updateInputs();
  },
  clearTaphole1() { taphole1 = null; draw(); onUpdateReportHook(); },
  hasTaphole1() { return !!taphole1; },

  setTaphole2(obj) {
    taphole2 = { ...obj, color: 'red' };
    draw(); onUpdateReportHook(); updateInputs();
  },
  clearTaphole2() { taphole2 = null; draw(); onUpdateReportHook(); },
  hasTaphole2() { return !!taphole2; },

  setWastehole1(obj) {
    wastehole1 = { ...obj, color: 'green' };
    draw(); onUpdateReportHook(); updateInputs();
  },
  clearWastehole1() { wastehole1 = null; draw(); onUpdateReportHook(); },
  hasWastehole1() { return !!wastehole1; },

  setWastehole2(obj) {
    wastehole2 = { ...obj, color: 'orange' };
    draw(); onUpdateReportHook(); updateInputs();
  },
  clearWastehole2() { wastehole2 = null; draw(); onUpdateReportHook(); },
  hasWastehole2() { return !!wastehole2; },

  // Basin
  setBasin(obj) {
    basin = {
      ...obj,
      offsetX: obj.offsetX ?? 0,
      offsetY: obj.offsetY ?? 232.5
    };
    draw(); onUpdateReportHook();
  },
  clearBasin() { basin = null; draw(); onUpdateReportHook(); },
  hasBasin() { return !!basin; },

  // Cutout
  setCutout(obj) {
    cutout = {
      shape: obj.shape || 'rect',
      length: Number(obj.length) || null,
      width: Number(obj.width) || null,
      diameter: Number(obj.diameter) || null,
      cornerRadius: Number(obj.cornerRadius) || 0,
      offsetX: Number(obj.offsetX) || 0,
      offsetY: Number(obj.offsetY) || 0,
      pos12: {
        x: obj['12_c_x'] != null ? Number(obj['12_c_x']) : null,
        y: obj['12_c_y'] != null ? Number(obj['12_c_y']) : null
      },
      pos10: {
        x: obj['10_c_x'] != null ? Number(obj['10_c_x']) : null,
        y: obj['10_c_y'] != null ? Number(obj['10_c_y']) : null
      },
      pos2: {
        x: obj['2_c_x'] != null ? Number(obj['2_c_x']) : null,
        y: obj['2_c_y'] != null ? Number(obj['2_c_y']) : null
      }
    };
    draw(); onUpdateReportHook();
  },
  clearCutout() { cutout = null; draw(); onUpdateReportHook(); },
  hasCutout() { return !!cutout; },

  // Placement mode
  setPlacementMode(mode) { placementMode = mode; },

  // Corner radius
  setCornerRadius(r) {
    let maxRadius = Infinity;
    if (basin?.shape === 'square') {
      maxRadius = (basin.size ?? 0) / 2;
    } else if (basin?.shape === 'rect') {
      const bw = basin.width ?? 0;
      const bh = basin.height ?? 0;
      maxRadius = Math.min(bw / 2, bh / 2);
    }
    cornerRadius = Math.min(Math.max(0, Number(r) || 0), maxRadius);
    draw(); onUpdateReportHook(); updateInputs();
    return cornerRadius;
  },
  clearCornerRadius() {
    cornerRadius = 0;
    draw(); onUpdateReportHook(); updateInputs();
    return cornerRadius;
  },
  getCornerRadius() { return cornerRadius; },

  // Core
  draw,
  updateInputs,
  getReport
};

// Maintain state object
BenchtopCanvas.state = BenchtopCanvas.state || {};
BenchtopCanvas.state.cutoutPlacement = null;

// Expose globally
window.BenchtopCanvas = BenchtopCanvas;