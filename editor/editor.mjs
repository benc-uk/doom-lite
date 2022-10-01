import './files.mjs'
import { drawMap, drawCrosshair, drawLine } from './drawing.mjs'
import JSON5 from '../../lib/json5/dist/index.min.mjs'

let map = {}

const BASE_SIZE = 800
const FORCE_LOAD_MAP = true
const DEMO_MAP = '../levels/demo.json5'

// Shared state between modules
export let state = {
  zoom: 1,
  gridSize: 4,
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

window.addEventListener('load', async () => {
  const canvas = document.getElementById('canvas')
  canvas.width = BASE_SIZE * state.zoom
  canvas.height = BASE_SIZE * state.zoom

  let mapData = localStorage.getItem('map')
  if (FORCE_LOAD_MAP) mapData = null
  if (!mapData) {
    console.log(`💾 Loading map from ${DEMO_MAP} not local storage`)
    const mapResp = await fetch(DEMO_MAP)
    if (!mapResp.ok) {
      throw new Error(`Unable to load ${DEMO_MAP} ${mapResp.status}`)
    }
    mapData = await mapResp.text()
  }

  map = JSON5.parse(mapData)

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
    if (state.gridSize <= 2) return
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
        vertices: [{ x, y }],
      }
      return
    }

    // Complete the sector
    if (state.newSector.vertices[0].x === x && state.newSector.vertices[0].y === y) {
      // push lines & vertices into map
      const lineIds = []
      for (let i = 0; i < state.newSector.vertices.length - 1; i++) {
        const v1 = state.newSector.vertices[i]
        const v2 = state.newSector.vertices[i + 1]
        const v1Id = addVertex(v1.x, v1.y)
        const v2Id = addVertex(v2.x, v2.y)
        lineIds.push(addLine(v1Id, v2Id, state.newSector.id))
      }
      // add last line
      const v1 = state.newSector.vertices[state.newSector.vertices.length - 1]
      const v2 = state.newSector.vertices[0]
      const v1Id = addVertex(v1.x, v1.y)
      const v2Id = addVertex(v2.x, v2.y)

      lineIds.push(addLine(v1Id, v2Id, state.newSector.id))

      map.sectors[state.newSector.id] = {
        id: state.newSector.id,
        floor: 0,
        ceiling: 10,
        lines: lineIds,
        texFloor: 'FLOOR4_8',
        texCeil: 'FLAT1_2',
      }

      // Reset
      state.newSector = null
      drawMap(map)
      return
    }

    // Otherwise, add a vertex to existing new sector
    state.newSector.vertices.push({ x, y })
    console.log(state.newSector.vertices)
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

function addLine(v1Id, v2Id, sectorId) {
  const lid = map.lineInc++

  map.lines[lid] = {
    id: lid,
    start: v1Id,
    end: v2Id,
    front: {
      sector: sectorId,
      texMid: 'STARG2',
    },
    back: {},
  }

  return lid
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
    map.vertices[state.movingVert] = [x, y]
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
  for (const [vId, v] of Object.entries(map.vertices)) {
    if (v[0] == x && v[1] == y) {
      console.log(`### Vertex already exists at ${x}, ${y}`)
      return parseInt(vId)
    }
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
  console.log(`### Adding vertex at ${x}, ${y}`)
  const id = findVertexId(x, y)
  if (id != null) {
    return id
  }

  let newId = map.vertexInc++
  map.vertices[newId] = [x, y]
  return newId
}

//
//
//
window.newMap = function () {
  map = {
    name: 'Demo Map',
    playerStart: { x: 150, y: 60, angle: 0 },

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

window.updateCode = function (e) {
  //localStorage.setItem('map', e.target.value)
  map = JSON.parse(e.target.value)
  drawMap(map)
  drawCrosshair()
}
