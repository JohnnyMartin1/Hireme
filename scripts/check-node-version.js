#!/usr/bin/env node

const version = process.versions.node || '';
const major = Number(version.split('.')[0] || 0);

if (!Number.isFinite(major) || major < 18 || major >= 23) {
  console.error(
    `[runtime-check] Unsupported Node.js version: ${version}. This repo requires >=18.18.0 and <23.0.0.`
  );
  console.error(
    '[runtime-check] Use Node 20 (recommended). Example (Homebrew): brew install node@20 && brew link --overwrite --force node@20'
  );
  process.exit(1);
}

console.log(`[runtime-check] Node ${version} is supported.`);
