import { WAD } from '../src/wad.mjs'

const SCALE = 0.2

window.onload = async () => {
  const wad = new WAD()
  await wad.load('../levels/DOOM1.WAD')
  const map = wad.parseMap('E1M2')

  const ctx = document.getElementById('canvas').getContext('2d')
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  const W2 = W / 2
  const H2 = H / 2 - 150

  // draw thicker lines
  ctx.lineWidth = 1.5
  // draw all linedefs
  ctx.strokeStyle = '#0044ff'
  for (const linedef of map.lineDefs) {
    const startVert = map.verts[linedef.startVert]
    const endVert = map.verts[linedef.endVert]
    ctx.beginPath()
    ctx.moveTo(W2 + startVert[0] * SCALE, H - (H2 + startVert[1] * SCALE))
    ctx.lineTo(W2 + endVert[0] * SCALE, H - (H2 + endVert[1] * SCALE))
    ctx.stroke()
  }

  // draw all verts
  ctx.fillStyle = '#008822'
  for (const vert of map.verts) {
    ctx.fillRect(W2 + vert[0] * SCALE - 1, H - (H2 + vert[1] * SCALE - 1), 3, 3)
  }

  ctx.lineWidth = 1
  // draw all subSectors
  ctx.strokeStyle = 'rgba(200, 0, 0, 0.5)'
  for (const ssector of map.subSectors) {
    // draw lines between all segs
    const firstSeg = map.segs[ssector.firstSeg]
    let startVert = map.verts[firstSeg.startVert]
    for (let i = 0; i < ssector.numSegs; i++) {
      const seg = map.segs[ssector.firstSeg + i]
      const endVert = map.verts[seg.endVert]
      ctx.beginPath()
      ctx.moveTo(W2 + startVert[0] * SCALE, H - (H2 + startVert[1] * SCALE))
      ctx.lineTo(W2 + endVert[0] * SCALE, H - (H2 + endVert[1] * SCALE))
      ctx.stroke()
    }
  }
}
