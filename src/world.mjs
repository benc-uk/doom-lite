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

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const sector of map.sectors) {
    for (const wall of sector.walls) {
      const texRatio = wall.texRatio ? wall.texRatio : 1
      const { bufferInfo, shape } = buildWall(gl, wall.x1, wall.y1, wall.x2, wall.y2, sector.floorHeight, sector.ceilingHeight, texRatio)
      const texture = twgl.createTexture(gl, {
        src: `textures/${wall.texture}.png`,
      })

      if (wall.x1 < minX) minX = wall.x1
      if (wall.x2 < minX) minX = wall.x2
      if (wall.x1 > maxX) maxX = wall.x1
      if (wall.x2 > maxX) maxX = wall.x2
      if (wall.y1 < minY) minY = wall.y1
      if (wall.y2 < minY) minY = wall.y2
      if (wall.y1 > maxY) maxY = wall.y1
      if (wall.y2 > maxY) maxY = wall.y2

      physWorld.addBody(new Cannon.Body({ mass: 100000, shape }))

      worldObjs.push({
        bufferInfo,
        texture,
      })
    }
  }

  // HACK: Remove this with proper floor/ceiling geometry
  const floorFlat = buildFlat(gl, minX, minY, maxX, minY, maxX, maxY, minX, maxY, 0)
  const floorTex = twgl.createTexture(gl, {
    src: `textures/FLOOR4_8.png`,
  })
  worldObjs.push({
    bufferInfo: floorFlat,
    texture: floorTex,
  })
  const ceilFlat = buildFlat(gl, minX, minY, maxX, minY, maxX, maxY, minX, maxY, 10, false)
  const ceilTex = twgl.createTexture(gl, {
    src: `textures/FLOOR5_4.png`,
  })
  worldObjs.push({
    bufferInfo: ceilFlat,
    texture: ceilTex,
  })

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
