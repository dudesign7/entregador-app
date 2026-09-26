const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sdkDir = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk');
const buildToolsDir = path.join(sdkDir, 'build-tools', '36.0.0');
const androidJar = path.join(sdkDir, 'platforms', 'android-37.0', 'android.jar');

const aapt2 = path.join(buildToolsDir, 'aapt2.exe');
const d8 = path.join(buildToolsDir, 'd8.bat');
const zipalign = path.join(buildToolsDir, 'zipalign.exe');
const apksigner = path.join(buildToolsDir, 'apksigner.bat');

const rootDir = 'c:\\Users\\Eduardo Viana\\Desktop\\Entregador';
const androidDir = path.join(rootDir, 'android');
const buildDir = path.join(androidDir, '_build');

console.log('0. Syncing web files to android assets...');
const webDir = path.join(rootDir, 'web');
const assetsDir = path.join(androidDir, 'app', 'src', 'main', 'assets');
fs.readdirSync(webDir).forEach(f => {
  const srcPath = path.join(webDir, f);
  if (!fs.statSync(srcPath).isDirectory()) {
    fs.copyFileSync(srcPath, path.join(assetsDir, f));
  }
});

console.log('1. Cleaning & creating build dirs...');
fs.mkdirSync(path.join(buildDir, 'res_flat'), { recursive: true });
fs.mkdirSync(path.join(buildDir, 'gen'), { recursive: true });
fs.mkdirSync(path.join(buildDir, 'classes'), { recursive: true });
fs.mkdirSync(path.join(buildDir, 'dex'), { recursive: true });

console.log('2. AAPT2 compile...');
execSync(`"${aapt2}" compile --dir "${path.join(androidDir, 'app', 'src', 'main', 'res')}" -o "${path.join(buildDir, 'res_flat')}"`, { cwd: androidDir, stdio: 'inherit' });

console.log('3. AAPT2 link...');
const flatFiles = fs.readdirSync(path.join(buildDir, 'res_flat')).map(f => `"${path.join(buildDir, 'res_flat', f)}"`).join(' ');
const linkCmd = `"${aapt2}" link -o "${path.join(buildDir, 'base.apk')}" -I "${androidJar}" --manifest "${path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml')}" -A "${path.join(androidDir, 'app', 'src', 'main', 'assets')}" ${flatFiles} --java "${path.join(buildDir, 'gen')}"`;
execSync(linkCmd, { cwd: androidDir, stdio: 'inherit' });

console.log('4. javac...');
const javaFiles = [];
function findJava(dir) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) findJava(p);
    else if (p.endsWith('.java')) javaFiles.push(`"${p}"`);
  });
}
findJava(path.join(buildDir, 'gen'));
findJava(path.join(androidDir, 'app', 'src', 'main', 'java'));

execSync(`javac -d "${path.join(buildDir, 'classes')}" -classpath "${androidJar}" ${javaFiles.join(' ')}`, { cwd: androidDir, stdio: 'inherit' });

console.log('5. d8 dexing...');
const classFiles = [];
function findClass(dir) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) findClass(p);
    else if (p.endsWith('.class')) classFiles.push(`"${p}"`);
  });
}
findClass(path.join(buildDir, 'classes'));

execSync(`"${d8}" --output "${path.join(buildDir, 'dex')}" --lib "${androidJar}" ${classFiles.join(' ')}`, { cwd: androidDir, stdio: 'inherit' });

console.log('6. Packaging classes.dex into base.apk...');
const baseApkPath = path.join(buildDir, 'base.apk').replace(/\\/g, '/');
const dexPath = path.join(buildDir, 'dex', 'classes.dex').replace(/\\/g, '/');
execSync(`powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; $zip = [System.IO.Compression.ZipFile]::Open('${baseApkPath}', 'Update'); $entry = $zip.GetEntry('classes.dex'); if ($entry) { $entry.Delete() }; [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, '${dexPath}', 'classes.dex'); $zip.Dispose()"`, { cwd: androidDir, stdio: 'inherit' });

console.log('7. Zipalign...');
const alignedApk = path.join(buildDir, 'aligned.apk');
if (fs.existsSync(alignedApk)) fs.unlinkSync(alignedApk);
execSync(`"${zipalign}" -f -p 4 "${path.join(buildDir, 'base.apk')}" "${alignedApk}"`, { cwd: androidDir, stdio: 'inherit' });

console.log('8. Sign APK...');
const targetApk = path.join(rootDir, 'Entregador-v21.apk');
if (fs.existsSync(targetApk)) fs.unlinkSync(targetApk);
execSync(`"${apksigner}" sign --ks "${path.join(androidDir, 'entregador.keystore')}" --ks-pass pass:123456 --out "${targetApk}" "${alignedApk}"`, { cwd: androidDir, stdio: 'inherit' });

console.log('SUCCESS! Created:', targetApk);
