#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { open, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const split = args.find(value => value.startsWith('--split='))?.slice(8);
if (!['dev', 'holdout'].includes(split)) {
  console.error('Specify exactly one split with --split=dev or --split=holdout.');
  process.exit(2);
}
const lockPath = resolve(root, 'eval', 'results', `.${split}.lock`);
let lock;
try {
  lock = await open(lockPath, 'wx');
  await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }) + '\n');
} catch (error) {
  if (error.code === 'EEXIST') {
    console.error(`Another ${split} run has a lock. Inspect it before retrying, and never overlap formal evaluations.`);
    process.exit(1);
  }
  throw error;
}
try {
  const child = spawn(process.execPath, ['--import', 'tsx', resolve(root, 'scripts', 'evaluate.ts'), ...args], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  const code = await new Promise((done, fail) => {
    child.on('close', done);
    child.on('error', fail);
  });
  process.exitCode = code ?? 1;
} finally {
  await lock.close();
  await unlink(lockPath);
}
