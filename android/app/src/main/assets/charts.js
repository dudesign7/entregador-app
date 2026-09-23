/* =====================================================
   CHARTS.JS – Configuraçõeses Chart.js
   ===================================================== */

Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(51, 65, 85, 0.6)';
Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
Chart.defaults.plugins.legend.display = false;
Chart.defaults.plugins.tooltip.enabled = true;
Chart.defaults.plugins.tooltip.backgroundColor = '#1e293b';
Chart.defaults.plugins.tooltip.borderColor = '#334155';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.titleFont = { weight: '700', size: 13 };
Chart.defaults.plugins.tooltip.bodyFont  = { size: 12 };
Chart.defaults.animation.duration = 500;

const CHARTS = {};

// ── HOME: Line chart (earnings 7 days) ─────────────────
function buildHomeChart(canvasId, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  if (CHARTS[canvasId]) { CHARTS[canvasId].destroy(); }

  CHARTS[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.label),
      datasets: [
        {
          label: 'Receita (R$)',
          data: data.map(d => d.earnings),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,0.12)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#22c55e',
          borderWidth: 2,
          yAxisID: 'y'
        },
        {
          label: 'Km',
          data: data.map(d => d.km),
          borderColor: '#3b82f6',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: '#3b82f6',
          borderWidth: 2,
          borderDash: [4, 3],
          yAxisID: 'y2'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 } }
        },
        y: {
          position: 'left',
          grid: { color: 'rgba(51,65,85,0.4)' },
          ticks: {
            font: { size: 10 },
            callback: v => 'R$' + v.toFixed(0)
          }
        },
        y2: {
          position: 'right',
          grid: { display: false },
          ticks: {
            font: { size: 10 },
            callback: v => v + 'km'
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => {
              if (ctx.datasetIndex === 0) return ` Receita: R$${ctx.parsed.y.toFixed(2)}`;
              return ` Km: ${ctx.parsed.y.toFixed(1)} km`;
            }
          }
        }
      }
    }
  });
}

// ── WEEK: Grouped bar chart ─────────────────────────────
function buildWeekChart(canvasId, days) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  if (CHARTS[canvasId]) { CHARTS[canvasId].destroy(); }

  const labels = days.map(d => fmtWeekday(d.date));
  const earnings = days.map(d => d.earnings + (d.tips || 0));
  const kms = days.map(d => d.km);

  CHARTS[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Receita (R$)',
          data: earnings,
          backgroundColor: 'rgba(34,197,94,0.75)',
          borderColor: '#22c55e',
          borderWidth: 1,
          borderRadius: 5,
          yAxisID: 'y'
        },
        {
          label: 'Km',
          data: kms,
          backgroundColor: 'rgba(59,130,246,0.55)',
          borderColor: '#3b82f6',
          borderWidth: 1,
          borderRadius: 5,
          yAxisID: 'y2'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: {
          position: 'left',
          grid: { color: 'rgba(51,65,85,0.4)' },
          ticks: { font: { size: 10 }, callback: v => 'R$' + v }
        },
        y2: {
          position: 'right',
          grid: { display: false },
          ticks: { font: { size: 10 }, callback: v => v + 'km' }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              if (ctx.datasetIndex === 0) return ` Receita: R$${ctx.parsed.y.toFixed(2)}`;
              return ` Km: ${ctx.parsed.y.toFixed(1)} km`;
            }
          }
        }
      }
    }
  });
}

// ── APPS: Doughnut chart ────────────────────────────────
function buildAppsChart(canvasId, appStats) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  if (CHARTS[canvasId]) { CHARTS[canvasId].destroy(); }

  if (!appStats.length) return;

  CHARTS[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: appStats.map(a => a.label),
      datasets: [{
        data: appStats.map(a => a.earnings),
        backgroundColor: appStats.map(a => a.color + 'cc'),
        borderColor: appStats.map(a => a.color),
        borderWidth: 2,
        hoverBorderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          display: true,
          position: 'right',
          labels: { boxWidth: 10, boxHeight: 10, font: { size: 12 }, padding: 12 }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` R$${ctx.parsed.toFixed(2)} (${ctx.dataset.data.reduce((s,v)=>s+v,0) > 0 ? ((ctx.parsed / ctx.dataset.data.reduce((s,v)=>s+v,0))*100).toFixed(1) : 0}%)`
          }
        }
      }
    }
  });
}

// ── FUEL: Bar chart (km/L over time) ───────────────────
function buildFuelChart(canvasId, logs) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  if (CHARTS[canvasId]) { CHARTS[canvasId].destroy(); }

  const validLogs = logs.filter(l => l.km_since_refuel > 0 && l.liters > 0).slice(0, 10).reverse();
  if (!validLogs.length) return;

  const kmLValues = validLogs.map(l => parseFloat((l.km_since_refuel / l.liters).toFixed(2)));
  const avg = kmLValues.reduce((s,v)=>s+v,0) / kmLValues.length;

  CHARTS[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: validLogs.map(l => fmtDate(l.date)),
      datasets: [
        {
          label: 'km/L',
          data: kmLValues,
          backgroundColor: kmLValues.map(v => v >= avg ? 'rgba(34,197,94,0.7)' : 'rgba(245,158,11,0.7)'),
          borderColor: kmLValues.map(v => v >= avg ? '#22c55e' : '#f59e0b'),
          borderWidth: 1,
          borderRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: {
          grid: { color: 'rgba(51,65,85,0.4)' },
          ticks: { font: { size: 10 }, callback: v => v + ' km/L' },
          suggestedMin: avg * 0.8,
          suggestedMax: avg * 1.2
        }
      },
      plugins: {
        annotation: {
          annotations: {
            avg: {
              type: 'line',
              yMin: avg, yMax: avg,
              borderColor: 'rgba(148,163,184,0.5)',
              borderWidth: 1,
              borderDash: [4, 3]
            }
          }
        },
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.parsed.y} km/L` }
        }
      }
    }
  });
}
