const fs = require('fs');
const html = fs.readFileSync('web/index.html', 'utf8');
const lines = html.split('\n');
let inside = false;
lines.forEach((line, i) => {
  if (line.includes('id="page-home"')) inside = true;
  if (inside) console.log(i + 1, line);
  if (inside && line.includes('</main>')) inside = false;
});
