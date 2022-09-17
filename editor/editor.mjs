const LINE_THICKNESS = 2
const DOTSIZE = 6

let map = {}
let mode = 'addwall'
let wallStartX = null
let wallStartY = null
let movingWall = null
let movingEnd = 0
let ctx
let canvas
let zoom = 1
let gridSize = 8

window.setMode = function setMode(m) {
  mode = m
}

window.addEventListener('keydown', function (e) {
  if (e.key === 'w') {
    setMode('addwall')
  }
  if (e.key === 'd') {
    setMode('delete')
  }
  if (e.key === 'p') {
    setMode('player')
  }
  if (e.key === 'm') {
    setMode('move')
  }
  if (e.key === 'f') {
    setMode('flip')
  }
  if (e.key === ']') {
    if (gridSize >= 128) return
    gridSize *= 2
    drawMap()
  }
  if (e.key === '[') {
    if (gridSize <= 4) return
    gridSize /= 2
    drawMap()
  }
})

window.addEventListener('load', () => {
  canvas = document.getElementById('canvas')
  ctx = canvas.getContext('2d')
  canvas.width = 1500 * zoom
  canvas.height = 1500 * zoom
  ctx.scale(zoom, zoom)
  ctx.lineWidth = LINE_THICKNESS / zoom

  const mapString = localStorage.getItem('map')
  if (!mapString) {
    window.newMap()
  } else {
    map = JSON.parse(mapString)
  }

  drawMap()

  //
  //
  //
  canvas.addEventListener('click', function (e) {
    e.preventDefault()
    const { x, y } = snap(e)

    if (mode === 'addwall') {
      if (wallStartX === null) {
        wallStartX = x
        wallStartY = y
      } else {
        addWall(wallStartX, wallStartY, x, y)
        wallStartX = null
        wallStartY = null
        drawMap()
        drawCrosshair(x, y)
      }
    }

    if (mode === 'player') {
      map.playerStart.x = x
      map.playerStart.y = y
      drawMap()
      drawCrosshair(x, y)
    }

    if (mode === 'delete') {
      const walls = map.sectors[0].walls
      for (let i = 0; i < walls.length; i++) {
        const wall = walls[i]
        if ((wall.x1 === x && wall.y1 === y) || (wall.x2 === x && wall.y2 === y)) {
          walls.splice(i, 1)
          drawMap()
          drawCrosshair(x, y)
          return
        }
      }
    }

    if (mode === 'move') {
      const walls = map.sectors[0].walls
      for (let i = 0; i < walls.length; i++) {
        const wall = walls[i]
        if (movingWall === null) {
          if (wall.x1 === x && wall.y1 === y) {
            movingWall = wall
            movingEnd = 1
            return
          }
          if (wall.x2 === x && wall.y2 === y) {
            movingWall = wall
            movingEnd = 2
            return
          }
        } else {
          movingWall = null
          movingEnd = 0
          return
        }
      }
    }

    if (mode === 'flip') {
      const walls = map.sectors[0].walls
      for (let i = 0; i < walls.length; i++) {
        const wall = walls[i]
        if ((wall.x1 === x && wall.y1 === y) || (wall.x2 === x && wall.y2 === y)) {
          const tempX = wall.x1
          const tempY = wall.y1
          wall.x1 = wall.x2
          wall.y1 = wall.y2
          wall.x2 = tempX
          wall.y2 = tempY

          drawMap()
          drawCrosshair(x, y)
          //return
        }
      }
    }

    return false
  })

  //
  //
  //
  canvas.addEventListener('mousemove', function (e) {
    drawMap()

    const { x, y } = snap(e) //e.offsetX * zoom, e.offsetY * zoom)
    drawCrosshair(x, y)

    if (x > canvas.width || y > canvas.height || x < 0 || y < 0) {
      wallStartX = null
      wallStartY = null
      return
    }

    if (mode === 'addwall') {
      if (wallStartX !== null) {
        ctx.strokeStyle = 'green'
        ctx.fillStyle = 'white'
        ctx.beginPath()
        ctx.moveTo(wallStartX, wallStartY)
        ctx.lineTo(x, y)
        ctx.stroke()

        ctx.fillRect(wallStartX - 1, wallStartY - 1, 3, 3)
      }
    }

    if (mode === 'move') {
      if (movingWall) {
        if (movingEnd === 1) {
          movingWall.x1 = x
          movingWall.y1 = y
        } else {
          movingWall.x2 = x
          movingWall.y2 = y
        }
      }
    }
  })

  //
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault()
    if (e.deltaY > 0) {
      zoom -= 0.1
    } else {
      zoom += 0.1
    }
    if (zoom < 1.0) {
      zoom = 1.0
    }
    canvas.width = 1500 * zoom
    canvas.height = 1500 * zoom
    ctx.scale(zoom, zoom)
    drawMap()
  })
})

function snap(e) {
  const x = e.offsetX
  const y = e.offsetY

  const xs = Math.floor(x / gridSize) * gridSize
  const ys = Math.floor(y / gridSize) * gridSize
  console.log(x, y, xs, ys)
  return { x: xs, y: ys }
}

function addWall(x1, y1, x2, y2) {
  if (x1 === x2 && y1 === y2) {
    return
  }
  const wall = { x1, y1, x2, y2, texture: 'STARGR2' }
  map.sectors[0].walls.push(wall)
}

function drawMap() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.lineWidth = 1 / zoom

  // draw grid
  ctx.strokeStyle = '#222'
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvas.height)
    ctx.stroke()
  }
  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvas.width, y)
    ctx.stroke()
  }

  ctx.lineWidth = LINE_THICKNESS / zoom

  if (map.playerStart.x !== null) {
    const img = document.getElementById('player')
    ctx.drawImage(img, map.playerStart.x - 8, map.playerStart.y - 8)
  }

  for (const wall of map.sectors[0].walls) {
    ctx.strokeStyle = 'white'
    ctx.fillStyle = 'white'
    ctx.beginPath()
    ctx.moveTo(wall.x1, wall.y1)
    ctx.lineTo(wall.x2, wall.y2)
    ctx.stroke()

    // draw line at right angle to show wall facing in middle
    const dx = wall.x2 - wall.x1
    const dy = wall.y2 - wall.y1
    const length = Math.sqrt(dx * dx + dy * dy)
    const midX = (wall.x1 + wall.x2) / 2
    const midY = (wall.y1 + wall.y2) / 2
    ctx.beginPath()
    ctx.moveTo(midX, midY)
    ctx.lineTo(midX - (dy / length) * 8, midY + (dx / length) * 8)
    ctx.strokeStyle = 'turquoise'
    ctx.stroke()

    drawDot(wall.x1, wall.y1)
    drawDot(wall.x2, wall.y2)

    // ctx.fillRect(wall.x1 - DOTSIZE / 2 / zoom, wall.y1 - DOTSIZE / 2 / zoom, DOTSIZE / zoom, DOTSIZE / zoom)
    // ctx.fillRect(wall.x2 - DOTSIZE / 2 / zoom, wall.y2 - DOTSIZE / 2 / zoom, DOTSIZE / zoom, DOTSIZE / zoom)
  }

  localStorage.setItem('map', JSON.stringify(map))
}

function drawDot(x, y, style = 'grey') {
  ctx.fillStyle = style
  ctx.fillRect(x - DOTSIZE / 2 / zoom, y - DOTSIZE / 2 / zoom, DOTSIZE / zoom, DOTSIZE / zoom)
}

function drawCrosshair(x, y) {
  switch (mode) {
    case 'addwall':
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
    case 'flip':
      ctx.strokeStyle = 'orange'
      break
    default:
      ctx.strokeStyle = 'white'
  }

  ctx.beginPath()
  ctx.moveTo(x - 5, y)
  ctx.lineTo(x + 5, y)
  ctx.moveTo(x, y - 5)
  ctx.lineTo(x, y + 5)
  ctx.stroke()
}

window.newMap = function () {
  map = {
    name: 'Demo Map',
    playerStart: { x: 150, y: 60 },

    sectors: [
      {
        floorHeight: 0,
        ceilingHeight: 10,
        walls: [],
      },
    ],
  }
  drawMap()
}

window.exportMap = function () {
  const mapString = JSON.stringify(map, null, 2)
  const blob = new Blob([mapString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'map.json'
  a.click()
}

window.importMap = function () {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = function (e) {
    const file = e.target.files[0]
    const reader = new FileReader()
    reader.onload = function (e) {
      const text = e.target.result
      map = JSON.parse(text)
      console.log(map)
      drawMap()
    }
    reader.readAsText(file)
  }
  input.click()
}
