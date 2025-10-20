import { copyFile, readFile, writeFile, cp } from 'node:fs/promises';
import { join } from 'node:path';

const srcPopup = join('dist', 'src', 'popup.html');
const destPopup = join('dist', 'popup.html');

async function run() {
  try {
    // Copy the compiled popup HTML out of the nested folder that Vite creates
    await copyFile(srcPopup, destPopup);

    const html = await readFile(destPopup, 'utf8');
    const updated = html.split('../').join('./');

    await writeFile(destPopup, updated, 'utf8');

    // Copy images folder to dist
    await cp('images', join('dist', 'images'), { recursive: true });
  } catch (error) {
    console.error('[postbuild] Failed to finalize build:', error);
    process.exitCode = 1;
  }
}

run();
