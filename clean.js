const fs = require('fs');

console.log('--- Cleaning web/index.html ---');
let html = fs.readFileSync('web/index.html', 'utf8');

// Replace corrupted mojibake strings in index.html
html = html
  .replace(/Configuraes/g, 'Configurações')
  .replace(/eficiǦncia/g, 'eficiência')
  .replace(/MǸdia/g, 'Média')
  .replace(/Quilmetros/g, 'Quilômetros')
  .replace(/Combustvel/g, 'Combustível')
  .replace(/Manutenǜo/g, 'Manutenção')
  .replace(/Revisǜo/g, 'Revisão');

// Remove Status Toggle block from Home page
const toggleRegex = /<!-- Status Toggle & Actions -->[\s\S]*?<\/div>\s*<\/div>/;
if (toggleRegex.test(html)) {
  html = html.replace(toggleRegex, '');
}

// Remove duplicate Date block if present
const dateRegex = /<!-- Date -->[\s\S]*?<\/div>\s*<\/div>/;
if (dateRegex.test(html)) {
  html = html.replace(dateRegex, '');
}

// Ensure clean Home header with + Registrar button (which opens openDayModal(null))
const homePageHeaderRegex = /<main id="page-home" class="page active">/;
const cleanHomeHeader = `<main id="page-home" class="page active">

      <!-- Home Header -->
      <div class="flex items-center justify-between" style="margin-bottom:16px;">
        <div>
          <h4>Hoje</h4>
          <span id="home-date" class="text-sm text-muted"></span>
        </div>
        <button class="btn btn-primary" onclick="openDayModal(null)" style="padding:8px 16px; background:#ff6b00; color:#fff;">+ Registrar</button>
      </div>`;

html = html.replace(homePageHeaderRegex, cleanHomeHeader);

fs.writeFileSync('web/index.html', html, 'utf8');
console.log('web/index.html cleaned.');

console.log('--- Cleaning web/app.js ---');
let app = fs.readFileSync('web/app.js', 'utf8');

// Fix mangled characters in app.js
app = app
  .replace(/âœ ï¸/g, '✏️')
  .replace(/âž•/g, '➕')
  .replace(/ðŸ”´/g, '🔴')
  .replace(/âš«/g, '⚫')
  .replace(/ðŸŸ¡/g, '🟡')
  .replace(/ðŸ”µ/g, '🔵')
  .replace(/âœ\.\.\./g, '✅')
  .replace(/âœ/g, '✅')
  .replace(/â€“/g, '–')
  .replace(/â€”/g, '—')
  .replace(/â€/g, '–')
  .replace(/Ã§Ã£o/g, 'ção')
  .replace(/Ã§Ãµes/g, 'ções')
  .replace(/Ã§Ã£/g, 'ção')
  .replace(/Ã´/g, 'ô')
  .replace(/Ã¡/g, 'á')
  .replace(/Ã©/g, 'é')
  .replace(/Ã\xad/g, 'í')
  .replace(/Ã³/g, 'ó')
  .replace(/Ãº/g, 'ú')
  .replace(/Ã£/g, 'ã')
  .replace(/Ãµ/g, 'õ')
  .replace(/Ãª/g, 'ê')
  .replace(/MǸdia/g, 'Média')
  .replace(/eficiǦncia/g, 'eficiência')
  .replace(/Revisǜo/g, 'Revisão')
  .replace(/Configuraes/g, 'Configurações')
  .replace(/ManutenÃ§Ã£o/g, 'Manutenção')
  .replace(/ManutenÃ§Ã£o em dia/g, 'Manutenção em dia')
  .replace(/ManutenÃ§Ã£o em dia â€“ tudo ok!/g, 'Manutenção em dia – tudo ok!')
  .replace(/âœ\.\.\. ManutenÃ§Ã£o em dia â€“ tudo ok!/g, '✅ Manutenção em dia – tudo ok!');

// Ensure FAB calls openDayModal(null) on home and week pages
app = app.replace(
  /if \(STATE\.page === 'home'\) openTripModal\(\);/g,
  "if (STATE.page === 'home') openDayModal(null);"
);

fs.writeFileSync('web/app.js', app, 'utf8');
console.log('web/app.js cleaned.');

console.log('--- Cleaning web/db.js ---');
let db = fs.readFileSync('web/db.js', 'utf8');
db = db
  .replace(/çã/g, 'ção')
  .replace(/Revisǜo/g, 'Revisão')
  .replace(/ManutenÃ§Ã£o/g, 'Manutenção');

fs.writeFileSync('web/db.js', db, 'utf8');
console.log('web/db.js cleaned.');

console.log('--- Cleaning web/charts.js ---');
let charts = fs.readFileSync('web/charts.js', 'utf8');
charts = charts.replace(/çõ/g, 'ções');
fs.writeFileSync('web/charts.js', charts, 'utf8');
console.log('web/charts.js cleaned.');

console.log('--- All web files cleaned successfully! ---');
