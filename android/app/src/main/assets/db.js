/* =====================================================
   DB.JS – Camada de Dados Hardened, CRUD e Autenticação
   ===================================================== */

const DB_KEY = 'entregador_v4';
const USERS_KEY = 'entregador_users_v1';

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
  user: null, // { id, name, email, avatar, onboarding_completed: false }
  auth: {
    token: null,
    is_authenticated: false
  },
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
    fuel_price: 5.80,
    bike_km_l_estimate: 27.5,
    bike_model: 'CG 160'
  }
};

const DB = {
  _data: null,
  _users: [],

  load() {
    try {
      // Load Registered Users List
      const rawUsers = localStorage.getItem(USERS_KEY);
      if (rawUsers) {
        this._users = JSON.parse(rawUsers) || [];
      } else {
        this._users = [];
      }

      // Load DB Data
      const raw = localStorage.getItem(DB_KEY) || localStorage.getItem('entregador_v3');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.days)) {
          this._data = { ...DEFAULT_DATA, ...parsed };
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
      localStorage.setItem(USERS_KEY, JSON.stringify(this._users));

      if (typeof window !== 'undefined' && typeof window.AndroidNative !== 'undefined' && typeof window.AndroidNative.updateNativeData === 'function') {
        window.AndroidNative.updateNativeData(serialized);
      }
    } catch (e) {
      console.error('Erro ao salvar DB:', e);
    }
    return this;
  },

  // ── Autenticação e Usuários ──────────────────────────────
  getUser() {
    return this._data ? this._data.user : null;
  },

  isAuthenticated() {
    return Boolean(this._data && this._data.auth && this._data.auth.is_authenticated);
  },

  signup({ name, email, password }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = sanitizeHTML(name || '').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'E-mail inválido.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'A senha deve ter pelo menos 6 caracteres.' };
    }

    const exists = this._users.find(u => u.email === cleanEmail);
    if (exists) {
      return { success: false, error: 'Este e-mail já está cadastrado. Tente fazer login.' };
    }

    const newUser = {
      id: 'usr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: cleanName || 'Entregador',
      email: cleanEmail,
      password_hash: btoa(password),
      created_at: new Date().toISOString(),
      onboarding_completed: false
    };

    this._users.push(newUser);
    this._data.user = newUser;
    this._data.auth = {
      token: 'jwt-token-' + Date.now(),
      is_authenticated: true
    };

    this.save();
    return { success: true, user: newUser };
  },

  login({ email, password }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const genericErr = 'E-mail ou senha incorretos. Verifique suas credenciais.';

    if (!cleanEmail || !password) {
      return { success: false, error: genericErr };
    }

    const found = this._users.find(u => u.email === cleanEmail && u.password_hash === btoa(password));
    if (!found) {
      return { success: false, error: genericErr };
    }

    this._data.user = found;
    this._data.auth = {
      token: 'jwt-token-' + Date.now(),
      is_authenticated: true
    };

    this.save();
    return { success: true, user: found };
  },

  deleteUserAccount(userId) {
    const uid = userId || (this._data && this._data.user ? this._data.user.id : null);
    if (uid) {
      this._users = (this._users || []).filter(u => u.id !== uid);
      if (this._data) {
        this._data.days = (this._data.days || []).filter(d => d.user_id ? d.user_id !== uid : true);
        this._data.trips = (this._data.trips || []).filter(t => t.user_id ? t.user_id !== uid : true);
        this._data.fuel_logs = (this._data.fuel_logs || []).filter(f => f.user_id ? f.user_id !== uid : true);
      }
    }
    this.logout();
    this.reset();
    return { success: true };
  },

  resetPassword(email) {
    return { success: true, message: 'Se o e-mail estiver cadastrado, você receberá o link de redefinição.' };
  },

  completeOnboarding({ bike_model, fuel_price, bike_km_l_estimate }) {
    if (this._data.user) {
      this._data.user.onboarding_completed = true;
    }
    this._data.settings.bike_model = sanitizeHTML(bike_model || 'CG 160');
    this._data.settings.fuel_price = Math.max(0, Number(fuel_price) || 5.80);
    this._data.settings.bike_km_l_estimate = Math.max(1, Number(bike_km_l_estimate) || 27.5);
    
    const idx = this._users.findIndex(u => u.id === this._data.user?.id);
    if (idx !== -1) {
      this._users[idx].onboarding_completed = true;
    }

    this.save();
    return this;
  },

  logout() {
    if (this._data && this._data.auth) {
      this._data.auth.is_authenticated = false;
      this._data.auth.token = null;
      this._data.user = null;
    }
    this.save();
    return this;
  },

  // ── Dias e Corridas (CRUD) ──────────────────────────────
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

  addDay(dayPayload) {
    if (!dayPayload || !dayPayload.date) return null;
    
    let existing = this._data.days.find(d => d.date === dayPayload.date);
    if (existing) {
      return this.updateDay(existing.id, dayPayload);
    }

    const newDay = {
      id: 'day-' + Date.now(),
      date: dayPayload.date,
      weekday: fmtWeekday(dayPayload.date),
      km: Math.max(0, Number(dayPayload.km) || 0),
      earnings: Math.max(0, Number(dayPayload.earnings) || 0),
      apps: dayPayload.apps || { ifood: 0, uber: 0, noventa_nove: 0, lalamove: 0 },
      tips: Math.max(0, Number(dayPayload.tips) || 0),
      notes: sanitizeHTML(dayPayload.notes || ''),
      trips: Array.isArray(dayPayload.trips) ? dayPayload.trips : []
    };

    this._data.days.push(newDay);
    this.save();
    return newDay;
  },

  updateDay(id, dayPayload) {
    const idx = this._data.days.findIndex(d => d.id === id || d.date === dayPayload.date);
    if (idx !== -1) {
      const existing = this._data.days[idx];
      this._data.days[idx] = {
        ...existing,
        date: dayPayload.date || existing.date,
        weekday: fmtWeekday(dayPayload.date || existing.date),
        km: dayPayload.km !== undefined ? Math.max(0, Number(dayPayload.km) || 0) : existing.km,
        earnings: dayPayload.earnings !== undefined ? Math.max(0, Number(dayPayload.earnings) || 0) : existing.earnings,
        apps: dayPayload.apps ? { ...existing.apps, ...dayPayload.apps } : existing.apps,
        tips: dayPayload.tips !== undefined ? Math.max(0, Number(dayPayload.tips) || 0) : existing.tips,
        notes: dayPayload.notes !== undefined ? sanitizeHTML(dayPayload.notes) : existing.notes
      };
      this.save();
      return this._data.days[idx];
    }
    return null;
  },

  deleteDay(id) {
    if (!id) return false;
    this._data.days = this._data.days.filter(d => d.id !== id);
    this.save();
    return true;
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

  // ── Abastecimento e Combustível (CRUD) ─────────────────
  getFuelLogs() {
    return Array.isArray(this._data.fuel_logs) ? this._data.fuel_logs : [];
  },

  addFuelLog(logData) {
    if (!this._data.fuel_logs) this._data.fuel_logs = [];

    const newLog = {
      id: 'fuel-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      date: logData.date || new Date().toISOString().slice(0, 10),
      liters: Math.max(0, Number(logData.liters) || 0),
      price_per_liter: Math.max(0, Number(logData.price_per_liter) || 0),
      total_paid: Math.max(0, Number(logData.total_paid) || 0),
      km_since_refuel: Math.max(0, Number(logData.km_since_refuel) || 0),
      odometer_at_refuel: Math.max(0, Number(logData.odometer_at_refuel) || 0),
      timestamp: new Date().toISOString()
    };

    this._data.fuel_logs.unshift(newLog);
    this.save();
    return newLog;
  },

  deleteFuelLog(id) {
    if (!id || !Array.isArray(this._data.fuel_logs)) return false;
    this._data.fuel_logs = this._data.fuel_logs.filter(f => f.id !== id);
    this.save();
    return true;
  },

  // ── Manutenção e Configurações (CRUD) ────────────────
  getMaintenance() {
    return this._data.maintenance || DEFAULT_DATA.maintenance;
  },

  updateMaintenance(data) {
    if (!data) return this._data.maintenance;
    this._data.maintenance = {
      ...this._data.maintenance,
      odometer_total:       data.odometer_total !== undefined ? Math.max(0, Number(data.odometer_total) || 0) : this._data.maintenance.odometer_total,
      last_oil_km:          data.last_oil_km !== undefined ? Math.max(0, Number(data.last_oil_km) || 0) : this._data.maintenance.last_oil_km,
      oil_interval_km:      data.oil_interval_km !== undefined ? Math.max(1, Number(data.oil_interval_km) || 3000) : this._data.maintenance.oil_interval_km,
      last_revision_km:     data.last_revision_km !== undefined ? Math.max(0, Number(data.last_revision_km) || 0) : this._data.maintenance.last_revision_km,
      revision_interval_km: data.revision_interval_km !== undefined ? Math.max(1, Number(data.revision_interval_km) || 6000) : this._data.maintenance.revision_interval_km
    };
    this.save();
    return this._data.maintenance;
  },

  getSettings() {
    return this._data.settings || DEFAULT_DATA.settings;
  },

  updateSettings(data) {
    if (!data) return this._data.settings;
    this._data.settings = {
      ...this._data.settings,
      fuel_price:         data.fuel_price !== undefined ? Math.max(0, Number(data.fuel_price) || 0) : this._data.settings.fuel_price,
      bike_km_l_estimate: data.bike_km_l_estimate !== undefined ? Math.max(1, Number(data.bike_km_l_estimate) || 27.5) : this._data.settings.bike_km_l_estimate,
      bike_model:         data.bike_model ? sanitizeHTML(data.bike_model) : this._data.settings.bike_model
    };
    this.save();
    return this._data.settings;
  },

  getCostPerKm() {
    const kmL = Math.max(1, Number(this._data.settings.bike_km_l_estimate) || 27.5);
    const price = Math.max(0, Number(this._data.settings.fuel_price) || 5.80);
    return price / kmL;
  },

  getLast7Days() {
    return Array.isArray(this._data.days) ? this._data.days.slice(-7) : [];
  },

  getWeekStats() {
    const days = this.getLast7Days();
    const totalKm = days.reduce((s, d) => s + (d.km || 0), 0);
    const totalEarnings = days.reduce((s, d) => s + (d.earnings || 0) + (d.tips || 0), 0);
    const costPerKm = this.getCostPerKm();
    const totalFuelCost = totalKm * costPerKm;
    const netProfit = totalEarnings - totalFuelCost;
    const rpmKm = totalKm > 0 ? totalEarnings / totalKm : 0;
    return { totalKm, totalEarnings, totalFuelCost, netProfit, rpmKm, days };
  },

  getMaintenanceAlerts() {
    const m = this.getMaintenance();
    const alerts = [];

    const kmSinceOil = m.odometer_total - m.last_oil_km;
    const oilPct = kmSinceOil / m.oil_interval_km;
    if (oilPct >= 1) alerts.push({ type: 'red', icon: '🔴', msg: `Troca de óleo VENCIDA — ${fmtKm(kmSinceOil)} sem troca` });
    else if (oilPct >= 0.8) alerts.push({ type: 'yellow', icon: '🟡', msg: `Troca de óleo em breve — ${fmtKm(m.oil_interval_km - kmSinceOil)} restantes` });

    return alerts;
  },

  getDays() {
    return Array.isArray(this._data.days) ? this._data.days : [];
  },

  getDayById(id) {
    if (!id || !Array.isArray(this._data.days)) return null;
    return this._data.days.find(d => d.id === id || d.date === id) || null;
  },

  getWeekDays() {
    return this.getLast7Days();
  },

  getAvgKmL() {
    return Math.max(1, Number(this._data.settings.bike_km_l_estimate) || 27.5);
  },

  getAppStats(daysList) {
    const list = Array.isArray(daysList) ? daysList : this.getDays();
    const stats = {
      ifood: { label: 'iFood', earnings: 0, km: 0, color: APP_COLORS.ifood },
      uber: { label: 'Uber', earnings: 0, km: 0, color: APP_COLORS.uber },
      noventa_nove: { label: '99 Food', earnings: 0, km: 0, color: APP_COLORS.noventa_nove },
      lalamove: { label: 'Lalamove', earnings: 0, km: 0, color: APP_COLORS.lalamove }
    };

    let grandTotal = 0;
    list.forEach(d => {
      if (d && d.apps) {
        Object.keys(stats).forEach(key => {
          const val = Number(d.apps[key]) || 0;
          stats[key].earnings += val;
          grandTotal += val;
        });
      }
    });

    return Object.keys(stats).map(key => {
      const s = stats[key];
      const pct = grandTotal > 0 ? (s.earnings / grandTotal) * 100 : 0;
      return {
        key,
        label: s.label,
        earnings: s.earnings,
        color: s.color,
        pct: pct,
        rpmKm: s.earnings > 0 ? s.earnings / (s.km || 1) : 0
      };
    });
  },

  resetData() {
    this.reset();
  },

  reset() {
    const currentUser = this._data ? this._data.user : null;
    const currentAuth = this._data ? this._data.auth : null;

    this._data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this._data.user = currentUser;
    this._data.auth = currentAuth;

    localStorage.removeItem(DB_KEY);
    this.save();
    return this;
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DB;
}
