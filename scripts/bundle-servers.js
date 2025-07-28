import { build } from 'esbuild';
import { readdir, mkdir, copyFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const packagesDir = join(rootDir, 'packages');
const bundleDir = join(rootDir, 'bundles');

// Server packages to bundle (excluding shared)
const serverPackages = [
  'affinity-groups',
  'compute-resources', 
  'system-status',
  'software-discovery'
];

async function bundleServer(packageName) {
  const packageDir = join(packagesDir, packageName);
  const entryPoint = join(packageDir, 'dist', 'index.js');
  const outputDir = join(bundleDir, packageName);
  const outputFile = join(outputDir, 'index.js');

  try {
    // Create output directory
    await mkdir(outputDir, { recursive: true });

    console.log(`Bundling ${packageName}...`);

    // Bundle with esbuild
    await build({
      entryPoints: [entryPoint],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'esm',
      outfile: outputFile,
      external: [], // Bundle all dependencies
      banner: {
        js: '#!/usr/bin/env node\n'
      },
      minify: false, // Keep readable for debugging
      sourcemap: false,
      metafile: false,
    });

    // Copy package.json for reference
    const srcPackageJson = join(packageDir, 'package.json');
    const destPackageJson = join(outputDir, 'package.json');
    await copyFile(srcPackageJson, destPackageJson);

    // Copy README if it exists
    try {
      const srcReadme = join(packageDir, 'README.md');
      const destReadme = join(outputDir, 'README.md');
      await copyFile(srcReadme, destReadme);
    } catch (err) {
      // README doesn't exist, that's ok
    }

    console.log(`✓ Bundled ${packageName} to ${outputFile}`);
  } catch (error) {
    console.error(`✗ Failed to bundle ${packageName}:`, error.message);
    throw error;
  }
}

async function main() {
  try {
    // Ensure bundles directory exists
    await mkdir(bundleDir, { recursive: true });

    console.log('Creating standalone bundles for MCP servers...\n');

    // Bundle each server
    for (const packageName of serverPackages) {
      await bundleServer(packageName);
    }

    console.log(`\n✓ All servers bundled successfully to ${bundleDir}`);
    console.log('\nTo use a bundled server:');
    console.log('1. Copy the server directory to your desired location');
    console.log('2. Make the index.js file executable: chmod +x index.js');
    console.log('3. Add to Claude Desktop config with full path to index.js');

  } catch (error) {
    console.error('\n✗ Bundling failed:', error.message);
    process.exit(1);
  }
}

main();