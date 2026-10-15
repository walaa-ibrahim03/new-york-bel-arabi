/* eslint-disable @typescript-eslint/no-require-imports -- Node preload for database-free production builds. */
const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath } = require('node:url');
const isEnvFile = (value) => {
  try {
    const name = value instanceof URL ? fileURLToPath(value) : Buffer.isBuffer(value) ? value.toString() : value;
    return typeof name === 'string' && path.basename(name).startsWith('.env');
  } catch { return false; }
};
const denied = () => Object.assign(new Error('Environment files are excluded from this build check.'), { code: 'ENOENT' });
const exists = fs.existsSync;
fs.existsSync = function (file) {
  return isEnvFile(file) ? false : exists.call(this, file);
};
const readSync = fs.readFileSync;
fs.readFileSync = function (file, ...args) {
  if (isEnvFile(file)) throw denied();
  return readSync.call(this, file, ...args);
};
const read = fs.readFile;
fs.readFile = function (file, ...args) {
  if (isEnvFile(file)) {
    const callback = args[args.length - 1];
    if (typeof callback === 'function') { queueMicrotask(() => callback(denied())); return; }
    throw denied();
  }
  return read.call(this, file, ...args);
};
const readAsync = fs.promises.readFile;
fs.promises.readFile = async function (file, ...args) {
  if (isEnvFile(file)) throw denied();
  return readAsync.call(this, file, ...args);
};
