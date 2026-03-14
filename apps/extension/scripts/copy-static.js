import { cpSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = dirname(__dirname);
const dist = join(root, 'dist');

mkdirSync(dist, { recursive: true });

cpSync(join(root, 'static'), dist, {
  recursive: true,
  force: true,
});

// Strip "export {};" from all compiled JS files — Chrome extension scripts
// (background, content, popup) don't all support ES modules cleanly.
for (const file of readdirSync(dist)) {
  if (!file.endsWith('.js')) continue;
  try {
    const content = readFileSync(join(dist, file), 'utf-8');
    writeFileSync(join(dist, file), content.replace(/\nexport \{\};\s*$/, '\n'));
  } catch {
    // ignore
  }
}

console.log('Static files copied to dist/');
