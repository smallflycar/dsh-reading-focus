import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {concatSources, renderClient, renderIndex, renderPreview} from './build-lib.mjs';

const here = file => new URL(file, import.meta.url);
const source = concatSources(
  await readFile(here('./src/style.js'), 'utf8'),
  await readFile(here('./src/gradient.js'), 'utf8'),
  await readFile(here('./src/engine.js'), 'utf8')
);
await mkdir(here('./lib/'), {recursive:true});
await writeFile(here('./lib/index.js'), renderIndex());
await writeFile(here('./lib/client.js'), renderClient(source));
const template = await readFile(here('./src/preview-template.html'), 'utf8');
await writeFile(here('./preview.html'), renderPreview(template, source));
console.log('built lib/index.js, lib/client.js and preview.html');
