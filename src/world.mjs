// ===== world.mjs ===============================================================
// Parsing the map and other data structures into geometry that OpenGL can render
// Ben Coleman, 2022
// ================================================================================

import { buildFlat, buildWall } from './geometry.mjs'

import * as twgl from '../lib/twgl/dist/4.x/twgl-full.module.js'
import * as Cannon from '../lib/cannon-es/dist/cannon-es.js'
import { mat4 } from '../lib/gl-matrix/esm/index.js'

// Readability help
const X = 0
const Y = 1

const WALL_MASS = 100000

//
// Main function to build all world geometry, physics and things
//
export async function buildWorld(map, gl, templates, textureCache) {
  const worldObjs = []
  const thingInstances = []

  let thingCount = 0
  // First pass, create all thing instances
  for (const thing of map.things) {
    const template = templates[thing.type]
    if (!template) {
      console.warn(`🔥🔥🔥 WARNING! No template for thing type ${thing.type}`)
      continue
    }
    thingInstances.push({
      id: ++thingCount,
      template: template,
      location: [thing.x, template.yOffset + (thing.yOffset || 0), thing.y],
      animTime: Math.random() * template.animSpeed,
      textureIndex: Math.floor(Math.random() * template.textures.length),
    })
  }

  for (const [sid, sector] of Object.entries(map.sectors)) {
    // Build polygon for this sector - this code is a total horror show, but seems to work
    const polyFlat = []
    for (const lid of sector.lines) {
      const line = map.lines[lid]
      let v = map.vertices[line.end]

      if (line.back.sector == sid) {
        v = map.vertices[line.start]
      }

      polyFlat.push(v[X], v[Y])
    }

    // Mutate sector adding the poly, we need it later for player-sector calc
    sector.poly = polyFlat

    for (const lid of sector.lines) {
      const line = map.lines[lid]
      const frontSec = map.sectors[line.front.sector]
      const backSec = map.sectors[line.back.sector]
      const v1 = map.vertices[line.start]
      const v2 = map.vertices[line.end]

      const uniforms = {}
      if (sector.brightness) {
        uniforms.u_brightness = sector.brightness
      }

      // Weirdly impassable is now implicit where there are no textures
      const _impassable = line.hasOwnProperty('impassable') ? line.impassable : true
      // Not used currently
      const _doubleSided = line.hasOwnProperty('doubleSided') ? line.doubleSided : false

      // FRONT
      if (frontSec) {
        uniforms.u_xOffset = line.front.xOffset ? line.front.xOffset : 0
        uniforms.u_yOffset = line.front.yOffset ? line.front.yOffset : 0
        if (line.front.texMid) {
          const tex = textureCache[line.front.texMid]
          const { bufferInfo, shape } = buildWall(gl, v1[X], v1[Y], v2[X], v2[Y], frontSec.floor, frontSec.ceiling, tex.width / tex.height, false)
          const body = new Cannon.Body({ mass: WALL_MASS, shape })
          worldObjs.push({ id: lid, type: 'line', bufferInfo, texture: tex.texture, uniforms, body })
        }
        if (line.front.texBot) {
          const tex = textureCache[line.front.texBot]
          const { bufferInfo, shape } = buildWall(gl, v1[X], v1[Y], v2[X], v2[Y], backSec.floor, frontSec.floor, tex.width / tex.height, true)
          const body = new Cannon.Body({ mass: WALL_MASS, shape })
          worldObjs.push({ id: lid, type: 'line', bufferInfo, texture: tex.texture, uniforms, body })
        }
        if (line.front.texTop) {
          const tex = textureCache[line.front.texTop]
          const { bufferInfo, shape } = buildWall(gl, v1[X], v1[Y], v2[X], v2[Y], frontSec.ceiling, backSec.ceiling, tex.width / tex.height, true)
          const body = new Cannon.Body({ mass: WALL_MASS, shape })
          worldObjs.push({ id: lid, type: 'line', bufferInfo, texture: tex.texture, uniforms, body })
        }
      }

      // BACK
      if (backSec) {
        uniforms.u_xOffset = line.back.xOffset ? line.back.xOffset : 0
        uniforms.u_yOffset = line.back.yOffset ? line.back.yOffset : 0
        if (line.back.texMid) {
          const tex = textureCache[line.back.texMid]
          const { bufferInfo, shape } = buildWall(gl, v1[X], v1[Y], v2[X], v2[Y], backSec.floor, backSec.ceiling, tex.width / tex.height, true)
          const body = new Cannon.Body({ mass: WALL_MASS, shape })
          worldObjs.push({ id: lid, type: 'line', bufferInfo, texture: tex.texture, uniforms, body })
        }
        if (line.back.texBot) {
          const tex = textureCache[line.back.texBot]
          const { bufferInfo, shape } = buildWall(gl, v1[X], v1[Y], v2[X], v2[Y], backSec.floor, frontSec.floor, tex.width / tex.height, true)
          const body = new Cannon.Body({ mass: WALL_MASS, shape })
          worldObjs.push({ id: lid, type: 'line', bufferInfo, texture: tex.texture, uniforms, body })
        }
        if (line.back.texTop) {
          const tex = textureCache[line.back.texTop]
          const { bufferInfo, shape } = buildWall(gl, v1[X], v1[Y], v2[X], v2[Y], frontSec.ceiling, backSec.ceiling, tex.width / tex.height, true)
          const body = new Cannon.Body({ mass: WALL_MASS, shape })
          worldObjs.push({ id: lid, type: 'line', bufferInfo, texture: tex.texture, uniforms, body })
        }
      }
    }

    let flatId = 0
    // Floors...
    let uniforms = {}
    if (sector.brightness) {
      uniforms.u_brightness = sector.brightness
    }
    if (sector.brightFloor) {
      uniforms.u_brightness = sector.brightFloor
    }

    // const floorFlat = buildFlat(gl, polyFlat, floorCeilIndices, sector.floor)
    const floorFlat = buildFlat(gl, sector, true)
    worldObjs.push({
      id: flatId++,
      type: 'floor',
      bufferInfo: floorFlat,
      texture: textureCache[sector.texFloor],
      uniforms,
    })

    // Ceilings...
    uniforms = {}
    if (sector.brightness) {
      uniforms.u_brightness = sector.brightness
    }
    if (sector.brightCeil) {
      uniforms.u_brightness = sector.brightCeil
    }

    if (sector.ceiling !== false || sector.ceiling == undefined) {
      const ceilFlat = buildFlat(gl, sector, false)
      worldObjs.push({
        id: flatId++,
        type: 'ceiling',
        bufferInfo: ceilFlat,
        texture: textureCache[sector.texCeil],
        uniforms,
      })
    }
  }

  return { worldObjs, thingInstances, playerStart: { x: map.playerStart.x, y: 0, z: map.playerStart.y } }
}

//
// Sets up all the thing templates, used for instancing things (sprites)
//
export async function buildTemplates(gl, textureCache, thingDB) {
  const templates = {}
  for (const dbEntry of thingDB) {
    const size = dbEntry.size
    const spriteTransform = mat4.create()
    mat4.rotateX(spriteTransform, spriteTransform, Math.PI / 2)
    const buffers = twgl.primitives.createPlaneBufferInfo(gl, size, size, 1, 1, spriteTransform)

    const textures = []
    for (const textureName of dbEntry.textures) {
      textures.push(textureCache[textureName].texture)
    }

    templates[dbEntry.name] = {
      name: dbEntry.name,
      light: dbEntry.light ? dbEntry.light : null,
      buffers,
      textures,
      animSpeed: dbEntry.animSpeed,
      yOffset: size / 2,
    }
  }

  return templates
}
