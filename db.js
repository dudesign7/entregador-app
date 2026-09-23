/* =====================================================
   DB.JS – Camada de dados (localStorage)
   ===================================================== */

const DB_KEY = 'entregador_v3';

const DEFAULT_DATA = {
  days: [],
  fuel_logs: [],
  maintenance: {
    odometer_total: 0,
    last_oil_km: 0,
    oil_interval_km: 3000,
    last_revision_km: 0,
    revision_interval_km: 6000
  },
  settings: {
    fuel_price: 8.00,
    bike_km_l_estimate: 27.5,
    bike_model: 'CG 105cc'
  }
};

// Seed data starting Saturday 19/09
const SEED_DATA = {
  days: [
    {
      id: 'seed-19',
      date: '2026-09-19',
      weekday: 'Sáb',
      km: 102.6,
      earnings: 178.65,
      apps: { ifood: 102.09, uber: 0, noventa_nove: 34.90, lalamove: 41.66 },
      tips: 5.00,
      notes: 'Abastecido R$20,00 (2,5L) | 37,9km pós-abastecimento'
    },
    {
      id: 'seed-20',
      date: '2026-09-20',
      weekday: 'Dom',
      km: 0,
      earnings: 0,
      apps: { ifood: 0, uber: 0, noventa_nove: 0, lalamove: 0 },
      tips: 0,
      notes: ''
    }
  ],
  fuel_logs: [
    {
      id: 'fuel-1',
      date: '2026-09-19',
      liters: 2.5,
      price_per_liter: 8.00,
      total_paid: 20.00,
      km_since_refuel: 37.9,
      odometer_at_refuel: 12500
    }
  ],
  maintenance: {
    odometer_total: 12500,
    last_oil_km: 11200,
    oil_interval_km: 3000,
    last_revision_km: 9800,
    revision_interval_km: 6000
  },
  settings: {
    fuel_price: 8.00,
    bike_km_l_estimate: 27.5,
    bike_model: 'CG 105cc'
  }
};

const DB = {
  _data: null,

  load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        this._data = JSON.parse(raw);
      } else {
        // First run: seed with sample data
        this._data = JSON.parse(JSON.stringify(SEED_DATA));
        this.save();
      }
    } catch {
      this._data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
    return this;
  },

  save() {
    localStorage.setItem(DB_KEY, JSON.stringify(this._data));
    return this;
  },

  reset() {
    this._data = JSON.parse(JSON.stringify(SEED_DATA));
    this.save();
  },

  // ── SETTINGS ──────────────────────────────────────────
  getSettings() { return this._data.settings; },
  updateSettings(patch) {
    Object.assign(this._data.settings, patch);
    this.save();
  },

  // ── DAYS ──────────────────────────────────────────────
  getDays() {
    return [...this._data.days].sort((a, b) => b.date.localeCompare(a.date));
  },

  getDayById(id) {
    return this._data.days.find(d => d.id === id);
  },

  getDaysInRange(start, end) {
    return this._data.days.filter(d => d.date >= start && d.date <= end);
  },

  getWeekDays() {
    const today = new Date();
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fmt = d => d.toISOString().slice(0, 10);
    return this.getDaysInRange(fmt(monday), fmt(sunday));
  },

  getLast7Days() {
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const record = this._data.days.find(x => x.date === dateStr);
      days.push({
        date: dateStr,
        label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        km: record?.km || 0,
        earnings: record?.earnings || 0,
        tips: record?.tips || 0
      });
    }
    return days;
  },

  getTodayRecord() {
    const today = new Date().toISOString().slice(0, 10);
    return this._data.days.find(d => d.date === today) || null;
  },

  addDay(day) {
    const id = 'day-' + Date.now();
    const newDay = { id, ...day };
    // Update tips in earnings total for the correct calculation
    this._data.days.push(newDay);
    // Update odometer
    this._data.maintenance.odometer_total += (day.km || 0);
    this.save();
    return newDay;
  },

  updateDay(id, patch) {
    const idx = this._data.days.findIndex(d => d.id === id);
    if (idx !== -1) {
      const old = this._data.days[idx];
      // Adjust odometer
      const diff = (patch.km || old.km) - old.km;
      this._data.maintenance.odometer_total += diff;
      this._data.days[idx] = { ...old, ...patch };
      this.save();
    }
  },

  deleteDay(id) {
    const day = this.getDayById(id);
    if (day) {
      this._data.maintenance.odometer_total -= (day.km || 0);
      this._data.days = this._data.days.filter(d => d.id !== id);
      this.save();
    }
  },

  // ── FUEL LOGS ─────────────────────────────────────────
  getFuelLogs() {
    return [...this._data.fuel_logs].sort((a, b) => b.date.localeCompare(a.date));
  },

  addFuelLog(log) {
    const id = 'fuel-' + Date.now();
    const entry = { id, ...log };
    this._data.fuel_logs.push(entry);
    this.save();
    return entry;
  },

  deleteFuelLog(id) {
    this._data.fuel_logs = this._data.fuel_logs.filter(f => f.id !== id);
    this.save();
  },

  getAvgKmL() {
    const logs = this._data.fuel_logs.filter(f => f.km_since_refuel > 0 && f.liters > 0);
    if (logs.length === 0) return this._data.settings.bike_km_l_estimate;
    const total = logs.reduce((s, f) => s + (f.km_since_refuel / f.liters), 0);
    return total / logs.length;
  },

  getCostPerKm() {
    const kmL = this.getAvgKmL();
    return this._data.settings.fuel_price / kmL;
  },

  // ── MAINTENANCE ───────────────────────────────────────
  getMaintenance() { return this._data.maintenance; },

  updateMaintenance(patch) {
    Object.assign(this._data.maintenance, patch);
    this.save();
  },

  getMaintenanceAlerts() {
    const m = this._data.maintenance;
    const alerts = [];

    const kmSinceOil = m.odometer_total - m.last_oil_km;
    const oilPct = kmSinceOil / m.oil_interval_km;
    if (oilPct >= 1)      alerts.push({ type: 'red',    icon: '🛢️', msg: `Troca de óleo VENCIDA — ${fmtKm(kmSinceOil)} km sem troca` });
    else if (oilPct >= 0.8) alerts.push({ type: 'yellow', icon: '🛢️', msg: `Troca de óleo em breve — ${fmtKm(m.oil_interval_km - kmSinceOil)} km restantes` });

    const kmSinceRev = m.odometer_total - m.last_revision_km;
    const revPct = kmSinceRev / m.revision_interval_km;
    if (revPct >= 1)       alerts.push({ type: 'red',    icon: '🔧', msg: `Revisão VENCIDA — ${fmtKm(kmSinceRev)} km sem revisão` });
    else if (revPct >= 0.8) alerts.push({ type: 'yellow', icon: '🔧', msg: `Revisão em breve — ${fmtKm(m.revision_interval_km - kmSinceRev)} km restantes` });

    return alerts;
  },

  // ── ANALYTICS ─────────────────────────────────────────
  getWeekStats() {
    const days = this.getWeekDays();
    const totalKm = days.reduce((s, d) => s + d.km, 0);
    const totalEarnings = days.reduce((s, d) => s + d.earnings + d.tips, 0);
    const costPerKm = this.getCostPerKm();
    const totalFuelCost = totalKm * costPerKm;
    const netProfit = totalEarnings - totalFuelCost;
    const rpmKm = totalKm > 0 ? totalEarnings / totalKm : 0;
    const activeDays = days.filter(d => d.km > 0 || d.earnings > 0).length;
    return { totalKm, totalEarnings, totalFuelCost, netProfit, rpmKm, activeDays, days };
  },

  getAppStats(days) {
    const src = days || this.getWeekDays();
    const apps = { ifood: 0, uber: 0, noventa_nove: 0, lalamove: 0 };
    const appsKm = { ifood: 0, uber: 0, noventa_nove: 0, lalamove: 0 };

    src.forEach(d => {
      const total = (d.apps?.ifood||0)+(d.apps?.uber||0)+(d.apps?.noventa_nove||0)+(d.apps?.lalamove||0);
      const fraction = total > 0 ? (d.km || 0) / total : 0;
      Object.keys(apps).forEach(k => {
        const v = d.apps?.[k] || 0;
        apps[k] += v;
        appsKm[k] += v * fraction;
      });
    });

    const total = Object.values(apps).reduce((s, v) => s + v, 0);
    return Object.keys(apps).map(k => ({
      key: k,
      label: APP_LABELS[k],
      color: APP_COLORS[k],
      earnings: apps[k],
      km: appsKm[k],
      rpmKm: appsKm[k] > 0 ? apps[k] / appsKm[k] : 0,
      pct: total > 0 ? (apps[k] / total) * 100 : 0
    })).filter(a => a.earnings > 0).sort((a, b) => b.earnings - a.earnings);
  }
};

// ── Constants ──────────────────────────────────────────
const APP_LABELS = {
  ifood: 'iFood',
  uber: 'Uber',
  noventa_nove: '99 Food',
  lalamove: 'Lalamove'
};

const APP_COLORS = {
  ifood: '#ef4444',
  uber: '#000000',
  noventa_nove: '#f59e0b',
  lalamove: '#3b82f6'
};

const APP_COLORS_DARK = {
  ifood: '#ef4444',
  uber: '#94a3b8',
  noventa_nove: '#f59e0b',
  lalamove: '#3b82f6'
};

// ── Formatters ─────────────────────────────────────────
function fmtBRL(v) {
  return 'R$\u00a0' + (v || 0).toFixed(2).replace('.', ',');
}

function fmtKm(v) {
  return (v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' km';
}

function fmtRpKm(v) {
  return 'R$\u00a0' + (v || 0).toFixed(2).replace('.', ',') + '/km';
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function fmtWeekday(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

function genId() { return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7); }
