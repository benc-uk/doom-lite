import './files.mjs'
import { drawMap, drawCrosshair, drawLine } from './drawing.mjs'

let map = {}

const BASE_SIZE = 800

// Shared state between modules
export let state = {
  zoom: 1,
  gridSize: 8,
  newSector: null,
  cursorX: 0,
  cursorY: 0,
  mode: 'drawsector',
  movingVert: null,
}

window.setMode = function setMode(m) {
  state.mode = m
  drawCrosshair()
}

window.addEventListener('keydown', handleKey)

window.addEventListener('load', () => {
  const canvas = document.getElementById('canvas')
  canvas.width = BASE_SIZE * state.zoom
  canvas.height = BASE_SIZE * state.zoom

  const mapString = localStorage.getItem('map')
  if (!mapString) {
    window.newMap()
  } else {
    map = JSON.parse(mapString)
  }

  drawMap(map)

  canvas.addEventListener('click', handleClick)
  canvas.addEventListener('mousemove', handleMove)
  canvas.addEventListener('wheel', handleWheel)
})

//
//
//
function handleKey(e) {
  if (e.key === 's') {
    setMode('drawsector')
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
  if (e.key === ']') {
    if (state.gridSize >= 128) return
    state.gridSize *= 2
    drawMap(map)
  }
  if (e.key === '[') {
    if (state.gridSize <= 4) return
    state.gridSize /= 2
    drawMap(map)
  }
  if (e.key === 'Escape') {
    setMode('drawsector')
    state.newSector = null
  }
}

//
//
//
function handleClick(e) {
  e.preventDefault()
  const { x, y } = snap(e)

  if (state.mode === 'drawsector') {
    // Start a new sector
    if (state.newSector === null) {
      const sid = map.sectorInc++
      state.newSector = {
        id: sid,
        vertices: [],
      }
      state.newSector.vertices.push({ x, y })
      return
    }

    // Complete the sector
    if (state.newSector.vertices[0].x === x && state.newSector.vertices[0].y === y) {
      map.sectors[state.newSector.id] = {
        id: state.newSector.id,
        floor: 0,
        ceiling: 10,
      }

      // push lines & vertices into map
      for (let i = 0; i < state.newSector.vertices.length; i++) {
        const v1 = state.newSector.vertices[i]
        const v2 = state.newSector.vertices[(i + 1) % state.newSector.vertices.length]
        const v1Id = addVertex(v1.x, v1.y)
        const v2Id = addVertex(v2.x, v2.y)

        const lid = map.lineInc++
        map.lines[lid] = {
          id: lid,
          start: v1Id,
          end: v2Id,
          front: {
            sector: state.newSector.id,
            textureMiddle: 'STARG2',
          },
          back: {},
        }
      }

      // Reset
      state.newSector = null
      drawMap(map)
      return
    }

    // Otherwise, add a vertex to existing new sector
    state.newSector.vertices.push({ x, y })
  }

  if (state.mode === 'player') {
    map.playerStart.x = x
    map.playerStart.y = y
    drawMap(map)
  }

  // Move a vertex
  if (state.mode === 'move') {
    // Click to finish and "put down" moving vertex
    if (state.movingVert) {
      state.movingVert = null
      drawMap(map)
      return
    }

    // Otherwise, click to "pickup" a vertex
    let vId = findVertexId(x, y)
    if (vId) {
      state.movingVert = vId
    }
  }

  // TODO: Implement finer-grained deletion, currently only deletes sectors
  if (state.mode === 'delete') {
    let vId = findVertexId(x, y)
    if (!vId) return
    for (const [_, line] of Object.entries(map.lines)) {
      if (line.start == vId || line.end == vId) {
        deleteSector(line.front.sector)
        deleteSector(line.back.sector)

        drawMap(map)
      }
    }
  }

  return false
}

//
//
//
function handleWheel(e) {
  const ctx = document.getElementById('canvas').getContext('2d')
  e.preventDefault()
  if (e.deltaY > 0) {
    state.zoom -= 0.2
  } else {
    state.zoom += 0.2
  }
  state.zoom = state.zoom < 1.0 ? 1.0 : state.zoom
  state.zoom = state.zoom > 5.0 ? 5.0 : state.zoom

  canvas.width = BASE_SIZE * state.zoom
  canvas.height = BASE_SIZE * state.zoom
  ctx.scale(state.zoom, state.zoom)
  drawMap(map)
}

//
//
//
function handleMove(e) {
  drawMap(map)

  const { x, y } = snap(e)
  drawCrosshair()

  if (state.mode === 'drawsector' && state.newSector !== null) {
    const lastVertex = state.newSector.vertices[state.newSector.vertices.length - 1]
    drawLine(lastVertex.x, lastVertex.y, x, y, 'green')
  }

  if (state.mode === 'move' && state.movingVert) {
    map.vertices[state.movingVert] = { x, y }
  }
}

//
//
//
function snap(e) {
  const x = Math.floor(e.offsetX / state.gridSize) * state.gridSize
  const y = Math.floor(e.offsetY / state.gridSize) * state.gridSize

  state.cursorX = x
  state.cursorY = y

  return { x, y }
}

//
//
//
function findVertexId(x, y) {
  for (const [id, v] of Object.entries(map.vertices)) {
    if (v.x === x && v.y === y) return id
  }

  return null
}

//
//
//
function deleteSector(id) {
  if (!id) return

  console.log(`### Deleting sector ${id}`)
  for (const [_, line] of Object.entries(map.lines)) {
    if (line.front.sector === id || line.back.sector === id) {
      delete map.vertices[line.start]
      delete map.vertices[line.end]
      delete map.lines[line.id]
    }
  }

  delete map.sectors[id]
}

//
//
//
function addVertex(x, y) {
  const id = findVertexId(x, y)
  if (id) return id

  let newId = map.vertexInc++
  map.vertices[newId] = { x, y }
  return newId
}

//
//
//
window.newMap = function () {
  map = {
    name: 'Demo Map',
    playerStart: { x: 150, y: 60 },

    things: [],
    vertices: {},
    lines: {},
    sectors: {},

    lineInc: 0,
    sectorInc: 0,
    vertexInc: 0,
  }

  drawMap(map)
}
