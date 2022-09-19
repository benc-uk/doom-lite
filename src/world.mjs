import { buildFlat, buildWall } from './geometry.mjs'

import * as twgl from '../lib/twgl/dist/4.x/twgl-full.module.js'
import * as Cannon from '../lib/cannon-es/dist/cannon-es.js'
import { mat4 } from '../lib/gl-matrix/esm/index.js'

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
      location: [thing.x, template.yOffset, thing.y],
      animTime: Math.random() * template.animSpeed,
      textureIndex: Math.floor(Math.random() * template.textures.length),
    })
  }

  // eslint-disable-next-line no-unused-vars
  for (const [sid, sector] of Object.entries(map.sectors)) {
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    // Build polygon for this sector, used for movement sector checks
    const poly = []
    const lid0 = sector.lines[0]
    const line = map.lines[lid0]
    const v1 = map.vertices[line.start]
    const v2 = map.vertices[line.end]
    poly.push([v1.x, v1.y])
    poly.push([v2.x, v2.y])

    for (let lix = 1; lix < sector.lines.length - 1; lix++) {
      const lid = sector.lines[lix]
      const line = map.lines[lid]
      let v = map.vertices[line.end]
      if (line.back == sid) v = map.vertices[line.start]
      poly.push([v.x, v.y])
    }

    sector.poly = poly

    for (const lid of sector.lines) {
      // if (line.front.sector != sid) continue
      const line = map.lines[lid]

      const frontSec = map.sectors[line.front.sector]
      const backSec = map.sectors[line.back.sector]

      const v1 = map.vertices[line.start]
      const v2 = map.vertices[line.end]

      if (backSec) {
        // Bottom section facing front
        if (backSec.floor > frontSec.floor) {
          const { bufferInfo, shape } = buildWall(gl, v1.x, v1.y, v2.x, v2.y, frontSec.floor, backSec.floor, line.front.textureRatio)
          const texture = twgl.createTexture(gl, { src: `textures/${line.front.texBot}.png` })
          physWorld.addBody(new Cannon.Body({ mass: 100000, shape }))
          worldObjs.push({ bufferInfo, texture })
        }
        // Bottom section facing back
        if (backSec.floor < frontSec.floor) {
          const { bufferInfo, shape } = buildWall(gl, v1.x, v1.y, v2.x, v2.y, backSec.floor, frontSec.floor, line.back.textureRatio, true)
          const texture = twgl.createTexture(gl, { src: `textures/${line.back.texBot}.png` })
          physWorld.addBody(new Cannon.Body({ mass: 100000, shape }))
          worldObjs.push({ bufferInfo, texture })
        }
        // Top section facing front
        if (backSec.ceiling < frontSec.ceiling) {
          const { bufferInfo, shape } = buildWall(gl, v1.x, v1.y, v2.x, v2.y, backSec.ceiling, frontSec.ceiling, line.front.textureRatio)
          const texture = twgl.createTexture(gl, { src: `textures/${line.front.texTop}.png` })
          physWorld.addBody(new Cannon.Body({ mass: 100000, shape }))
          worldObjs.push({ bufferInfo, texture })
        }
      } else {
        // Middle section
        const { bufferInfo, shape } = buildWall(gl, v1.x, v1.y, v2.x, v2.y, frontSec.floor, frontSec.ceiling, line.front.textureRatio)
        const texture = twgl.createTexture(gl, { src: `textures/${line.front.texMid}.png` })
        physWorld.addBody(new Cannon.Body({ mass: 100000, shape }))
        worldObjs.push({ bufferInfo, texture })
      }

      if (v1.x < minX) minX = v1.x
      if (v1.x > maxX) maxX = v1.x
      if (v1.y < minY) minY = v1.y
      if (v1.y > maxY) maxY = v1.y
      if (v2.x < minX) minX = v2.x
      if (v2.x > maxX) maxX = v2.x
      if (v2.y < minY) minY = v2.y
      if (v2.y > maxY) maxY = v2.y
    }

    // HACK: Remove this with proper floor/ceiling geometry
    const floorFlat = buildFlat(gl, minX, minY, maxX, minY, maxX, maxY, minX, maxY, sector.floor)
    const floorTex = twgl.createTexture(gl, {
      src: `textures/${sector.texFloor}.png`,
    })
    worldObjs.push({
      bufferInfo: floorFlat,
      texture: floorTex,
    })
    const ceilFlat = buildFlat(gl, minX, minY, maxX, minY, maxX, maxY, minX, maxY, sector.ceiling, false)
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
