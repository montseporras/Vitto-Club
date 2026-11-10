// Vuelve a armar el archivo único del prototipo a partir de docs/prototipo/v2.
// Uso: node pack.mjs "<archivo unico.html>" <carpeta v2>
import fs from 'fs'; import zlib from 'zlib'; import path from 'path';
const [,, single, dir] = process.argv;
const lines = fs.readFileSync(single, 'utf8').split('\n');
const idx = (t) => lines.findIndex((l) => l.includes('<script type="__bundler/' + t + '">')) + 1;
const manifest = JSON.parse(lines[idx('manifest')]);
const ext = JSON.parse(lines[idx('ext_resources')]);
const gz = (buf) => ({ compressed: true, data: zlib.gzipSync(buf, { level: 9 }).toString('base64') });
const rd = (f) => fs.readFileSync(path.join(dir, f));
const comps = JSON.parse(fs.readFileSync(path.join(dir, '_componentes.json'), 'utf8'));
for (const c of comps.componentes) {
  const id = './' + c.nombre + '.dc.html';
  let e = ext.find((x) => x.id === id);
  if (!e) { e = { id, uuid: c.uuid }; ext.push(e); }
  manifest[e.uuid] = { mime: 'text/html', ...gz(rd(c.nombre + '.html')) };
}
for (const j of comps.datos) manifest[j.uuid] = { mime: 'application/javascript', ...gz(rd(j.archivo)) };
const template = fs.readFileSync(path.join(dir, 'pagina-principal.html'), 'utf8').replace(/\r\n/g, '\n');
const BS = String.fromCharCode(92);
const CLOSE = '<' + '/script>';
lines[idx('manifest')] = JSON.stringify(manifest);
lines[idx('ext_resources')] = JSON.stringify(ext);
lines[idx('template')] = JSON.stringify(template).split(CLOSE).join('<' + BS + 'u002Fscript>');
fs.writeFileSync(single, lines.join('\n'));
console.log('ok', comps.componentes.length, 'componentes,', comps.datos.length, 'datos');
