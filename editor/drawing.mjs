import { state } from './editor.mjs'

const LINE_THICKNESS = 2.5
const DOTSIZE = 6

//
//
//
export function drawMap(map) {
  const canvas = document.getElementById('canvas')
  const ctx = canvas.getContext('2d')

  localStorage.setItem('map', JSON.stringify(map))
  document.getElementById('code').value = JSON.stringify(map, null, 2)

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // draw grid
  ctx.strokeStyle = '#222'
  ctx.lineWidth = 1 / state.zoom
  for (let x = 0; x < canvas.width; x += state.gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvas.height)
    ctx.stroke()
  }
  for (let y = 0; y < canvas.height; y += state.gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvas.width, y)
    ctx.stroke()
  }

  ctx.lineWidth = LINE_THICKNESS / state.zoom
  drawCrosshair()

  // fill sectors
  const colorList = ['rgba(255, 0, 0, 0.2)', 'rgba(0, 255, 0, 0.2)', 'rgba(0, 0, 255, 0.2)', 'rgba(255, 255, 0, 0.2)', 'rgba(0, 255, 255, 0.2)']
  for (const [sid, sector] of Object.entries(map.sectors)) {
    ctx.fillStyle = colorList[sector.id % colorList.length]
    ctx.beginPath()
    let lineCount = 0
    for (const lineId of sector.lines) {
      const line = map.lines[lineId]
      if (lineCount === 0) {
        ctx.moveTo(map.vertices[line.start].x, map.vertices[line.start].y)
      }
      if (line.back.sector === sector.id) {
        ctx.lineTo(map.vertices[line.start].x, map.vertices[line.end].y)
      } else {
        ctx.lineTo(map.vertices[line.end].x, map.vertices[line.end].y)
      }

      lineCount++
    }
    ctx.closePath()
    ctx.fill()
  }

  if (map.playerStart.x !== null) {
    const img = document.getElementById('player')
    ctx.drawImage(img, map.playerStart.x - 8, map.playerStart.y - 8)
  }

  // draw lines
  for (const [_, line] of Object.entries(map.lines)) {
    const v1 = map.vertices[line.start]
    const v2 = map.vertices[line.end]
    if (!v1 || !v2) continue
    drawLine(v1.x, v1.y, v2.x, v2.y)
    drawDot(v1.x, v1.y)
    drawDot(v2.x, v2.y)

    // draw line id
    ctx.fillStyle = 'white'
    ctx.font = `${16 / state.zoom}px monospace`
    ctx.fillText(line.id, (v1.x + v2.x) / 2, (v1.y + v2.y) / 2)
  }

  // draw any new sector in progress
  if (state.newSector !== null) {
    for (let i = 0; i < state.newSector.vertices.length - 1; i++) {
      const v1 = state.newSector.vertices[i]
      const v2 = state.newSector.vertices[(i + 1) % state.newSector.vertices.length]
      drawLine(v1.x, v1.y, v2.x, v2.y, 'green')
    }
  }
}

function drawDot(x, y, style = 'grey') {
  const ctx = document.getElementById('canvas').getContext('2d')

  ctx.fillStyle = style
  ctx.fillRect(x - DOTSIZE / 2 / state.zoom, y - DOTSIZE / 2 / state.zoom, DOTSIZE / state.zoom, DOTSIZE / state.zoom)
}

export function drawCrosshair() {
  const ctx = document.getElementById('canvas').getContext('2d')

  switch (state.mode) {
    case 'drawsector':
      ctx.strokeStyle = 'turquoise'
      break
    case 'player':
      ctx.strokeStyle = 'purple'
      break
    case 'delete':
      ctx.strokeStyle = 'red'
      break
    case 'move':
      ctx.strokeStyle = 'yellow'
      break
    default:
      ctx.strokeStyle = 'white'
  }

  ctx.beginPath()
  ctx.moveTo(state.cursorX - 5, state.cursorY)
  ctx.lineTo(state.cursorX + 5, state.cursorY)
  ctx.moveTo(state.cursorX, state.cursorY - 5)
  ctx.lineTo(state.cursorX, state.cursorY + 5)
  ctx.stroke()

  document.getElementById('info').innerText = `${state.cursorX}, ${state.cursorY}`
}

//
//
//
export function drawLine(x1, y1, x2, y2, style = 'white') {
  const ctx = document.getElementById('canvas').getContext('2d')

  ctx.strokeStyle = style
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}
