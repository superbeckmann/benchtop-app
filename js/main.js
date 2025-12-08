


import { App } from './app.js';
import { BenchtopCanvas } from './canvas.js';
import { setHolesLocked } from './canvas.js';
import {
  loadFienzaBasinsFromURL,
  getFienzaData,
  updateTapPositionOptions,
  placeFienzaHoles,
  updateFienzaDropdown 
} from './fienza.js';

document.addEventListener('DOMContentLoaded', () => {
  
  
  
  const sizeSelect = document.getElementById('sizeSelect');
  const wasteSelect = document.getElementById('wasteSize');
  const basinShape = document.getElementById('basinShape');
  const basinSizeInputs = document.getElementById('basinSizeInputs');
  const basinPositionGroup = document.getElementById('basinPositionGroup');
  const placeTapBtn = document.getElementById('placeTapBtn');
  const placeWasteBtn = document.getElementById('placeWasteBtn');
  const fienzaSelect = document.getElementById('fienzaSelect');
  const tapPosition = document.getElementById('tapPosition');
  const doubleMode = document.getElementById('doubleMode');
  const placeTap2Btn = document.getElementById('placeTap2Btn');
  const placeWaste2Btn = document.getElementById('placeWaste2Btn');
  const lockBtn = document.getElementById('lockBtn');
  const customShapeSelect = document.getElementById('customShape');
  const cornerRadiusFields = document.getElementById('cornerRadiusFields');
  const cornerRadiusSlider = document.getElementById('cornerRadius');
  const cornerRadiusValue = document.getElementById('cornerRadiusValue');

  function isDoubleModeActive() {
    
    const checkbox = document.getElementById('doubleModeCheckbox');
    return checkbox && checkbox.checked;
  }

    
  
  
  function updateCornerRadiusMax() {
    const shape = basinShape?.value;   
    let maxRadius = 250;

    if (shape === 'square') {
      const side = parseFloat(document.getElementById('basinSize')?.value || 0);
      if (side > 0) maxRadius = side / 2;
    } else if (shape === 'rect') {
      const width  = parseFloat(document.getElementById('basinWidth')?.value || 0);
      const height = parseFloat(document.getElementById('basinHeight')?.value || 0);
      if (width > 0 && height > 0) maxRadius = Math.min(width / 2, height / 2);
    }

    if (cornerRadiusSlider) cornerRadiusSlider.max = maxRadius;
    if (cornerRadiusValue)  cornerRadiusValue.max  = maxRadius;

    const current = parseFloat(cornerRadiusSlider?.value || 0);
    if (current > maxRadius) updateCornerRadius(maxRadius);
  }

  function updateCornerRadius(val) {
    const radius = parseFloat(val) || 0;
    BenchtopCanvas.setCornerRadius(radius);

    
    const clamped = BenchtopCanvas.getCornerRadius();

    
    if (cornerRadiusSlider) cornerRadiusSlider.value = clamped.toString();
    if (cornerRadiusValue)  cornerRadiusValue.value  = clamped.toString();

    BenchtopCanvas.draw();
    App.updateReport();
  }

  
  
  
  if (basinShape && cornerRadiusFields && cornerRadiusSlider && cornerRadiusValue) {
    basinShape.addEventListener('change', () => {
      const shape = basinShape.value;
      if (shape === 'square' || shape === 'rect') {
        cornerRadiusFields.style.display = '';
        updateCornerRadiusMax(); 
      } else {
        cornerRadiusFields.style.display = 'none';
        BenchtopCanvas.setCornerRadius(0);
        updateCornerRadius(0); 
      }
      BenchtopCanvas.draw();
      App.updateReport();
    });

    cornerRadiusSlider.addEventListener('input', e => updateCornerRadius(e.target.value));
    cornerRadiusValue.addEventListener('input', e => updateCornerRadius(e.target.value));
  }

  
  
  
  document.getElementById('basinSize')?.addEventListener('input', updateCornerRadiusMax);
  document.getElementById('basinWidth')?.addEventListener('input', updateCornerRadiusMax);
  document.getElementById('basinHeight')?.addEventListener('input', updateCornerRadiusMax);
  
  
  
  function updateDoubleVisibility() {
    const val = parseInt(sizeSelect.value, 10);

    
    doubleMode.style.display = 'inline-block';

    if ([1200, 1500, 1800].includes(val)) {
      doubleMode.disabled = false;
    } else {
      doubleMode.disabled = true;
      doubleMode.checked = false;

      
      if (BenchtopCanvas.hasTaphole2()) BenchtopCanvas.clearTaphole2();
      if (BenchtopCanvas.hasWastehole2()) BenchtopCanvas.clearWastehole2();

      
      const tap2Fields = document.getElementById('tap2Fields');
      const waste2Fields = document.getElementById('waste2Fields');
      if (tap2Fields) tap2Fields.style.display = 'none';
      if (waste2Fields) waste2Fields.style.display = 'none';
    }

    
    if (doubleMode.checked) {
      placeTap2Btn.style.display = 'inline-block';
      placeWaste2Btn.style.display = 'inline-block';
    } else {
      placeTap2Btn.style.display = 'none';
      placeWaste2Btn.style.display = 'none';
    }
  }

  doubleMode.addEventListener('change', updateDoubleVisibility);
  sizeSelect.addEventListener('change', updateDoubleVisibility);
  updateDoubleVisibility();
  

function updateAndPlaceFienza() {
  const isDouble = doubleMode?.checked === true;
  const selectedSize = parseInt(sizeSelect?.value, 10);

  updateFienzaDropdown(isDouble);

  const code = fienzaSelect?.value;
  let match = getFienzaData()?.find(r => r['Item Code'] === code);

  
  if (match && !isDouble) {
    match = { ...match, double: "N" };
  }

  
  updateTapPositionOptions(match, isDouble, selectedSize);

  if (isDouble && match?.double === "Y") {
    placeFienzaHoles(App, window.updatePlacementButtons, true);
  } else {
    if (BenchtopCanvas.hasTaphole2()) BenchtopCanvas.clearTaphole2();
    if (BenchtopCanvas.hasWastehole2()) BenchtopCanvas.clearWastehole2();
    const tap2Fields = document.getElementById('tap2Fields');
    const waste2Fields = document.getElementById('waste2Fields');
    if (tap2Fields) tap2Fields.style.display = 'none';
    if (waste2Fields) waste2Fields.style.display = 'none';

    placeFienzaHoles(App, window.updatePlacementButtons, false);
  }
}



  


placeTapBtn.addEventListener('click', () => {
  
  if (BenchtopCanvas.hasTaphole1()) {
    BenchtopCanvas.clearTaphole1();
  } else {
    BenchtopCanvas.setTaphole1({ offsetX: 0, offsetY: 232.5 });
  }
  App.updateReport();
  updatePlacementButtons();
});

window.updatePlacementButtons = updatePlacementButtons;

placeWasteBtn.addEventListener('click', () => {
  
  if (BenchtopCanvas.hasWastehole1()) {
    BenchtopCanvas.clearWastehole1();
  } else {
    BenchtopCanvas.setWastehole1({ offsetX: 0, offsetY: 232.5 });
  }
  App.updateReport();
  updatePlacementButtons();
});

placeTap2Btn.addEventListener('click', () => {
  
  if (BenchtopCanvas.hasTaphole2()) {
    BenchtopCanvas.clearTaphole2();
  } else {
    BenchtopCanvas.setTaphole2({ offsetX: 0, offsetY: 232.5 });
  }
  App.updateReport();
  updatePlacementButtons();
});

placeWaste2Btn.addEventListener('click', () => {
  
  if (BenchtopCanvas.hasWastehole2()) {
    BenchtopCanvas.clearWastehole2();
  } else {
    BenchtopCanvas.setWastehole2({ offsetX: 0, offsetY: 232.5 });
  }
  App.updateReport();
  updatePlacementButtons();
});


  
  
  
  const arrowToggle = document.getElementById('showMeasurementArrow');
  if (arrowToggle) {
    arrowToggle.addEventListener('change', () => {
      BenchtopCanvas.draw();   
      App.updateReport();      
    });
  }


  
  
  
  const doubleModeCheckbox = document.getElementById('doubleMode');

  doubleModeCheckbox.addEventListener('change', (e) => {
    if (!e.target.checked) {
      
      
      BenchtopCanvas.clearWastehole();
      BenchtopCanvas.clearTaphole1();
      BenchtopCanvas.clearWastehole1();
      BenchtopCanvas.clearTaphole2();
      BenchtopCanvas.clearWastehole2();
      BenchtopCanvas.clearCutout();

      BenchtopCanvas.draw();
      App.updateReport();
      BenchtopCanvas.updateInputs();
      updatePlacementButtons();
    } else {
      
      const tap2Fields = document.getElementById('tap2Fields');
      const waste2Fields = document.getElementById('waste2Fields');
      if (tap2Fields) tap2Fields.style.display = '';
      if (waste2Fields) waste2Fields.style.display = '';
      updatePlacementButtons();
    }
  });


  
  
  
  wasteSelect.addEventListener('change', () => {
    BenchtopCanvas.draw();
    App.updateReport();
  });

  
  
  
  let locked = false;
  lockBtn.addEventListener('click', () => {
    locked = !locked;
    setHolesLocked(locked);
    lockBtn.classList.toggle('active', locked);
    lockBtn.textContent = locked ? 'Unlock Holes' : 'Lock Holes';
  });




loadFienzaBasinsFromURL('./assets/fienza_basins.xlsx');

fienzaSelect.addEventListener('change', () => {
  const code = fienzaSelect.value;
  const match = getFienzaData().find(row => row['Item Code'] === code);
  updateTapPositionOptions(match, doubleMode.checked);
  placeFienzaHoles(App, updatePlacementButtons, doubleMode.checked);
});


tapPosition.addEventListener('change', () => {
  const pos = tapPosition.value; 
  console.log('tapPosition changed ->', pos);

  
  BenchtopCanvas.setTapOrientation(pos);

  
  placeFienzaHoles(App, updatePlacementButtons, doubleMode.checked);
  updatePlacementButtons();
});


  
  
  
  sizeSelect.addEventListener('change', () => {
    BenchtopCanvas.setSize(parseInt(sizeSelect.value, 10));
    App.updateReport();

    updateDoubleVisibility();
    updateAndPlaceFienza(); 
  });

  
  
  
  doubleMode.addEventListener('change', () => {
    App.clearAll();
    updateDoubleVisibility();
    updateAndPlaceFienza();
  });




basinShape.addEventListener('change', e => {
  basinSizeInputs.innerHTML = '';
  basinPositionGroup.style.display = e.target.value ? 'block' : 'none';
  basinSizeInputs.style.display = e.target.value ? 'block' : 'none'; 

  if (e.target.value === 'circle') {
    basinSizeInputs.innerHTML = `
      <label for="basinDiameter">Diameter (mm):</label>
      <input type="number" id="basinDiameter" step="1" value="300">
    `;
  } else if (e.target.value === 'square') {
    basinSizeInputs.innerHTML = `
      <label for="basinSide">Side (mm):</label>
      <input type="number" id="basinSide" step="1" value="300">
    `;
  } else if (e.target.value === 'rect') {
    basinSizeInputs.innerHTML = `
      <label for="basinWidth">Width (mm):</label>
      <input type="number" id="basinWidth" step="1" value="300">
      <label for="basinHeight">Length (mm):</label>
      <input type="number" id="basinHeight" step="1" value="200">
    `;
  }

  
  ['basinDiameter', 'basinSide', 'basinWidth', 'basinHeight'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        App.applyBasin();          
        updateCornerRadiusMax();   
      });
    }
  });

  if (e.target.value) {
    App.applyBasin();
    updateCornerRadiusMax();
  }
});



  
  
  
  function safeParse(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    const val = parseInt(el.value, 10);
    return Number.isFinite(val) ? val : null;
  }

  ['tapX', 'tapY', 'wasteX', 'wasteY'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
      const tx = safeParse('tapX');
      const ty = safeParse('tapY');
      const wx = safeParse('wasteX');
      const wy = safeParse('wasteY');

      if (tx !== null && ty !== null) {
        BenchtopCanvas.setTaphole1({ offsetX: tx, offsetY: ty });
      } else {
        BenchtopCanvas.clearTaphole();
      }

      if (wx !== null && wy !== null) {
        BenchtopCanvas.setWastehole1({ offsetX: wx, offsetY: wy });
      } else {
        BenchtopCanvas.clearWastehole();
      }

      BenchtopCanvas.draw();
      App.updateReport();
      updatePlacementButtons();
    });
  });
  



function updatePlacementButtons() {
  
  if (BenchtopCanvas.hasTaphole1 && BenchtopCanvas.hasTaphole1()) {
    placeTapBtn.classList.add('btn-green');
    placeTapBtn.classList.remove('btn-red');
  } else {
    placeTapBtn.classList.add('btn-red');
    placeTapBtn.classList.remove('btn-green');
  }

  
  if (BenchtopCanvas.hasWastehole1 && BenchtopCanvas.hasWastehole1()) {
    placeWasteBtn.classList.add('btn-green');
    placeWasteBtn.classList.remove('btn-red');
  } else {
    placeWasteBtn.classList.add('btn-red');
    placeWasteBtn.classList.remove('btn-green');
  }

  
  if (BenchtopCanvas.hasTaphole2 && BenchtopCanvas.hasTaphole2()) {
    placeTap2Btn.classList.add('btn-green');
    placeTap2Btn.classList.remove('btn-red');
    document.getElementById('tap2Fields').style.display = 'block';
  } else {
    placeTap2Btn.classList.add('btn-red');
    placeTap2Btn.classList.remove('btn-green');
    document.getElementById('tap2Fields').style.display = 'none';
  }

  
  if (BenchtopCanvas.hasWastehole2 && BenchtopCanvas.hasWastehole2()) {
    placeWaste2Btn.classList.add('btn-green');
    placeWaste2Btn.classList.remove('btn-red');
    document.getElementById('waste2Fields').style.display = 'block';
  } else {
    placeWaste2Btn.classList.add('btn-red');
    placeWaste2Btn.classList.remove('btn-green');
    document.getElementById('waste2Fields').style.display = 'none';
  }

  
  const panel = document.getElementById('manualHolePanel');
  panel.style.display = (
    (BenchtopCanvas.hasTaphole1 && BenchtopCanvas.hasTaphole1()) ||
    (BenchtopCanvas.hasWastehole1 && BenchtopCanvas.hasWastehole1()) ||
    (BenchtopCanvas.hasTaphole2 && BenchtopCanvas.hasTaphole2()) ||
    (BenchtopCanvas.hasWastehole2 && BenchtopCanvas.hasWastehole2())
  ) ? 'block' : 'none';
}

  
  
  
  window.App = window.App || {};
  window.App.clearTaphole = function () {
    BenchtopCanvas.clearTaphole();
    App.updateReport();
    updatePlacementButtons();
  };
  window.App.clearWastehole = function () {
    BenchtopCanvas.clearWastehole();
    App.updateReport();
    updatePlacementButtons();
  };
  window.App.clearBasin = function () {
    BenchtopCanvas.clearBasin();
    App.updateReport();
    updatePlacementButtons();
  };
  
  window.App.applyBasin = function () {
    const shape = document.getElementById('basinShape').value;
    if (!shape) {
      BenchtopCanvas.clearBasin();
      return;
    }
    const bx = parseInt(document.getElementById('basinX')?.value, 10);
    const by = parseInt(document.getElementById('basinY')?.value, 10);

    if (shape === 'circle') {
      const diameter = Number(document.getElementById('basinDiameter')?.value) || 300;
      BenchtopCanvas.setBasin({
        shape: 'circle', diameter,
        offsetX: Number.isFinite(bx) ? bx : 0,
        offsetY: Number.isFinite(by) ? by : 232.5
      });
    } else if (shape === 'square') {
      const size = Number(document.getElementById('basinSide')?.value) || 300;
      BenchtopCanvas.setBasin({
        shape: 'square', size,
        offsetX: Number.isFinite(bx) ? bx : 0,
        offsetY: Number.isFinite(by) ? by : 232.5
      });
    } else if (shape === 'rect') {
      const width = Number(document.getElementById('basinWidth')?.value) || 300;
      const height = Number(document.getElementById('basinHeight')?.value) || 200;
      BenchtopCanvas.setBasin({
        shape: 'rect', width, height,
        offsetX: Number.isFinite(bx) ? bx : 0,
        offsetY: Number.isFinite(by) ? by : 232.5
      });
    }
    
const basinXInput = document.getElementById('basinX');
const basinYInput = document.getElementById('basinY');
if (basinXInput) basinXInput.value = Number.isFinite(bx) ? bx : 0;
if (basinYInput) basinYInput.value = Number.isFinite(by) ? by : 232.5;

BenchtopCanvas.draw();
App.updateReport();
updateCornerRadiusMax();
  };

  
  
  
  BenchtopCanvas.setSize(parseInt(sizeSelect.value, 10));
  App.updateReport();
  updatePlacementButtons();
});
