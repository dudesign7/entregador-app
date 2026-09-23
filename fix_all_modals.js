const fs = require('fs');

console.log('--- Fixing web/app.js dynamic modals ---');
let app = fs.readFileSync('web/app.js', 'utf8');

// Fix openDayModal to add 'active' class to modal-overlay
app = app.replace(
  '<div class="modal-overlay" id="modal-day"',
  '<div class="modal-overlay active" id="modal-day"'
);

// Fix openFuelModal to add 'active' class to modal-overlay
app = app.replace(
  '<div class="modal-overlay" id="modal-fuel"',
  '<div class="modal-overlay active" id="modal-fuel"'
);

// Fix openManutModal to add 'active' class to modal-overlay
app = app.replace(
  '<div class="modal-overlay" id="modal-manut"',
  '<div class="modal-overlay active" id="modal-manut"'
);

// Fix openSettingsModal to add 'active' class to modal-overlay
app = app.replace(
  '<div class="modal-overlay" id="modal-settings"',
  '<div class="modal-overlay active" id="modal-settings"'
);

// Update FAB click listener to open openTripModal(null) on Home page
app = app.replace(
  /if \(STATE\.page === 'home'\) openDayModal\(null\);/g,
  "if (STATE.page === 'home') openTripModal(null);"
);

fs.writeFileSync('web/app.js', app, 'utf8');
console.log('web/app.js updated: all dynamic modals now include "active" class.');

console.log('--- Updating web/index.html Header with both + Nova Corrida and + Registrar Dia ---');
let html = fs.readFileSync('web/index.html', 'utf8');

const homeHeaderRegex = /<!-- Home Header -->[\s\S]*?<\/div>/;
const newHeaderHtml = `<!-- Home Header -->
      <div class="flex items-center justify-between" style="margin-bottom:12px; gap:8px; flex-wrap:wrap;">
        <div>
          <h4 style="margin:0;">HOJE</h4>
          <span id="home-date" class="text-sm text-muted"></span>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary btn-sm" onclick="openDayModal(null)">+ Registrar Dia</button>
          <button class="btn btn-primary btn-sm" onclick="openTripModal(null)" style="background:#ff6b00; color:#fff; font-weight:700;">+ Nova Corrida</button>
        </div>
      </div>`;

html = html.replace(homeHeaderRegex, newHeaderHtml);

fs.writeFileSync('web/index.html', html, 'utf8');
console.log('web/index.html updated with both action buttons.');
