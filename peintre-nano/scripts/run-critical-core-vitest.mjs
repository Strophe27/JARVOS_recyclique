#!/usr/bin/env node
/**
 * Story 10.4 — Vitest sur les fichiers Peintre listés dans doc/critical-core-peloton.yaml
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import YAML from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const peintreRoot = resolve(__dirname, "..");
const repoRoot = resolve(peintreRoot, "..");
const manifestPath = join(repoRoot, "doc", "critical-core-peloton.yaml");

const raw = readFileSync(manifestPath, "utf8");
const doc = YAML.parse(raw);
const targets = doc?.targets ?? {};
const requiredKeys = [
  "module_chain",
  "caisse_nominal",
  "reception_nominal",
  "sync_sensitive",
];

const files = [];
for (const key of requiredKeys) {
  const peintre = targets[key]?.peintre ?? [];
  for (const rel of peintre) {
    files.push(rel);
  }
}

if (files.length === 0) {
  console.error("Aucun fichier Peintre dans le manifeste critical core.");
  process.exit(1);
}

const vitestBin = join(peintreRoot, "node_modules", "vitest", "vitest.mjs");
const args = ["run", ...files];
const result = spawnSync(process.execPath, [vitestBin, ...args], {
  cwd: peintreRoot,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
