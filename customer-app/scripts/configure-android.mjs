import { access, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
await access(manifestPath, constants.R_OK | constants.W_OK);
let manifest = await readFile(manifestPath, 'utf8');
for (const permission of ['android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE', 'android.permission.ACCESS_COARSE_LOCATION', 'android.permission.ACCESS_FINE_LOCATION', 'android.permission.POST_NOTIFICATIONS']) {
  if (!manifest.includes(permission)) {
    const close = manifest.indexOf('>');
    manifest = `${manifest.slice(0, close + 1)}\n    <uses-permission android:name="${permission}" />${manifest.slice(close + 1)}`;
  }
}
await writeFile(manifestPath, manifest);
console.log('Golapi Customer Android permissions configured.');
