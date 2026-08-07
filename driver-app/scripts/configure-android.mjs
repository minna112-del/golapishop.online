import { readFile, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
await access(manifestPath, constants.R_OK | constants.W_OK);
let manifest = await readFile(manifestPath, 'utf8');
const permissions = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.VIBRATE',
  'android.permission.POST_NOTIFICATIONS'
];
for (const permission of permissions) {
  if (!manifest.includes(permission)) {
    manifest = manifest.replace('<manifest', `<manifest`);
    const close = manifest.indexOf('>');
    manifest = manifest.slice(0, close + 1) + `\n    <uses-permission android:name="${permission}" />` + manifest.slice(close + 1);
  }
}
await writeFile(manifestPath, manifest);
console.log('Android permissions configured.');
