/** Folds the vitest JSON result into public/evals/report.json and prints one summary line per eval. */
import fs from 'node:fs';
import { readReport, writeReport } from './shared';

const unit = JSON.parse(fs.readFileSync('public/evals/unit.json', 'utf8'));
writeReport({ unit: { passed: unit.numPassedTests, failed: unit.numFailedTests, total: unit.numTotalTests } });

const r = readReport() as Record<string, { pass: boolean }[]>;
const line = (k: string) => `${k.padEnd(8)} ${(r[k] ?? []).filter((x) => x.pass).length}/${(r[k] ?? []).length}`;
console.log(['visual', 'parity', 'data'].map(line).join('\n'));
console.log(`unit     ${unit.numPassedTests}/${unit.numTotalTests}`);
