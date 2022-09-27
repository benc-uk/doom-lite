import { buildFlatNew, buildWall } from './geometry.mjs'

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
export async function parseMap(map, gl, templates) {
  const worldObjs = []
  const thingInstances = []
  const textureRequestMap = {}

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

  // Build a hash map of all line/wall textures we need
  // TODO: Maybe remove this extra pass of all the map lines?
  for (const [_, line] of Object.entries(map.lines)) {
    if (line.front.texMid) textureRequestMap[line.front.texMid] = { src: `textures/${line.front.texMid}.png` }
    if (line.front.texBot) textureRequestMap[line.front.texBot] = { src: `textures/${line.front.texBot}.png` }
    if (line.front.texTop) textureRequestMap[line.front.texTop] = { src: `textures/${line.front.texTop}.png` }
    if (line.back.texMid) textureRequestMap[line.back.texMid] = { src: `textures/${line.back.texMid}.png` }
    if (line.back.texBot) textureRequestMap[line.back.texBot] = { src: `textures/${line.back.texBot}.png` }
    if (line.back.texTop) textureRequestMap[line.back.texTop] = { src: `textures/${line.back.texTop}.png` }
  }
  for (const [_, sector] of Object.entries(map.sectors)) {
    if (sector.texFloor) textureRequestMap[sector.texFloor] = { src: `textures/${sector.texFloor}.png` }
    if (sector.texCeil) textureRequestMap[sector.texCeil] = { src: `textures/${sector.texCeil}.png` }
  }

  // Load all line/wall textures synchronously
  // This way we can get their width/height and use that to build the geometry
  const textureCache = await new Promise((resolve, reject) => {
    twgl.createTextures(gl, textureRequestMap, (err, textures, sources) => {
      if (!err) {
        for (const name in sources) {
          // Mutate the texture object map, adding width and height
          textures[name] = {
            texture: textures[name],
            width: sources[name].width,
            height: sources[name].height,
          }
        }

        resolve(textures)
      } else {
        reject(err)
      }
    })
  })

  console.log(`🖼️ Loaded ${Object.keys(textureCache).length} textures into cache`)

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
    // Floor and ceiling polys build using earcut
    const holes = sector.holes ? sector.holes : []
    const floorCeilIndices = earcut(polyFlat, holes)

    // Floors...
    let uniforms = {}
    if (sector.brightness) {
      uniforms.u_brightness = sector.brightness
    }
    if (sector.brightFloor) {
      uniforms.u_brightness = sector.brightFloor
    }

    const floorFlat = buildFlatNew(gl, polyFlat, floorCeilIndices, sector.floor)
    worldObjs.push({
      id: ++flatId,
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
      const ceilFlat = buildFlatNew(gl, polyFlat, floorCeilIndices, sector.ceiling, false)
      worldObjs.push({
        id: ++flatId,
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
// Sets up all the thing templates, used for instancing thigns (sprites)
//
export async function buildTemplates(gl) {
  // Try to load the templates database
  const thingDbResp = await fetch('data/things.json')
  if (!thingDbResp.ok) {
    throw new Error(`HTTP error! status: ${thingDbResp.status}`)
  }
  const thingDB = await thingDbResp.json()

  const templates = {}
  for (const dbEntry of thingDB) {
    const size = dbEntry.size
    const spriteTransform = mat4.create()
    mat4.rotateX(spriteTransform, spriteTransform, Math.PI / 2)
    const buffers = twgl.primitives.createPlaneBufferInfo(gl, size, size, 1, 1, spriteTransform)

    const textures = []
    for (const texture of dbEntry.textures) {
      textures.push(
        twgl.createTexture(gl, {
          src: `sprites/${texture}.png`,
          mag: gl.NEAREST,
          wrap: gl.CLAMP_TO_EDGE,
        })
      )
    }

    templates[dbEntry.name] = {
      name: dbEntry.name,
      buffers,
      textures,
      animSpeed: dbEntry.animSpeed,
      yOffset: size / 2,
    }
  }

  return templates
}
