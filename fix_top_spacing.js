const fs = require('fs');

let css = fs.readFileSync('web/styles.css', 'utf8');

const topSpacingFixes = `
/* ══ TOP SPACING & COMPACT HEADER FIXES ══ */
.header {
  height: auto !important;
  padding: max(10px, env(safe-area-inset-top, 10px)) 16px 10px 16px !important;
  margin: 0 !important;
}

.page {
  padding-top: 12px !important;
  gap: 12px !important;
}

.section-title {
  margin-top: 0 !important;
  margin-bottom: 8px !important;
  padding-top: 0 !important;
}

.section-title h2 {
  margin-top: 0 !important;
}

h2, h3, h4 {
  margin-top: 0 !important;
}
`;

css += topSpacingFixes;
fs.writeFileSync('web/styles.css', css, 'utf8');
console.log('web/styles.css updated with compact top spacing.');
