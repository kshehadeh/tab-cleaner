# GitHub Actions Workflow

This repository includes an automated GitHub Actions workflow that builds and releases the Tab Cleaner extension.

## Workflow: Build and Release Extension

**File:** `.github/workflows/release.yml`

### Triggers
- **Push to main branch**: Automatically triggers on every push to the main branch
- **Manual dispatch**: Can be manually triggered from the GitHub Actions tab

### What it does
1. **Checkout code**: Downloads the latest code from the repository
2. **Setup Node.js**: Installs Node.js 18 and caches npm dependencies
3. **Install dependencies**: Runs `npm ci` to install all project dependencies
4. **Build and package**: Runs `npm run package` which:
   - Builds the TypeScript code (`npm run build`)
   - Runs post-build scripts (`npm run postbuild`)
   - Creates the extension zip file (`node scripts/create-zip.mjs`)
5. **Get version**: Extracts the version number from `package.json`
6. **Check for existing release**: Determines if a release with this version already exists
7. **Create or update release**: 
   - If no release exists: Creates a new GitHub release with the zip file
   - If release exists: Uploads the zip file to the existing release

### Output
- **Release**: A GitHub release tagged with the version (e.g., `v1.0.0`)
- **Artifact**: The `tab-cleaner-extension.zip` file attached to the release
- **Release notes**: Automatic release notes with version information

### Requirements
- The workflow uses the default `GITHUB_TOKEN` which has sufficient permissions for creating releases
- No additional secrets or configuration needed

### Usage
Simply push changes to the main branch, and the workflow will automatically:
1. Build the extension
2. Create a release (if it doesn't exist)
3. Attach the zip file to the release

This makes it easy to distribute the extension to users and maintain version control.
