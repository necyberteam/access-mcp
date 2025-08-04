#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const PACKAGES = [
  'shared',
  'affinity-groups', 
  'compute-resources',
  'system-status',
  'software-discovery'
];

function runCommand(command, options = {}) {
  try {
    console.log(`📦 Running: ${command}`);
    const result = execSync(command, { 
      stdio: 'inherit',
      encoding: 'utf8',
      ...options 
    });
    return result;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

function checkPackage(packageName) {
  const packagePath = join('packages', packageName);
  const packageJsonPath = join(packagePath, 'package.json');
  const distPath = join(packagePath, 'dist');
  const readmePath = join(packagePath, 'README.md');

  console.log(`\n🔍 Checking package: @access-mcp/${packageName}`);

  // Check package.json exists
  if (!existsSync(packageJsonPath)) {
    throw new Error(`package.json not found for ${packageName}`);
  }

  // Check dist folder exists
  if (!existsSync(distPath)) {
    throw new Error(`dist folder not found for ${packageName}. Run 'npm run build' first.`);
  }

  // Check README exists
  if (!existsSync(readmePath)) {
    console.warn(`⚠️  README.md not found for ${packageName}. Consider adding one.`);
  }

  // Parse package.json
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  
  // Check required fields
  const requiredFields = ['name', 'version', 'description', 'main', 'author', 'license'];
  for (const field of requiredFields) {
    if (!packageJson[field]) {
      throw new Error(`Missing required field '${field}' in ${packageName}/package.json`);
    }
  }

  console.log(`✅ Package ${packageName} looks good!`);
  return packageJson;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const publishCommand = isDryRun ? 'npm publish --dry-run --access public' : 'npm publish --access public';

  console.log('🚀 ACCESS-CI MCP Packages Publisher');
  console.log(`📋 Mode: ${isDryRun ? 'DRY RUN' : 'LIVE PUBLISH'}`);
  console.log('');

  // Pre-publish checks
  console.log('🔍 Running pre-publish checks...');
  
  // Build all packages
  runCommand('npm run build');

  // Run tests
  console.log('🧪 Running tests...');
  runCommand('npm test');

  // Check each package
  for (const packageName of PACKAGES) {
    checkPackage(packageName);
  }

  console.log('\n✅ All pre-publish checks passed!');

  if (isDryRun) {
    console.log('\n🎭 Running dry-run publish...');
    runCommand('npm publish --dry-run --workspaces --access public');
  } else {
    console.log('\n🚀 Publishing packages to npm...');
    
    // Publish shared package first (others depend on it)
    console.log('\n📦 Publishing shared package first...');
    runCommand('npm publish --access public', { cwd: 'packages/shared' });
    
    // Wait a moment for npm to propagate
    console.log('⏳ Waiting for npm to propagate...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Publish other packages
    for (const packageName of PACKAGES.slice(1)) {
      console.log(`\n📦 Publishing ${packageName}...`);
      runCommand('npm publish --access public', { cwd: `packages/${packageName}` });
    }
  }

  console.log('\n🎉 Publishing complete!');
  console.log('\n📖 Next steps:');
  console.log('1. Verify packages on npmjs.com');
  console.log('2. Test installation: npm install -g @access-mcp/affinity-groups');
  console.log('3. Update documentation with installation instructions');
}

main().catch(error => {
  console.error('\n❌ Publishing failed:', error.message);
  process.exit(1);
});