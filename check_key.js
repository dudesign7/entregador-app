const { execSync } = require('child_process');
const kt = 'C:\\Program Files\\Microsoft\\jdk-17.0.20.101-hotspot\\bin\\keytool.exe';
const passes = ['123456', 'android', 'entregador', 'dudesign7', '12345678', 'password', 'master', 'admin', 'key123456'];

passes.forEach(p => {
  try {
    const out = execSync(`"${kt}" -list -keystore android/entregador.keystore -storepass ${p}`).toString();
    console.log('SUCCESS! Key Password is:', p);
    console.log(out.split('\n').slice(0, 5).join('\n'));
  } catch (e) {}
});
