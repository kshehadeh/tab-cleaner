import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Updates the version in both package.json and manifest.json
 * @param {string} versionType - The type of version bump: 'patch', 'minor', 'major', or 'prerelease'
 */
async function updateVersion(versionType) {
  try {
    // Read current package.json
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
    
    // Read current manifest.json
    const manifestJsonPath = join(process.cwd(), 'manifest.json');
    const manifestJson = JSON.parse(await readFile(manifestJsonPath, 'utf8'));
    
    // Parse current version
    const currentVersion = packageJson.version;
    
    // Handle prerelease versions by extracting the base version
    const baseVersion = currentVersion.split('-')[0];
    const [major, minor, patch] = baseVersion.split('.').map(Number);
    
    let newVersion;
    
    switch (versionType) {
      case 'patch':
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
      case 'minor':
        newVersion = `${major}.${minor + 1}.0`;
        break;
      case 'major':
        newVersion = `${major + 1}.0.0`;
        break;
      case 'prerelease':
        // For prerelease, we'll add a prerelease identifier
        const prereleaseMatch = currentVersion.match(/^(\d+\.\d+\.\d+)(?:-(\w+\.\d+))?$/);
        if (prereleaseMatch) {
          const [, baseVersion, prerelease] = prereleaseMatch;
          if (prerelease) {
            const [, prereleaseType, prereleaseNumber] = prerelease.match(/^(\w+)\.(\d+)$/);
            newVersion = `${baseVersion}-${prereleaseType}.${parseInt(prereleaseNumber) + 1}`;
          } else {
            newVersion = `${baseVersion}-beta.1`;
          }
        } else {
          newVersion = `${major}.${minor}.${patch}-beta.1`;
        }
        break;
      default:
        throw new Error(`Invalid version type: ${versionType}. Must be one of: patch, minor, major, prerelease`);
    }
    
    console.log(`Updating version from ${currentVersion} to ${newVersion}`);
    
    // Update package.json
    packageJson.version = newVersion;
    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
    console.log(`✅ Updated package.json version to ${newVersion}`);
    
    // Update manifest.json
    manifestJson.version = newVersion;
    await writeFile(manifestJsonPath, JSON.stringify(manifestJson, null, 2) + '\n', 'utf8');
    console.log(`✅ Updated manifest.json version to ${newVersion}`);
    
    console.log(`\n🎉 Successfully updated version to ${newVersion} in both files!`);
    
  } catch (error) {
    console.error('❌ Failed to update version:', error.message);
    process.exitCode = 1;
  }
}

// Get version type from command line arguments
const versionType = process.argv[2];

if (!versionType) {
  console.error('❌ Please specify a version type: patch, minor, major, or prerelease');
  console.log('Usage: node scripts/update-version.mjs <version-type>');
  console.log('Examples:');
  console.log('  node scripts/update-version.mjs patch     # 1.0.0 -> 1.0.1');
  console.log('  node scripts/update-version.mjs minor    # 1.0.0 -> 1.1.0');
  console.log('  node scripts/update-version.mjs major    # 1.0.0 -> 2.0.0');
  console.log('  node scripts/update-version.mjs prerelease # 1.0.0 -> 1.0.0-beta.1');
  process.exitCode = 1;
} else {
  updateVersion(versionType);
}
