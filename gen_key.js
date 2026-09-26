const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const kt = 'C:\\Program Files\\Microsoft\\jdk-17.0.20.101-hotspot\\bin\\keytool.exe';
const ksPath = path.join(__dirname, 'android', 'entregador.keystore');

if (fs.existsSync(ksPath)) {
  fs.unlinkSync(ksPath);
}

console.log('Generating fresh keystore...');
const cmd = `"${kt}" -genkeypair -v -keystore "${ksPath}" -alias entregador -keyalg RSA -keysize 2048 -validity 10000 -storepass 123456 -keypass 123456 -dname "CN=Entregador, OU=App, O=Entregador, L=BR, S=SP, C=BR"`;
execSync(cmd, { stdio: 'inherit' });
console.log('Keystore created successfully at:', ksPath);
