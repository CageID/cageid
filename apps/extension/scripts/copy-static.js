import { cpSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = dirname(__dirname);

mkdirSync(`${root}/dist`, { recursive: true });

cpSync(`${root}/static`, `${root}/dist`, {
  recursive: true,
  force: true,
});

console.log('Static files copied to dist/');
