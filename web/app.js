/* =====================================================
   APP.JS – Lógica principal, state, routing, UI
   ===================================================== */

// â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STATE = {
  page: 'home',
  editingDayId: null,
  editingFuelId: null,
  weekFilter: 'current' // 'current' | 'last'
};

// â”€â”€ Init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.addEventListener('DOMContentLoaded', () => {
  DB.load();
  setupNavigation();
  navigate('home');
  initStatus();
  setupFAB();
});

// â”€â”€ Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      navigate(btn.dataset.page);
    });
  });
}

function navigate(page) {
  STATE.page = page;
  // Update nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });
  // Show page
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === 'page-' + page);
  });
  // Render
  renderPage(page);
  // FAB visibility
  const fab = document.getElementById('fab');
  if (fab) {
    fab.style.display = ['home', 'fuel'].includes(page) ? 'flex' : 'none';
  }
}

function renderPage(page) {
  switch (page) {
    case 'home':    renderHome();    break;
    case 'week':    renderWeek();    break;
    case 'fuel':    renderFuel();    break;
    case 'apps':    renderApps();    break;
    case 'manut':   renderManut();   break;
  }
}

// â”€â”€ FAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function setupFAB() {
  const fab = document.getElementById('fab');
  if (!fab) return;
  fab.addEventListener('click', () => {
    if (STATE.page === 'home') openDayModal(null);
    else if (STATE.page === 'fuel') openFuelModal(null);
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PAGE: HOME
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderHome() {
  const today = DB.getTodayRecord();
  const last7 = DB.getLast7Days();
  const stats = DB.getWeekStats();
  const s = DB.getSettings();
  const costPerKm = DB.getCostPerKm();
  const mainAlerts = DB.getMaintenanceAlerts();

  // Today values
  const todayKm       = today?.km || 0;
  const todayEarnings = today ? (today.earnings + (today.tips||0)) : 0;
  const todayFuel     = todayKm * costPerKm;
  const todayProfit   = todayEarnings - todayFuel;
  const todayRpm      = todayKm > 0 ? todayEarnings / todayKm : 0;

  document.getElementById('home-date').textContent =
    new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Hero cards
  setEl('h-receita',  fmtBRL(todayEarnings));
  setEl('h-km',       fmtKm(todayKm));
  setEl('h-rpm',      todayRpm > 0 ? fmtRpKm(todayRpm) : '—');
  setEl('h-lucro',    fmtBRL(todayProfit));

  // Color
  elColor('h-lucro', todayProfit >= 0 ? 'text-green' : 'text-red');
  elColor('h-rpm',   todayRpm >= 1 ? 'text-green' : todayRpm > 0 ? 'text-yellow' : '');

  // Sub info
  renderTodayTrips();
  setEl('h-rpm-sub',   'custo: ' + fmtBRL(todayFuel));
  setEl('h-lucro-sub', today ? 'hoje registrado' : 'sem dados hoje');

  // Mini stats week
  setEl('week-total-earn', fmtBRL(stats.totalEarnings));
  setEl('week-total-km',   fmtKm(stats.totalKm));
  setEl('week-rpm-avg',    stats.totalKm > 0 ? fmtRpKm(stats.rpmKm) : '—');
  setEl('week-days-active', stats.activeDays + ' dia' + (stats.activeDays !== 1 ? 's' : ''));

  // Chart
  buildHomeChart('chart-home', last7);

  // Alert: manutenção
  const alertWrap = document.getElementById('home-alerts');
  if (mainAlerts.length > 0) {
    alertWrap.innerHTML = mainAlerts.map(a =>
      `<div class="alert alert-${a.type}"><span>${a.icon}</span><span>${a.msg}</span></div>`
    ).join('');
    alertWrap.classList.remove('hidden');
  } else {
    alertWrap.classList.add('hidden');
  }

  // Recent days list
  renderDaysList('home-days-list', DB.getDays().slice(0, 5), true);
}

function renderDaysList(containerId, days, compact = false) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (!days.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-icon">ðŸ“‹</div>
      <p>Nenhum dia registrado ainda. Use o botão + para adicionar.</p>
    </div>`;
    return;
  }

  el.innerHTML = days.map(d => {
    const earn = d.earnings + (d.tips || 0);
    const rpm = d.km > 0 ? earn / d.km : 0;
    const color = rpm >= 1 ? 'text-green' : rpm > 0 ? 'text-yellow' : 'text-muted';
    return `<div class="day-item" onclick="openDayModal('${d.id}')">
      <div class="day-item-left">
        <span class="fw-bold">${fmtDate(d.date)} <span class="text-muted text-sm">${fmtWeekday(d.date)}</span></span>
        <span class="text-sm text-muted">${fmtKm(d.km)}</span>
        ${d.notes ? `<span class="text-xs text-muted">${d.notes}</span>` : ''}
      </div>
      <div class="day-item-right">
        <span class="fw-bold text-green">${fmtBRL(earn)}</span>
        <span class="text-xs ${color}">${rpm > 0 ? fmtRpKm(rpm) : '—'}</span>
      </div>
    </div>`;
  }).join('');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PAGE: WEEK
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderWeek() {
  const stats = DB.getWeekStats();
  const days  = stats.days;
  const appStats = DB.getAppStats(days);

  setEl('w-earn',   fmtBRL(stats.totalEarnings));
  setEl('w-km',     fmtKm(stats.totalKm));
  setEl('w-rpm',    stats.totalKm > 0 ? fmtRpKm(stats.rpmKm) : '—');
  setEl('w-profit', fmtBRL(stats.netProfit));
  setEl('w-fuel',   fmtBRL(stats.totalFuelCost));
  setEl('w-days',   stats.activeDays + ' dia' + (stats.activeDays !== 1 ? 's' : ''));

  elColor('w-profit', stats.netProfit >= 0 ? 'text-green' : 'text-red');
  elColor('w-rpm',    stats.rpmKm >= 1 ? 'text-green' : stats.rpmKm > 0 ? 'text-yellow' : '');

  // Ranking
  const sorted = [...days].filter(d => d.km > 0 || d.earnings > 0)
    .sort((a, b) => (b.earnings + (b.tips||0)) - (a.earnings + (a.tips||0)));

  const rankEl = document.getElementById('w-ranking');
  if (rankEl && sorted.length) {
    rankEl.innerHTML = sorted.map((d, i) => {
      const earn = d.earnings + (d.tips||0);
      const rpm  = d.km > 0 ? earn / d.km : 0;
      const medals = ['ðŸ¥‡','ðŸ¥ˆ','ðŸ¥‰'];
      return `<div class="stat-row">
        <span class="text-sm">${medals[i] || `#${i+1}`} ${fmtDate(d.date)} <span class="text-muted">${fmtWeekday(d.date)}</span></span>
        <div class="flex gap-8 items-center">
          <span class="text-sm text-muted">${fmtKm(d.km)}</span>
          <span class="fw-bold text-green text-sm">${fmtBRL(earn)}</span>
        </div>
      </div>`;
    }).join('');
  }

  // Efficiency alert
  const effEl = document.getElementById('w-eff-alert');
  if (effEl) {
    if (stats.rpmKm >= 1.3) {
      effEl.innerHTML = `<div class="alert alert-green">ðŸš€ Semana excelente! R$/km acima de R$1,30 — eficiência alta.</div>`;
    } else if (stats.rpmKm >= 1.0) {
      effEl.innerHTML = `<div class="alert alert-green">✅… Operação viável — R$/km acima de R$1,00.</div>`;
    } else if (stats.rpmKm > 0) {
      effEl.innerHTML = `<div class="alert alert-yellow">âš ï¸ R$/km abaixo de R$1,00 — revise aceitação de pedidos.</div>`;
    } else {
      effEl.innerHTML = '';
    }
  }

  buildWeekChart('chart-week', days);
  renderDaysList('w-days-list', days.filter(d => d.km > 0 || d.earnings > 0));
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PAGE: FUEL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderFuel() {
  const logs = DB.getFuelLogs();
  const avgKmL = DB.getAvgKmL();
  const costPerKm = DB.getCostPerKm();
  const s = DB.getSettings();
  const isEstimated = logs.filter(l => l.km_since_refuel > 0).length === 0;

  setEl('f-kml',      avgKmL.toFixed(1) + ' km/L');
  setEl('f-cpkm',     fmtBRL(costPerKm) + '/km');
  setEl('f-price',    fmtBRL(s.fuel_price) + '/L');
  setEl('f-est-tag',  isEstimated ? '(estimado)' : '');

  // Consume alert
  const alertEl = document.getElementById('f-alert');
  if (isEstimated) {
    alertEl.innerHTML = `<div class="alert alert-blue">â„¹ï¸ Consumo estimado em ${s.bike_km_l_estimate} km/L. Registre abastecimentos para calcular o consumo real.</div>`;
  } else {
    alertEl.innerHTML = '';
  }

  buildFuelChart('chart-fuel', logs);

  // Logs list
  const listEl = document.getElementById('f-logs-list');
  if (!listEl) return;
  if (!logs.length) {
    listEl.innerHTML = `<div class="empty-state">
      <div class="empty-icon">â›½</div>
      <p>Nenhum abastecimento registrado. Use o botão + para adicionar.</p>
    </div>`;
    return;
  }

  listEl.innerHTML = logs.map(l => {
    const kml = l.km_since_refuel > 0 && l.liters > 0 ? (l.km_since_refuel / l.liters) : null;
    return `<div class="fuel-item">
      <div>
        <div class="fw-bold text-sm">${fmtDate(l.date)}</div>
        <div class="text-xs text-muted">${l.liters}L Ã— ${fmtBRL(l.price_per_liter)}/L</div>
        ${l.km_since_refuel ? `<div class="text-xs text-muted">${fmtKm(l.km_since_refuel)} rodados</div>` : ''}
      </div>
      <div class="text-right">
        <div class="fw-bold text-yellow">${fmtBRL(l.total_paid)}</div>
        ${kml ? `<div class="text-xs ${kml >= DB.getAvgKmL() * 0.9 ? 'text-green' : 'text-yellow'}">${kml.toFixed(1)} km/L</div>` : ''}
        <button class="btn btn-danger btn-sm mt-4" onclick="deleteFuelLog('${l.id}')">✅•</button>
      </div>
    </div>`;
  }).join('');
}

function deleteFuelLog(id) {
  DB.deleteFuelLog(id);
  renderFuel();
  toast('Abastecimento removido');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PAGE: APPS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderApps() {
  const weekDays = DB.getWeekDays();
  const allDays  = DB.getDays();
  const weekStats = DB.getAppStats(weekDays);
  const allStats  = DB.getAppStats(allDays);

  // Best app
  const best = weekStats.length > 0 ? weekStats.reduce((b, a) => a.rpmKm > b.rpmKm ? a : b) : null;
  const bestEl = document.getElementById('apps-best');
  if (bestEl) {
    if (best && best.rpmKm > 0) {
      bestEl.innerHTML = `<div class="alert alert-green">â­ App mais eficiente da semana: <strong>${best.label}</strong> — ${fmtRpKm(best.rpmKm)}</div>`;
    } else {
      bestEl.innerHTML = '';
    }
  }

  // Table – semana
  renderAppTable('apps-week-table', weekStats);

  // Table – geral
  renderAppTable('apps-all-table', allStats);

  // Doughnut
  buildAppsChart('chart-apps', weekStats.length ? weekStats : allStats);
}

function renderAppTable(id, stats) {
  const el = document.getElementById(id);
  if (!el) return;

  if (!stats.length) {
    el.innerHTML = '<tr><td colspan="4" class="text-muted text-sm text-center" style="padding:16px">Sem dados</td></tr>';
    return;
  }

  el.innerHTML = stats.map(a => `<tr>
    <td>
      <span class="app-dot" style="background:${a.color}"></span>
      <span class="fw-bold">${a.label}</span>
    </td>
    <td class="text-green fw-bold">${fmtBRL(a.earnings)}</td>
    <td class="${a.rpmKm >= 1 ? 'text-green' : 'text-yellow'} fw-bold">${a.rpmKm > 0 ? 'R$' + a.rpmKm.toFixed(2) : '—'}</td>
    <td><span class="badge badge-blue">${a.pct.toFixed(0)}%</span></td>
  </tr>`).join('');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PAGE: MANUTENÃ‡ÃƒO
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderManut() {
  const m = DB.getMaintenance();
  const alerts = DB.getMaintenanceAlerts();
  const s = DB.getSettings();

  setEl('m-odo',       m.odometer_total.toLocaleString('pt-BR') + ' km');
  setEl('m-bike',      s.bike_model);

  // Oil
  const kmSinceOil = m.odometer_total - m.last_oil_km;
  const oilRemaining = Math.max(0, m.oil_interval_km - kmSinceOil);
  const oilPct = Math.min(kmSinceOil / m.oil_interval_km, 1);
  setEl('m-oil-since',   fmtKm(kmSinceOil));
  setEl('m-oil-remain',  oilRemaining > 0 ? fmtKm(oilRemaining) + ' restantes' : 'VENCIDO');
  setProgress('m-oil-bar', oilPct);

  // Revision
  const kmSinceRev = m.odometer_total - m.last_revision_km;
  const revRemaining = Math.max(0, m.revision_interval_km - kmSinceRev);
  const revPct = Math.min(kmSinceRev / m.revision_interval_km, 1);
  setEl('m-rev-since',   fmtKm(kmSinceRev));
  setEl('m-rev-remain',  revRemaining > 0 ? fmtKm(revRemaining) + ' restantes' : 'VENCIDA');
  setProgress('m-rev-bar', revPct);

  // Alerts
  const alertWrap = document.getElementById('m-alerts');
  if (alertWrap) {
    alertWrap.innerHTML = alerts.length > 0
      ? alerts.map(a => `<div class="alert alert-${a.type}"><span>${a.icon}</span><span>${a.msg}</span></div>`).join('')
      : `<div class="alert alert-green">✅… Manutenção em dia — tudo ok!</div>`;
  }
}

// â”€â”€ Modal: Day â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openDayModal(id) {
  STATE.editingDayId = id;
  const day = id ? DB.getDayById(id) : null;
  const isEdit = !!day;

  const today = new Date().toISOString().slice(0, 10);

  const html = `
    <div class="modal-overlay" id="modal-day" onclick="closeModal('modal-day', event)">
      <div class="modal">
        <div class="modal-handle"></div>
        <div class="modal-title">${isEdit ? '✅ï¸ Editar Dia' : '➕ Registrar Dia'}</div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Data</label>
            <input type="date" id="f-date" class="form-input" value="${day?.date || today}" max="${today}">
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Quilômetros</label>
              <input type="number" id="f-km" class="form-input" placeholder="0.0" step="0.1" min="0" value="${day?.km || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Gorjetas (R$)</label>
              <input type="number" id="f-tips" class="form-input" placeholder="0.00" step="0.01" min="0" value="${day?.tips || ''}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Receitas por App (R$)</label>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" style="color:#ef4444">🔴 iFood</label>
              <input type="number" id="f-ifood" class="form-input" placeholder="0.00" step="0.01" min="0" value="${day?.apps?.ifood || ''}">
            </div>
            <div class="form-group">
              <label class="form-label" style="color:#94a3b8">⚫ Uber</label>
              <input type="number" id="f-uber" class="form-input" placeholder="0.00" step="0.01" min="0" value="${day?.apps?.uber || ''}">
            </div>
            <div class="form-group">
              <label class="form-label" style="color:#f59e0b">🟡 99 Food</label>
              <input type="number" id="f-99" class="form-input" placeholder="0.00" step="0.01" min="0" value="${day?.apps?.noventa_nove || ''}">
            </div>
            <div class="form-group">
              <label class="form-label" style="color:#3b82f6">🔵 Lalamove</label>
              <input type="number" id="f-lala" class="form-input" placeholder="0.00" step="0.01" min="0" value="${day?.apps?.lalamove || ''}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Observações</label>
            <input type="text" id="f-notes" class="form-input" placeholder="Ex: dia lento, chuva..." value="${day?.notes || ''}">
          </div>
        </div>
        <div class="modal-footer">
          ${isEdit ? `<button class="btn btn-danger btn-sm" onclick="deleteDay('${id}')">Excluir</button>` : ''}
          <button class="btn btn-secondary flex-1" onclick="closeModal('modal-day')">Cancelar</button>
          <button class="btn btn-primary flex-1" onclick="saveDay()">Salvar</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  // Auto-calc total
  ['f-ifood','f-uber','f-99','f-lala'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateDayTotal);
  });
}

function updateDayTotal() {
  const vals = ['f-ifood','f-uber','f-99','f-lala'].map(id => parseFloat(document.getElementById(id)?.value)||0);
  // (no display element needed – total is computed on save)
}

function saveDay() {
  const date  = document.getElementById('f-date')?.value;
  const km    = parseFloat(document.getElementById('f-km')?.value) || 0;
  const tips  = parseFloat(document.getElementById('f-tips')?.value) || 0;
  const ifood = parseFloat(document.getElementById('f-ifood')?.value) || 0;
  const uber  = parseFloat(document.getElementById('f-uber')?.value) || 0;
  const nn    = parseFloat(document.getElementById('f-99')?.value) || 0;
  const lala  = parseFloat(document.getElementById('f-lala')?.value) || 0;
  const notes = document.getElementById('f-notes')?.value || '';

  if (!date) { toast('âš ï¸ Informe a data'); return; }

  const earnings = ifood + uber + nn + lala;
  const payload = {
    date,
    km,
    earnings,
    apps: { ifood, uber, noventa_nove: nn, lalamove: lala },
    tips,
    notes
  };

  const id = STATE.editingDayId;
  if (id) {
    DB.updateDay(id, payload);
    toast('✅… Dia atualizado');
  } else {
    DB.addDay(payload);
    toast('✅… Dia registrado');
  }

  closeModal('modal-day');
  renderPage(STATE.page);
}

function deleteDay(id) {
  if (!confirm('Excluir este dia?')) return;
  DB.deleteDay(id);
  closeModal('modal-day');
  renderPage(STATE.page);
  toast('Dia excluído');
}

// â”€â”€ Modal: Fuel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openFuelModal() {
  const today = new Date().toISOString().slice(0, 10);
  const s = DB.getSettings();

  const html = `
    <div class="modal-overlay" id="modal-fuel" onclick="closeModal('modal-fuel', event)">
      <div class="modal">
        <div class="modal-handle"></div>
        <div class="modal-title">â›½ Registrar Abastecimento</div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Data</label>
            <input type="date" id="ff-date" class="form-input" value="${today}" max="${today}">
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Litros</label>
              <input type="number" id="ff-liters" class="form-input" placeholder="0.000" step="0.001" min="0" oninput="calcFuelTotal()">
            </div>
            <div class="form-group">
              <label class="form-label">PreÃ§o/L (R$)</label>
              <input type="number" id="ff-price" class="form-input" placeholder="${s.fuel_price}" step="0.01" min="0" value="${s.fuel_price}" oninput="calcFuelTotal()">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Total pago (R$) <span id="ff-total-preview" class="text-green text-sm"></span></label>
            <input type="number" id="ff-total" class="form-input" placeholder="0.00" step="0.01" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">Km rodados desde último abastecimento</label>
            <input type="number" id="ff-km" class="form-input" placeholder="0" step="0.1" min="0">
          </div>
          <div class="alert alert-blue" style="margin-top:4px">
            â„¹ï¸ Informe os km rodados desde o último abastecimento para calcular km/L.
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary flex-1" onclick="closeModal('modal-fuel')">Cancelar</button>
          <button class="btn btn-primary flex-1" onclick="saveFuel()">Salvar</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function calcFuelTotal() {
  const liters = parseFloat(document.getElementById('ff-liters')?.value) || 0;
  const price  = parseFloat(document.getElementById('ff-price')?.value) || 0;
  const total  = liters * price;
  const totalEl = document.getElementById('ff-total');
  const previewEl = document.getElementById('ff-total-preview');
  if (total > 0) {
    if (totalEl && !totalEl.value) totalEl.value = total.toFixed(2);
    if (previewEl) previewEl.textContent = '= ' + fmtBRL(total);
  }
}

function saveFuel() {
  const date   = document.getElementById('ff-date')?.value;
  const liters = parseFloat(document.getElementById('ff-liters')?.value) || 0;
  const price  = parseFloat(document.getElementById('ff-price')?.value) || 0;
  const total  = parseFloat(document.getElementById('ff-total')?.value) || (liters * price);
  const km     = parseFloat(document.getElementById('ff-km')?.value) || 0;

  if (!date || liters <= 0) { toast('âš ï¸ Informe data e litros'); return; }

  DB.addFuelLog({
    date,
    liters,
    price_per_liter: price,
    total_paid: total,
    km_since_refuel: km,
    odometer_at_refuel: DB.getMaintenance().odometer_total
  });

  // Update fuel price in settings
  if (price > 0) DB.updateSettings({ fuel_price: price });

  closeModal('modal-fuel');
  renderFuel();
  toast('✅… Abastecimento registrado');
}

// â”€â”€ Modal: Maintenance edit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openManutModal() {
  const m = DB.getMaintenance();
  const s = DB.getSettings();

  const html = `
    <div class="modal-overlay" id="modal-manut" onclick="closeModal('modal-manut', event)">
      <div class="modal">
        <div class="modal-handle"></div>
        <div class="modal-title">ðŸ”§ Editar Manutenção</div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Modelo da moto</label>
            <input type="text" id="mm-model" class="form-input" value="${s.bike_model}">
          </div>
          <div class="form-group">
            <label class="form-label">Odômetro total (km)</label>
            <input type="number" id="mm-odo" class="form-input" value="${m.odometer_total}">
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Km na última troca de óleo</label>
              <input type="number" id="mm-oil" class="form-input" value="${m.last_oil_km}">
            </div>
            <div class="form-group">
              <label class="form-label">Intervalo de óleo (km)</label>
              <input type="number" id="mm-oil-int" class="form-input" value="${m.oil_interval_km}">
            </div>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Km na última revisão</label>
              <input type="number" id="mm-rev" class="form-input" value="${m.last_revision_km}">
            </div>
            <div class="form-group">
              <label class="form-label">Intervalo de revisão (km)</label>
              <input type="number" id="mm-rev-int" class="form-input" value="${m.revision_interval_km}">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary flex-1" onclick="closeModal('modal-manut')">Cancelar</button>
          <button class="btn btn-primary flex-1" onclick="saveManut()">Salvar</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function saveManut() {
  DB.updateMaintenance({
    odometer_total:      parseFloat(document.getElementById('mm-odo')?.value) || 0,
    last_oil_km:         parseFloat(document.getElementById('mm-oil')?.value) || 0,
    oil_interval_km:     parseFloat(document.getElementById('mm-oil-int')?.value) || 3000,
    last_revision_km:    parseFloat(document.getElementById('mm-rev')?.value) || 0,
    revision_interval_km: parseFloat(document.getElementById('mm-rev-int')?.value) || 6000
  });
  DB.updateSettings({ bike_model: document.getElementById('mm-model')?.value || 'CG 105cc' });
  closeModal('modal-manut');
  renderManut();
  toast('✅… Manutenção atualizada');
}

// â”€â”€ Modal: Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openSettingsModal() {
  const s = DB.getSettings();
  const html = `
    <div class="modal-overlay" id="modal-settings" onclick="closeModal('modal-settings', event)">
      <div class="modal">
        <div class="modal-handle"></div>
        <div class="modal-title">âš™ï¸ Configurações</div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">PreÃ§o da gasolina (R$/L)</label>
            <input type="number" id="s-price" class="form-input" value="${s.fuel_price}" step="0.01">
          </div>
          <div class="form-group">
            <label class="form-label">Consumo estimado (km/L) — usado quando não há histórico</label>
            <input type="number" id="s-kml" class="form-input" value="${s.bike_km_l_estimate}" step="0.1">
          </div>
          <div class="form-group">
            <label class="form-label">Modelo da moto</label>
            <input type="text" id="s-bike" class="form-input" value="${s.bike_model}">
          </div>
          <div class="divider"></div>
          <button class="btn btn-danger btn-full" onclick="resetData()">ðŸ—‘ï¸ Resetar todos os dados</button>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary flex-1" onclick="closeModal('modal-settings')">Cancelar</button>
          <button class="btn btn-primary flex-1" onclick="saveSettings()">Salvar</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function saveSettings() {
  DB.updateSettings({
    fuel_price: parseFloat(document.getElementById('s-price')?.value) || 8,
    bike_km_l_estimate: parseFloat(document.getElementById('s-kml')?.value) || 27.5,
    bike_model: document.getElementById('s-bike')?.value || 'CG 105cc'
  });
  closeModal('modal-settings');
  renderPage(STATE.page);
  toast('✅… Configurações salvas');
}

function resetData() {
  if (!confirm('Resetar TODOS os dados? Esta ação não pode ser desfeita.')) return;
  DB.reset();
  closeModal('modal-settings');
  renderPage(STATE.page);
  toast('Dados resetados para exemplo');
}

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function closeModal(id, event) {
  if (event && event.target.id !== id) return; // only close when clicking overlay
  const el = document.getElementById(id);
  if (el) el.remove();
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function elColor(id, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('text-green','text-red','text-yellow','text-blue','text-muted');
  if (cls) el.classList.add(cls);
}

function setProgress(id, pct) {
  const el = document.getElementById(id);
  if (!el) return;
  const fill = el.querySelector('.progress-bar-fill');
  if (!fill) return;
  fill.style.width = Math.min(pct * 100, 100) + '%';
  fill.className = 'progress-bar-fill ' + (pct >= 1 ? 'red' : pct >= 0.8 ? 'yellow' : 'green');
}

// â”€â”€ Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

// --- NOVO: STATUS & TRIPS ---
function toggleStatus(val) {
    const isAvail = val === 'AVAILABLE';
    localStorage.setItem('entregador_status', val);
    const dot = document.getElementById('status-dot');
    if (dot) dot.style.background = isAvail ? '#22c55e' : '#ef4444';
    if (typeof AndroidNative !== 'undefined') {
        AndroidNative.setStatus(isAvail);
    }
}

function initStatus() { updateStatusVisuals(localStorage.getItem('entregador_status') === 'AVAILABLE'); }

function openTripModal(tripId = null) {
    document.getElementById('modal-trip').classList.add('active');
    if (tripId) {
        document.getElementById('modal-trip-title').textContent = 'Editar Corrida';
        const today = DB.getTodayRecord();
        const trip = today.trips.find(t => t.id === tripId);
        if (trip) {
            document.getElementById('trip-id').value = trip.id;
            document.getElementById('trip-platform').value = trip.platform;
            document.getElementById('trip-value').value = trip.value;
            document.getElementById('trip-km').value = trip.km;
            document.getElementById('trip-time').value = trip.time_minutes || '';
            document.getElementById('trip-delete-wrap').style.display = 'block';
        }
    } else {
        document.getElementById('modal-trip-title').textContent = 'Nova Corrida';
        document.getElementById('trip-id').value = '';
        document.getElementById('trip-platform').value = 'ifood';
        document.getElementById('trip-value').value = '';
        document.getElementById('trip-km').value = '';
        document.getElementById('trip-time').value = '';
        document.getElementById('trip-delete-wrap').style.display = 'none';
    }
}

function closeTripModal() {
    document.getElementById('modal-trip').classList.remove('active');
}

function saveTrip() {
    const id = document.getElementById('trip-id').value;
    const data = {
        platform: document.getElementById('trip-platform').value,
        value: document.getElementById('trip-value').value,
        km: document.getElementById('trip-km').value,
        time_minutes: document.getElementById('trip-time').value
    };
    if (id) {
        DB.updateTrip(id, data);
        toast('Corrida atualizada!');
    } else {
        DB.addTrip(data);
        toast('Nova corrida salva!');
    }
    closeTripModal();
    renderHome();
}

function deleteTrip() {
    const id = document.getElementById('trip-id').value;
    if (confirm('Excluir esta corrida?')) {
        DB.deleteTrip(id);
        toast('Corrida excluída!');
        closeTripModal();
        renderHome();
    }
}

function renderTodayTrips() {
    const list = document.getElementById('home-trips-list');
    if (!list) return;
    const today = DB.getTodayRecord();
    if (!today || !today.trips || today.trips.length === 0) {
        list.innerHTML = '<p class="text-muted text-sm text-center" style="padding:20px;">Nenhuma corrida registrada hoje.</p>';
        return;
    }
    
    let html = '';
    today.trips.forEach(function(t) {
        const timeStr = t.timestamp ? new Date(t.timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '--:--';
        html += '<div class="card card-sm" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="openTripModal(\'' + t.id + '\')">';
        html += '    <div style="display:flex; align-items:center; gap:12px;">';
        html += '        <div style="width:32px;height:32px;border-radius:4px;background:' + APP_COLORS[t.platform] + ';display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:0.7rem;">';
        html +=              t.platform.substring(0,2).toUpperCase();
        html += '        </div>';
        html += '        <div>';
        html += '            <div style="font-weight:bold; color:#f8fafc;">' + fmtBRL(t.value) + '</div>';
        html += '            <div class="text-xs text-muted">' + timeStr + ' • ' + fmtKm(t.km) + '</div>';
        html += '        </div>';
        html += '    </div>';
        html += '    <div style="color:#94a3b8;">';
        html += '        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">';
        html += '          <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />';
        html += '        </svg>';
        html += '    </div>';
        html += '</div>';
    });
    list.innerHTML = html;
}

// --- ATUALIZADO: TOGGLE UX ---
function toggleStatusUI() {
    const isAvail = localStorage.getItem('entregador_status') === 'AVAILABLE';
    const newState = !isAvail;
    updateStatusVisuals(newState);
    
    localStorage.setItem('entregador_status', newState ? 'AVAILABLE' : 'UNAVAILABLE');
    if (typeof AndroidNative !== 'undefined') {
        AndroidNative.setStatus(newState);
    }
}

function updateStatusVisuals(isAvail) {
    const bg = document.getElementById('status-toggle-bg');
    const btnOn = document.getElementById('status-btn-on');
    const btnOff = document.getElementById('status-btn-off');
    
    if(bg) {
        if(isAvail) bg.classList.add('active');
        else bg.classList.remove('active');
    }
    if(btnOn) {
        if(isAvail) btnOn.classList.add('active');
        else btnOn.classList.remove('active');
    }
    if(btnOff) {
        if(!isAvail) btnOff.classList.add('active');
        else btnOff.classList.remove('active');
    }
}

// Fechar modal clicando fora
window.onclick = function(event) {
    const modal = document.getElementById('modal-trip');
    if (event.target === modal) {
        closeTripModal();
    }
}


// ============================================================
// BROWSER GPS TRACKER (substitui o GpsTrackerService nativo)
// Funciona no iOS, Android browser e desktop
// ============================================================
const BrowserGPS = {
  watchId: null,
  lastPos: null,
  totalKm: 0,
  isTracking: false,
  isPaused: false,

  start() {
    if (!navigator.geolocation) {
      toast('GPS não suportado neste dispositivo.');
      return;
    }
    this.isTracking = true;
    this.isPaused = false;
    this.totalKm = 0;
    this.lastPos = null;

    this.watchId = navigator.geolocation.watchPosition(
      pos => this._onLocation(pos),
      err => console.warn('GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
    console.log('GPS tracking started');
  },

  pause() {
    this.isPaused = true;
  },

  resume() {
    this.isPaused = false;
  },

  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
    const km = this.totalKm;
    this.totalKm = 0;
    this.lastPos = null;
    return km; // return accumulated km for the trip
  },

  _onLocation(pos) {
    if (this.isPaused || !this.isTracking) return;

    const { latitude, longitude, speed, accuracy } = pos.coords;
    // Anti-ghosting: speed > 0.5 m/s (~1.8 km/h) and accuracy < 30m
    if (accuracy > 30) return;

    if (this.lastPos && (speed == null || speed > 0.5)) {
      const dist = this._haversine(
        this.lastPos.lat, this.lastPos.lng,
        latitude, longitude
      );
      // Sanity check: max ~200 km/h
      if (dist < 0.5) {
        this.totalKm += dist;
        // Update widget if visible
        const el = document.getElementById('browser-gps-km');
        if (el) el.textContent = fmtKm(this.totalKm);
      }
    }
    this.lastPos = { lat: latitude, lng: longitude };
  },

  _haversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
};

// ============================================================
// SOBRESCREVER toggleStatus: compatível com browser (sem AndroidNative)
// ============================================================
function toggleStatus(val) {
  const isAvail = (val === 'AVAILABLE' || val === true);
  localStorage.setItem('entregador_status', isAvail ? 'AVAILABLE' : 'UNAVAILABLE');
  if (isAvail) {
    BrowserGPS.start();
  } else {
    BrowserGPS.stop();
  }
  // Call Android native only if running inside WebView
  try {
    if (typeof AndroidNative !== 'undefined' && AndroidNative.setStatus) {
      AndroidNative.setStatus(isAvail);
    }
  } catch(e) {}
}

// ============================================================
// TRIP: ao salvar corrida, se GPS estiver ativo, preenche km automaticamente
// ============================================================
const _origOpenTripModal = openTripModal;
openTripModal = function(tripId) {
  _origOpenTripModal(tripId);
  // Auto-fill km from GPS if no tripId (new trip) and GPS is running
  if (!tripId && BrowserGPS.isTracking && BrowserGPS.totalKm > 0) {
    const kmField = document.getElementById('trip-km');
    if (kmField && !kmField.value) {
      kmField.value = BrowserGPS.totalKm.toFixed(1);
    }
  }
};

// ============================================================
// KEEP SCREEN AWAKE (evitar que iOS desligue o rastreamento)
// ============================================================
let wakeLock = null;
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch(e) {}
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && BrowserGPS.isTracking) {
    requestWakeLock();
  }
});
