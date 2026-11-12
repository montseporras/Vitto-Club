// Actualiza esta carpeta (docs/prototipo/v2) con el contenido del archivo único exportado de
// Claude Design. Es lo contrario de _empaquetar.mjs.
//
// Uso (desde la raíz del repo):
//   node docs/prototipo/v2/_desempaquetar.mjs "<archivo unico.html>" docs/prototipo/v2 --dry   (solo muestra qué cambiaría)
//   node docs/prototipo/v2/_desempaquetar.mjs "<archivo unico.html>" docs/prototipo/v2         (escribe)
//
// - Solo escribe los archivos que cambiaron y conserva sus saltos de línea (CRLF).
// - Solo actualiza los componentes y datos listados en _componentes.json. Si el export trae uno que no
//   está en la lista, lo avisa y no lo agrega (así no vuelve a aparecer, por ejemplo, ConfigPromociones,
//   que se eliminó el 11/11). Para sumar un componente nuevo, agregalo antes a _componentes.json.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const [, , single, dir, flag] = process.argv
if (!single || !dir) {
  console.error('Uso: node _desempaquetar.mjs "<archivo unico.html>" <carpeta v2> [--dry]')
  process.exit(1)
}
const dry = flag === '--dry'
const lines = fs.readFileSync(single, 'utf8').split('\n')
const idx = (t) => lines.findIndex((l) => l.includes('<script type="__bundler/' + t + '">')) + 1
const manifest = JSON.parse(lines[idx('manifest')])
const ext = JSON.parse(lines[idx('ext_resources')])
const template = JSON.parse(lines[idx('template')])
const comps = JSON.parse(fs.readFileSync(path.join(dir, '_componentes.json'), 'utf8'))

const read = (entry) => {
  const buf = Buffer.from(entry.data, 'base64')
  return (entry.compressed ? zlib.gunzipSync(buf) : buf).toString('utf8')
}
const norm = (s) => s.split('\r\n').join('\n')

// nombre de archivo en esta carpeta -> contenido nuevo
const nuevos = new Map()
for (const c of comps.componentes) {
  const e = ext.find((x) => x.id === './' + c.nombre + '.dc.html')
  if (e && manifest[e.uuid]) nuevos.set(c.nombre + '.html', read(manifest[e.uuid]))
  else console.log('  FALTA en el export:', c.nombre)
}
for (const d of comps.datos) {
  if (manifest[d.uuid]) nuevos.set(d.archivo, read(manifest[d.uuid]))
  else console.log('  FALTA en el export:', d.archivo)
}
nuevos.set('pagina-principal.html', template)

let cambiados = 0
for (const [nombre, contenido] of nuevos) {
  const destino = path.join(dir, nombre)
  const actual = fs.existsSync(destino) ? fs.readFileSync(destino, 'utf8') : null
  const crlf = actual === null ? true : actual.includes('\r\n')
  if (actual !== null && norm(actual) === norm(contenido)) {
    console.log('  igual      ', nombre)
    continue
  }
  const nuevo = norm(contenido)
  if (!dry) fs.writeFileSync(destino, crlf ? nuevo.split('\n').join('\r\n') : nuevo)
  console.log(dry ? '  cambiaría  ' : '  ACTUALIZADO', nombre)
  cambiados += 1
}

// Componentes del export que no están en _componentes.json: no se agregan
const conocidos = new Set(comps.componentes.map((c) => './' + c.nombre + '.dc.html'))
for (const e of ext) {
  if (/^\.\/[\w-]+\.dc\.html$/.test(e.id) && !conocidos.has(e.id)) {
    console.log('  NO AGREGADO (no está en _componentes.json):', e.id.replace(/^\.\//, '').replace('.dc.html', '.html'))
  }
}
console.log(dry ? 'En seco:' : 'Listo:', cambiados, 'archivo(s)', dry ? 'cambiarían' : 'actualizados')
