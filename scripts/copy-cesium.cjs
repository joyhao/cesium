/* Copies Cesium's runtime files into public/cesium for Vite dev and production builds. */
const fs = require('fs')
const path = require('path')

const source = path.resolve(__dirname, '../node_modules/cesium/Build/Cesium')
const target = path.resolve(__dirname, '../public/cesium')

function copyDirectory(from, to) {
  fs.mkdirSync(to, { recursive: true })
  fs.readdirSync(from, { withFileTypes: true }).forEach((entry) => {
    const fromPath = path.join(from, entry.name)
    const toPath = path.join(to, entry.name)
    if (entry.isDirectory()) copyDirectory(fromPath, toPath)
    else fs.copyFileSync(fromPath, toPath)
  })
}

if (!fs.existsSync(source)) {
  console.error('Cesium is not installed yet. Run npm install first.')
  process.exit(1)
}
copyDirectory(source, target)
console.log('Cesium runtime files copied to public/cesium')
