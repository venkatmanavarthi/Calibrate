import icongen from 'icon-gen'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const svg = path.join(root, 'assets/icon.svg')

// macOS .icns
await icongen(svg, path.join(root, 'assets/icons/mac'), {
  report: true,
  icns: { name: 'icon', sizes: [16, 32, 64, 128, 256, 512, 1024] }
})

// Windows .ico
await icongen(svg, path.join(root, 'assets/icons/win'), {
  report: true,
  ico: { name: 'icon', sizes: [16, 24, 32, 48, 64, 128, 256] }
})

// Linux PNGs (via favicon mode — generates icon{size}.png files)
await icongen(svg, path.join(root, 'assets/icons/linux'), {
  report: true,
  favicon: { name: 'icon', pngSizes: [16, 32, 64, 128, 256, 512, 1024], icoSizes: [16, 32] }
})

console.log('\nAll icons generated.')
