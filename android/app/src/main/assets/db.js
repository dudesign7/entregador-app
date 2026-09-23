/* =====================================================
   DB.JS - Camada de Dados Hardened para Produção
   ===================================================== */

const DB_KEY = 'entregador_v4';

// Helper de Sanitização XSS Global
function sanitizeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
    bike_model: 'CG 160'
  }
};

const DB = {
  _data: null,

  load() {
    try {
      const raw = localStorage.getItem(DB_KEY) || localStorage.getItem('entregador_v3');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.days)) {
          this._data = parsed;
        } else {
          this._data = JSON.parse(JSON.stringify(DEFAULT_DATA));
        }
      } else {
        this._data = JSON.parse(JSON.stringify(DEFAULT_DATA));
      }
    } catch (e) {
      console.error('Falha crítica ao ler localStorage:', e);
      this._data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
    this.save();
    return this;
  },

  save() {
    if (!this._data || !Array.isArray(this._data.days)) return this;

    try {
      this._data.days.forEach(day => {
        if (day && Array.isArray(day.trips)) {
          let totalKm = 0;
          let totalEarnings = 0;
          const apps = { ifood: 0, uber: 0, noventa_nove: 0, lalamove: 0 };

          day.trips.forEach(t => {
            const val = Number(t.value) || 0;
            const km = Number(t.km) || 0;
            totalKm += km;
            totalEarnings += val;

            const platform = (t.platform || 'ifood').toLowerCase();
            if (apps[platform] !== undefined) {
              apps[platform] += val;
            } else {
              apps['ifood'] += val;
            }
          });

          day.km = Number(totalKm.toFixed(2));
          day.earnings = Number(totalEarnings.toFixed(2));
          day.apps = apps;
        }
      });

      const serialized = JSON.stringify(this._data);
      localStorage.setItem(DB_KEY, serialized);

      if (typeof window.AndroidNative !== 'undefined' && typeof window.AndroidNative.updateNativeData === 'function') {
        window.AndroidNative.updateNativeData(serialized);
      }
    } catch (e) {
      console.error('Erro ao salvar DB:', e);
    }
    return this;
  },

  getTodayRecord() {
    const today = new Date().toISOString().slice(0, 10);
    let record = this._data.days.find(d => d.date === today);
    if (!record) {
      record = {
        id: 'day-' + Date.now(),
        date: today,
        weekday: fmtWeekday(today),
        km: 0,
        earnings: 0,
        apps: { ifood: 0, uber: 0, noventa_nove: 0, lalamove: 0 },
        tips: 0,
        notes: '',
        trips: []
      };
      this._data.days.push(record);
      this.save();
    }
    return record;
  },

  addTrip(tripData) {
    const today = this.getTodayRecord();
    const val = Math.max(0, Number(tripData.value) || 0);
    const km = Math.max(0, Number(tripData.km) || 0);

    const trip = {
      id: 'trip-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      platform: sanitizeHTML(tripData.platform || 'ifood'),
      value: val,
      km: km,
      time_minutes: Math.max(0, parseInt(tripData.time_minutes) || 0),
      notes: sanitizeHTML(tripData.notes || ''),
      auto_detected: Boolean(tripData.auto_detected)
    };

    today.trips.unshift(trip);
    this._data.maintenance.odometer_total += km;
    this.save();
    return trip;
  },

  updateTrip(tripId, tripData) {
    const today = this.getTodayRecord();
    const idx = today.trips.findIndex(t => t.id === tripId);
    if (idx !== -1) {
      const old = today.trips[idx];
      const newKm = Math.max(0, Number(tripData.km) || 0);
      const diffKm = newKm - old.km;

      this._data.maintenance.odometer_total += diffKm;
      today.trips[idx] = {
        ...old,
        platform: sanitizeHTML(tripData.platform || old.platform),
        value: Math.max(0, Number(tripData.value) || 0),
        km: newKm,
        time_minutes: Math.max(0, parseInt(tripData.time_minutes) || 0),
        notes: sanitizeHTML(tripData.notes || '')
      };
      this.save();
    }
  },

  deleteTrip(tripId) {
    const today = this.getTodayRecord();
    const trip = today.trips.find(t => t.id === tripId);
    if (trip) {
      this._data.maintenance.odometer_total = Math.max(0, this._data.maintenance.odometer_total - trip.km);
      today.trips = today.trips.filter(t => t.id !== tripId);
      this.save();
    }
  },

  getCostPerKm() {
    const kmL = Math.max(1, Number(this._data.settings.bike_km_l_estimate) || 27.5);
    const price = Math.max(0, Number(this._data.settings.fuel_price) || 8.00);
    return price / kmL;
  },

  getMaintenance() {
    return this._data.maintenance;
  },

  getSettings() {
    return this._data.settings;
  },

  getWeekStats() {
    const days = this._data.days.slice(-7);
    const totalKm = days.reduce((s, d) => s + (d.km || 0), 0);
    const totalEarnings = days.reduce((s, d) => s + (d.earnings || 0) + (d.tips || 0), 0);
    const costPerKm = this.getCostPerKm();
    const totalFuelCost = totalKm * costPerKm;
    const netProfit = totalEarnings - totalFuelCost;
    const rpmKm = totalKm > 0 ? totalEarnings / totalKm : 0;
    return { totalKm, totalEarnings, totalFuelCost, netProfit, rpmKm, days };
  },

  getMaintenanceAlerts() {
    const m = this._data.maintenance;
    const alerts = [];

    const kmSinceOil = m.odometer_total - m.last_oil_km;
    const oilPct = kmSinceOil / m.oil_interval_km;
    if (oilPct >= 1) alerts.push({ type: 'red', icon: '🔴', msg: `Troca de óleo VENCIDA — ${fmtKm(kmSinceOil)} sem troca` });
    else if (oilPct >= 0.8) alerts.push({ type: 'yellow', icon: '🟡', msg: `Troca de óleo em breve — ${fmtKm(m.oil_interval_km - kmSinceOil)} restantes` });

    return alerts;
  }
};

const APP_COLORS = {
  ifood: '#ef4444',
  uber: '#000000',
  noventa_nove: '#f59e0b',
  lalamove: '#3b82f6'
};

function fmtBRL(v) {
  return 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ',');
}

function fmtKm(v) {
  return (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' km';
}

function fmtRpKm(v) {
  return 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ',') + '/km';
}

function fmtWeekday(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}
