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
  // eslint-disable-next-line no-unused-vars
  for (const [_, line] of Object.entries(map.lines)) {
    const sector = map.sectors[line.front.sector]

    const v1 = map.vertices[line.start]
    const v2 = map.vertices[line.end]
    const texName = 'STONE3'

    const texRatio = 1 //wall.texRatio ? wall.texRatio : 1
    const { bufferInfo, shape } = buildWall(gl, v1.x, v1.y, v2.x, v2.y, sector.floor, sector.ceiling, texRatio)
    const texture = twgl.createTexture(gl, {
      src: `textures/${texName}.png`,
    })

    if (v1.x < minX) minX = v1.x
    if (v1.x > maxX) maxX = v1.x
    if (v1.y < minY) minY = v1.y
    if (v1.y > maxY) maxY = v1.y
    if (v2.x < minX) minX = v2.x
    if (v2.x > maxX) maxX = v2.x
    if (v2.y < minY) minY = v2.y
    if (v2.y > maxY) maxY = v2.y

    physWorld.addBody(new Cannon.Body({ mass: 100000, shape }))

    worldObjs.push({
      bufferInfo,
      texture,
    })
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
