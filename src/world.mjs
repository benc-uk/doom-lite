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
export function parseMap(map, gl, physWorld, templates) {
  const worldObjs = []
  const thingInstances = []

  for (const thing of map.things) {
    const template = templates[thing.type]
    thingInstances.push({
      template: template,
      location: [thing.x, template.yOffset + (thing.yOffset || 0), thing.y],
      animTime: Math.random() * template.animSpeed,
      textureIndex: Math.floor(Math.random() * template.textures.length),
    })
  }

  for (const [sid, sector] of Object.entries(map.sectors)) {
    // Build polygon for this sector
    // ARGH: This code is a fucking horror show
    const polyFlat = []
    console.log(`------ sector ${sid} ------`)
    for (let lineIx = 0; lineIx < sector.lines.length; lineIx++) {
      const lid = sector.lines[lineIx]
      const line = map.lines[lid]
      let v = map.vertices[line.end]

      if (line.back.sector == sid) {
        v = map.vertices[line.start]
      }

      console.log(`  line id: ${lid}, v: ${v} back: ${line.back.sector == sid}`)
      polyFlat.push(v[X], v[Y])
    }

    // Mutate sector adding the poly
    sector.poly = polyFlat

    for (const lid of sector.lines) {
      const line = map.lines[lid]
      const frontSec = map.sectors[line.front.sector]
      const backSec = map.sectors[line.back.sector]
      const v1 = map.vertices[line.start]
      const v2 = map.vertices[line.end]

      const uniforms = {}

      const impassable = line.hasOwnProperty('impassable') ? line.impassable : true
      // eslint-disable-next-line
      //const doubleSided = line.hasOwnProperty('doubleSided') ? line.doubleSided : false

      // FRONT
      if (frontSec) {
        uniforms.u_xOffset = line.front.xOffset ? line.front.xOffset : 0
        uniforms.u_yOffset = line.front.yOffset ? line.front.yOffset : 0
        if (line.front.texMid) {
          const { bufferInfo, shape } = buildWall(gl, v1[X], v1[Y], v2[X], v2[Y], frontSec.floor, frontSec.ceiling, line.front.texRatio, false)
          const texture = twgl.createTexture(gl, { src: `textures/${line.front.texMid}.png` })
          if (impassable) physWorld.addBody(new Cannon.Body({ mass: WALL_MASS, shape }))
          worldObjs.push({ bufferInfo, texture, uniforms })
        }
        if (line.front.texBot) {
          const { bufferInfo, shape } = buildWall(gl, v1[X], v1[Y], v2[X], v2[Y], backSec.floor, frontSec.floor, line.back.texRatio, true)
          const texture = twgl.createTexture(gl, { src: `textures/${line.front.texBot}.png` })
          physWorld.addBody(new Cannon.Body({ mass: WALL_MASS, shape }))
          worldObjs.push({ bufferInfo, texture, uniforms })
        }
        if (line.front.texTop) {
          const { bufferInfo, shape } = buildWall(gl, v1[X], v1[Y], v2[X], v2[Y], frontSec.ceiling, backSec.ceiling, line.back.texRatio, true)
          const texture = twgl.createTexture(gl, { src: `textures/${line.front.texTop}.png` })
          if (impassable) physWorld.addBody(new Cannon.Body({ mass: WALL_MASS, shape }))
          worldObjs.push({ bufferInfo, texture, uniforms })
        }
      }

      // BACK
      if (backSec) {
        uniforms.u_xOffset = line.back.xOffset ? line.back.xOffset : 0
        uniforms.u_yOffset = line.back.yOffset ? line.back.yOffset : 0
        if (line.back.texMid) {
          const { bufferInfo, shape } = buildWall(gl, v1[X], v1[Y], v2[X], v2[Y], backSec.floor, backSec.ceiling, line.back.texRatio, true)
          const texture = twgl.createTexture(gl, { src: `textures/${line.back.texMid}.png` })
          if (impassable) physWorld.addBody(new Cannon.Body({ mass: WALL_MASS, shape }))
          worldObjs.push({ bufferInfo, texture, uniforms })
        }
        if (line.back.texBot) {
          const { bufferInfo, shape } = buildWall(gl, v1[X], v1[Y], v2[X], v2[Y], backSec.floor, frontSec.floor, line.back.texRatio, true)
          const texture = twgl.createTexture(gl, { src: `textures/${line.back.texBot}.png` })
          physWorld.addBody(new Cannon.Body({ mass: WALL_MASS, shape }))
          worldObjs.push({ bufferInfo, texture, uniforms })
        }
        if (line.back.texTop) {
          const { bufferInfo, shape } = buildWall(gl, v1[X], v1[Y], v2[X], v2[Y], frontSec.ceiling, backSec.ceiling, line.back.texRatio, true)
          const texture = twgl.createTexture(gl, { src: `textures/${line.back.texTop}.png` })
          if (impassable) physWorld.addBody(new Cannon.Body({ mass: WALL_MASS, shape }))
          worldObjs.push({ bufferInfo, texture, uniforms })
        }
      }
    }

    const uniforms = {}

    // Floor and ceiling polys build from earcut
    const holes = sector.holes ? sector.holes : []
    const floorCeilIndices = earcut(polyFlat, holes)

    const floorFlat = buildFlatNew(gl, polyFlat, floorCeilIndices, sector.floor)
    const floorTex = twgl.createTexture(gl, {
      src: `textures/${sector.texFloor}.png`,
    })
    worldObjs.push({
      bufferInfo: floorFlat,
      texture: floorTex,
      uniforms,
    })

    if (sector.ceiling !== false) {
      const ceilFlat = buildFlatNew(gl, polyFlat, floorCeilIndices, sector.ceiling, false)
      const ceilTex = twgl.createTexture(gl, {
        src: `textures/${sector.texCeil}.png`,
      })
      worldObjs.push({
        bufferInfo: ceilFlat,
        texture: ceilTex,
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
