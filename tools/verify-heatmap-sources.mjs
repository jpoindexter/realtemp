#!/usr/bin/env node
import { readFileSync } from 'node:fs'

const sources = [
  {
    label: 'PNOA-LiDAR 3rd coverage status',
    url: 'https://pnoa.ign.es/pnoa-lidar/tercera-cobertura',
    mustContain: ['TERCERA COBERTURA', '5 puntos'],
  },
  {
    label: 'PNOA-LiDAR downloadable products',
    url: 'https://pnoa.ign.es/pnoa-lidar/productos-a-descarga',
    mustContain: ['LIDAR 3', '5 puntos/m2'],
  },
  {
    label: 'CNIG LiDAR 3rd coverage download center',
    url: 'https://centrodedescargas.cnig.es/CentroDescargas/lidar-tercera-cobertura',
    mustContain: ['LIDAR', '3'],
  },
  {
    label: 'Digital Surface Model of Spain metadata',
    url: 'https://datos.gob.es/en/catalogo/e00125901-spaignmds',
    mustContain: ['Digital Surface Model of Spain', 'building and vegetation'],
  },
  {
    label: 'CNIG MDS05 download series',
    url: 'https://centrodedescargas.cnig.es/CentroDescargas/busquedaSerie.do?codSerie=MDS05',
    mustContain: ['Centro de Descargas del CNIG'],
  },
]

const doc = readFileSync('docs/heatmap-prd.md', 'utf8')
let failures = 0

function fail(label, detail) {
  failures += 1
  console.error(`not ready: ${label}${detail ? ` - ${detail}` : ''}`)
}

console.log('L4b heatmap source check')
console.log('This verifies source availability for the recommended PNOA-LiDAR path; it does not approve or build the pipeline.')

for (const source of sources) {
  if (!doc.includes(source.url)) fail(`${source.label} documented`, `${source.url} missing from docs/heatmap-prd.md`)

  try {
    const response = await fetch(source.url, { redirect: 'follow', signal: AbortSignal.timeout(10_000) })
    const text = await response.text()
    if (!response.ok) {
      fail(`${source.label} reachable`, `HTTP ${response.status} from ${response.url}`)
      continue
    }
    const missingTerms = source.mustContain.filter((term) => !text.toLowerCase().includes(term.toLowerCase()))
    if (missingTerms.length) {
      fail(`${source.label} expected content`, `missing ${missingTerms.join(', ')}`)
      continue
    }
    console.log(`ok: ${source.label} - ${response.url}`)
  } catch (error) {
    fail(`${source.label} reachable`, error.message)
  }
}

for (const required of ['Go/no-go', 'Precomputed shade tiles', 'Ruzafa', 'photo comparison']) {
  if (!doc.includes(required)) fail('heatmap decision PRD complete', `missing "${required}"`)
}

if (failures) {
  console.error(`L4b not ready: ${failures} source/decision check${failures === 1 ? '' : 's'} failed.`)
  process.exit(1)
}

console.log('L4b source evidence ready: official PNOA/CNIG/datos.gob pages are reachable and the PRD has a decision gate. Jason go/no-go is still required before code.')
