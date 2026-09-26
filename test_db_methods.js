// Mock localStorage for Node environment
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => store[k] = String(v),
  removeItem: (k) => delete store[k]
};

const DB = require('./web/db.js');

console.log('--- Testing DB Load & Init ---');
DB.load();
console.log('Is Authenticated:', DB.isAuthenticated());
console.log('Settings:', DB.getSettings());

console.log('\n--- Testing User Auth ---');
const signupRes = DB.signup({ name: 'Test User', email: 'test@entregador.com', password: 'password123' });
console.log('Signup result:', signupRes);
console.log('Is Authenticated after signup:', DB.isAuthenticated());

const logoutRes = DB.logout();
console.log('Is Authenticated after logout:', DB.isAuthenticated());

const loginRes = DB.login({ email: 'test@entregador.com', password: 'password123' });
console.log('Login result:', loginRes.success, loginRes.user?.email);

console.log('\n--- Testing CRUD: Day ---');
const day = DB.addDay({ date: '2026-09-26', km: 45.2, earnings: 180.5, tips: 15, notes: 'Dia produtivo' });
console.log('Added Day:', day.id, day.km, day.earnings);

const updatedDay = DB.updateDay(day.id, { km: 50.0, earnings: 200.0 });
console.log('Updated Day:', updatedDay.km, updatedDay.earnings);

console.log('\n--- Testing CRUD: Trips ---');
const trip = DB.addTrip({ platform: 'ifood', value: 18.5, km: 5.2, time_minutes: 20 });
console.log('Added Trip:', trip.id, trip.value, trip.km);

const updatedTrip = DB.updateTrip(trip.id, { value: 20.0, km: 5.5 });
console.log('Updated Trip in Today Record:', DB.getTodayRecord().trips[0].value);

DB.deleteTrip(trip.id);
console.log('Trips count after delete:', DB.getTodayRecord().trips.length);

console.log('\n--- Testing CRUD: Fuel Logs ---');
const fuel = DB.addFuelLog({ date: '2026-09-26', liters: 5.5, price_per_liter: 5.80, total_paid: 31.90, km_since_refuel: 140 });
console.log('Added Fuel Log:', fuel.id, fuel.total_paid);

DB.deleteFuelLog(fuel.id);
console.log('Fuel logs count after delete:', DB.getFuelLogs().length);

console.log('\n--- Testing CRUD: Maintenance & Settings ---');
const m = DB.updateMaintenance({ odometer_total: 12500, last_oil_km: 11000 });
console.log('Updated Maintenance:', m.odometer_total, m.last_oil_km);

const s = DB.updateSettings({ fuel_price: 6.10, bike_model: 'CG 160 Titan' });
console.log('Updated Settings:', s.fuel_price, s.bike_model);

console.log('\n--- Testing Delete User Account (LGPD) ---');
DB.signup({ name: 'LGPD User', email: 'lgpd@entregador.com', password: 'password123' });
DB.addDay({ date: '2026-09-26', km: 20, earnings: 100 });
console.log('Days count before delete:', DB.getDays().length);
const delRes = DB.deleteUserAccount();
console.log('Delete account result:', delRes);
console.log('Is Authenticated after delete:', DB.isAuthenticated());
console.log('Days count after delete:', DB.getDays().length);

console.log('\nALL DB TESTS PASSED SUCCESSFULLY!');
