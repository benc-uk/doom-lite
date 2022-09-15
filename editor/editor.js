// const walls = []
// const playerStart = { x: null, y: null }

const GRID_SIZE = 5

let map = {}
let mode = 'addwall'
let wallStartX = null
let wallStartY = null
let ctx
let canvas

window.setMode = function setMode(m) {
  mode = m
}

window.addEventListener('load', () => {
  canvas = document.getElementById('canvas')
  ctx = canvas.getContext('2d')

  const mapString = localStorage.getItem('map')
  if (!mapString) {
    newMap()
  } else {
    map = JSON.parse(mapString)
  }

  //
  //
  //
  canvas.addEventListener('click', function (e) {
    e.preventDefault()
    const { x, y } = snap(e.offsetX, e.offsetY)

    if (mode === 'addwall') {
      if (wallStartX === null) {
        wallStartX = x
        wallStartY = y
      } else {
        addWall(wallStartX, wallStartY, x, y)
        wallStartX = null
        wallStartY = null
        redrawMap()
        drawCrosshair(x, y)
      }
    }

    if (mode === 'player') {
      map.playerStart.x = x
      map.playerStart.y = y
      redrawMap()
      drawCrosshair(x, y)
    }

    if (mode === 'delete') {
      const walls = map.sectors[0].walls
      for (let i = 0; i < walls.length; i++) {
        const wall = walls[i]
        if ((wall.x1 === x && wall.y1 === y) || (wall.x2 === x && wall.y2 === y)) {
          walls.splice(i, 1)
          redrawMap()
          drawCrosshair(x, y)
          return
        }
      }
    }

    return false
  })

  //
  //
  //
  canvas.addEventListener('mousemove', function (e) {
    redrawMap()

    const { x, y } = snap(e.offsetX, e.offsetY)
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
  })
})

function snap(x, y) {
  const xs = Math.floor(x / GRID_SIZE) * GRID_SIZE
  const ys = Math.floor(y / GRID_SIZE) * GRID_SIZE
  return { x: xs, y: ys }
}

function addWall(x1, y1, x2, y2) {
  if (x1 === x2 && y1 === y2) {
    return
  }
  const wall = { x1, y1, x2, y2, texture: 'STARGR2' }
  map.sectors[0].walls.push(wall)
}

function redrawMap() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
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

    ctx.fillRect(wall.x1 - 1, wall.y1 - 1, 3, 3)
    ctx.fillRect(wall.x2 - 1, wall.y2 - 1, 3, 3)
  }

  localStorage.setItem('map', JSON.stringify(map))
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
    default:
      ctx.strokeStyle = 'white'
  }

  ctx.beginPath()
  ctx.moveTo(x - GRID_SIZE * 2, y)
  ctx.lineTo(x + GRID_SIZE * 2, y)
  ctx.moveTo(x, y - GRID_SIZE * 2)
  ctx.lineTo(x, y + GRID_SIZE * 2)
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
  redrawMap()
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
      redrawMap()
    }
    reader.readAsText(file)
  }
  input.click()
}
