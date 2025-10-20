import { createWriteStream } from 'node:fs';
import { createReadStream, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import archiver from 'archiver';

async function createZipPackage() {
  const output = createWriteStream('tab-cleaner-extension.zip');
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });

  // Listen for archive events
  archive.on('error', (err) => {
    throw err;
  });

  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      console.warn('Archive warning:', err);
    } else {
      throw err;
    }
  });

  // Pipe archive data to the file
  archive.pipe(output);

  // Add files to archive
  const filesToInclude = [
    'manifest.json',
    'dist/popup.html',
    'dist/popup.js',
    'dist/popup.css',
    'images/icon-16.png',
    'images/icon-32.png',
    'images/icon-48.png',
    'images/icon-128.png'
  ];

  console.log('Creating extension package...');
  
  for (const file of filesToInclude) {
    try {
      await stat(file);
      archive.file(file, { name: file });
      console.log(`✓ Added ${file}`);
    } catch (error) {
      console.error(`✗ Failed to add ${file}:`, error.message);
    }
  }

  // Finalize the archive
  await archive.finalize();
  
  output.on('close', () => {
    console.log(`\n🎉 Extension package created: tab-cleaner-extension.zip`);
    console.log(`📦 Archive size: ${archive.pointer()} bytes`);
    console.log(`\n📋 Next steps:`);
    console.log(`1. Go to Chrome Web Store Developer Dashboard`);
    console.log(`2. Click "Add new item"`);
    console.log(`3. Upload tab-cleaner-extension.zip`);
    console.log(`4. Fill in store listing details`);
    console.log(`5. Submit for review`);
  });
}

createZipPackage().catch(console.error);
