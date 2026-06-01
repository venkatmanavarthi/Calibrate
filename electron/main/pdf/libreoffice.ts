import { spawnSync } from 'child_process'
import path from 'path'

function findSoffice(): string {
  const candidates = [
    'soffice',
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    '/usr/bin/soffice',
    '/usr/local/bin/soffice',
  ]
  for (const bin of candidates) {
    const result = spawnSync(bin, ['--version'], { encoding: 'utf8' })
    if (result.status === 0) return bin
  }
  throw new Error('LibreOffice not found. Install it from https://www.libreoffice.org and try again.')
}

export function convertDocxToPdf(docxPath: string, outDir: string): string {
  const soffice = findSoffice()
  const result = spawnSync(soffice, ['--headless', '--convert-to', 'pdf', docxPath, '--outdir', outDir], {
    encoding: 'utf8',
    timeout: 30000,
  })
  if (result.status !== 0) {
    throw new Error(`LibreOffice conversion failed: ${result.stderr || result.stdout}`)
  }
  const base = path.basename(docxPath, '.docx')
  return path.join(outDir, `${base}.pdf`)
}
