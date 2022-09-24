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

  // eslint-disable-next-line no-unused-vars
  for (const [sid, sector] of Object.entries(map.sectors)) {
    // Build polygon for this sector, used for movement sector checks
    // HACK: This code is a fucking horror show, but it seems to work (for now)
    const polyFlat = []
    const lid0 = sector.lines[0]
    const line = map.lines[lid0]
    const v1 = map.vertices[line.start]
    const v2 = map.vertices[line.end]
    polyFlat.push(v1[X], v1[Y])
    polyFlat.push(v2[X], v2[Y])

    for (let lineIx = 1; lineIx < sector.lines.length - 1; lineIx++) {
      const lid = sector.lines[lineIx]
      const line = map.lines[lid]
      const v = map.vertices[line.end]
      // Needed?
      //if (line.back == sid) v = map.vertices[line.start]
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

      const uniforms = {
        u_xOffset: line.front.xOffset ? line.front.xOffset : 0,
        u_yOffset: line.front.yOffset ? line.front.yOffset : 0,
      }

      // eslint-disable-next-line
      const impassable = line.hasOwnProperty('impassable') ? line.impassable : true
      // eslint-disable-next-line
      const doubleSided = line.hasOwnProperty('doubleSided') ? line.doubleSided : false

      // FRONT
      if (frontSec) {
        if (line.front.texMid) {
          const { bufferInfo, shape } = buildWall(gl, v1[X], v1[Y], v2[X], v2[Y], frontSec.floor, frontSec.ceiling, line.front.texRatio, false)
          const texture = twgl.createTexture(gl, { src: `textures/${line.front.texMid}.png` })
          if (impassable) physWorld.addBody(new Cannon.Body({ mass: WALL_MASS, shape }))
          worldObjs.push({ bufferInfo, texture, uniforms })
        }
        if (line.front.texBot) {
          const { bufferInfo, shape } = buildWall(gl, v1[X], v1[Y], v2[X], v2[Y], backSec.floor, frontSec.floor, line.back.texRatio, true)
          const texture = twgl.createTexture(gl, { src: `textures/${line.front.texBot}.png` })
          if (impassable) physWorld.addBody(new Cannon.Body({ mass: WALL_MASS, shape }))
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
        if (line.back.texMid) {
          const { bufferInfo, shape } = buildWall(gl, v1[X], v1[Y], v2[X], v2[Y], backSec.floor, backSec.ceiling, line.back.texRatio, true)
          const texture = twgl.createTexture(gl, { src: `textures/${line.back.texMid}.png` })
          if (impassable) physWorld.addBody(new Cannon.Body({ mass: WALL_MASS, shape }))
          worldObjs.push({ bufferInfo, texture, uniforms })
        }
        if (line.back.texBot) {
          const { bufferInfo, shape } = buildWall(gl, v1[X], v1[Y], v2[X], v2[Y], backSec.floor, frontSec.floor, line.back.texRatio, true)
          const texture = twgl.createTexture(gl, { src: `textures/${line.back.texBot}.png` })
          if (impassable) physWorld.addBody(new Cannon.Body({ mass: WALL_MASS, shape }))
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

    // Floor and ceiling polys build from earcut
    const floorCeilIndices = earcut(polyFlat)
    const floorFlat = buildFlatNew(gl, polyFlat, floorCeilIndices, sector.floor)
    const floorTex = twgl.createTexture(gl, {
      src: `textures/${sector.texFloor}.png`,
    })
    worldObjs.push({
      bufferInfo: floorFlat,
      texture: floorTex,
    })
    const ceilFlat = buildFlatNew(gl, polyFlat, floorCeilIndices, sector.ceiling, false)
    const ceilTex = twgl.createTexture(gl, {
      src: `textures/${sector.texCeil}.png`,
    })
    worldObjs.push({
      bufferInfo: ceilFlat,
      texture: ceilTex,
    })
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
