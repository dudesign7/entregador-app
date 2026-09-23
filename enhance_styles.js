const fs = require('fs');

let css = fs.readFileSync('web/styles.css', 'utf8');

const extraLayoutFixes = `
/* ══ SAFARI & MOBILE RESPONSIVE FIXES ══ */
.header {
  padding-top: max(12px, env(safe-area-inset-top, 12px));
}

.page {
  padding-bottom: calc(var(--nav-h) + 20px + env(safe-area-inset-bottom, 0px)) !important;
  max-width: 600px;
  margin: 0 auto;
}

.hero-grid {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 10px !important;
  margin-bottom: 12px !important;
}

.card {
  margin-bottom: 12px !important;
}

.section-title {
  margin: 16px 0 8px 0 !important;
}

.fab {
  bottom: calc(var(--nav-h) + 16px + env(safe-area-inset-bottom, 0px)) !important;
  right: 16px !important;
}
`;

css += extraLayoutFixes;
fs.writeFileSync('web/styles.css', css, 'utf8');
console.log('web/styles.css enhanced perfectly.');
