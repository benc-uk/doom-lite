import { buildFlat, buildWall } from './geometry.mjs'

import * as twgl from '../lib/twgl/dist/4.x/twgl-full.module.js'
import * as Cannon from '../lib/cannon-es/dist/cannon-es.js'

const baseUniforms = {
  u_lightColor: [1, 1, 1, 1],

  u_lightAmbient: [0.3, 0.3, 0.3, 1],
  u_specular: [1, 1, 1, 1],
  u_shininess: 350,
  u_specularFactor: 0.4,
}

/*
export function buildInstances(gl, physWorld) {
  const wallsBufferInfo = twgl.primitives.createCubeBufferInfo(gl, MAP_SIZE)
  const floorBufferInfo = twgl.primitives.createPlaneBufferInfo(gl, MAP_SIZE, MAP_SIZE)

  const ceilTransform = mat4.create()
  mat4.rotateZ(ceilTransform, ceilTransform, Math.PI)
  const ceilBufferInfo = twgl.primitives.createPlaneBufferInfo(gl, MAP_SIZE, MAP_SIZE, 1, 1, ceilTransform)

  const spriteTransform = mat4.create()
  mat4.scale(spriteTransform, spriteTransform, [0.6, 0.6, 0.6])
  mat4.rotateX(spriteTransform, spriteTransform, Math.PI / 2)
  const spriteBufferInfo = twgl.primitives.createPlaneBufferInfo(gl, MAP_SIZE, MAP_SIZE, 1, 1, spriteTransform)

  const wallTexture = twgl.createTexture(gl, {
    src: 'textures/STARG2.png',
  })
  const floorTexture = twgl.createTexture(gl, {
    src: 'textures/FLOOR4_8.png',
  })
  const ceilTexture = twgl.createTexture(gl, {
    src: 'textures/FLOOR5_4.png',
  })
  const spriteTexture1 = twgl.createTexture(gl, {
    src: 'sprites/TROOA1.png',
    mag: gl.NEAREST,
    wrap: gl.CLAMP_TO_EDGE,
  })
  const spriteTexture2 = twgl.createTexture(gl, {
    src: 'sprites/TROOB1.png',
    mag: gl.NEAREST,
    wrap: gl.CLAMP_TO_EDGE,
  })
  const spriteTexture3 = twgl.createTexture(gl, {
    src: 'sprites/TROOC1.png',
    mag: gl.NEAREST,
    wrap: gl.CLAMP_TO_EDGE,
  })
  const spriteTexture4 = twgl.createTexture(gl, {
    src: 'sprites/TROOD1.png',
    mag: gl.NEAREST,
    wrap: gl.CLAMP_TO_EDGE,
  })

  const spriteTextures = [spriteTexture1, spriteTexture2, spriteTexture3, spriteTexture4]
  console.log('🖼️ Textures loaded')

  const wallObj = createObject('wall', baseUniforms, wallsBufferInfo, [wallTexture], 0.0)
  const floorObj = createObject('floor', baseUniforms, floorBufferInfo, [floorTexture], 0.0)
  const ceilObj = createObject('ceil', baseUniforms, ceilBufferInfo, [ceilTexture], 0.0)
  const spriteObj = createObject('sprite', baseUniforms, spriteBufferInfo, spriteTextures, 0.4)
  console.log('📦 Built all object buffers')

  const instances = []
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      const type = map[y][x]

      switch (type) {
        case 1: {
          instances.push({
            object: wallObj,
            location: [x * MAP_SIZE + MAP_SIZE / 2, 0, y * MAP_SIZE + MAP_SIZE / 2],
            textureIndex: 0,
          })
          const box = new Cannon.Body({
            mass: 1000,
            shape: new Cannon.Box(new Cannon.Vec3(5, 5, 5)),
          })
          box.position.set(x * MAP_SIZE + MAP_SIZE / 2, 0, y * MAP_SIZE + MAP_SIZE / 2)
          physWorld.addBody(box)
          break
        }
        case 2:
        case 0:
          instances.push({
            object: floorObj,
            location: [x * MAP_SIZE + MAP_SIZE / 2, -5, y * MAP_SIZE + MAP_SIZE / 2],
            textureIndex: 0,
          })
          instances.push({
            object: ceilObj,
            location: [x * MAP_SIZE + MAP_SIZE / 2, 5, y * MAP_SIZE + MAP_SIZE / 2],
            textureIndex: 0,
          })
          break
      }
    }
  }

  const sprites = []
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      const type = map[y][x]

      switch (type) {
        case 2:
          sprites.push({
            object: spriteObj,
            location: [x * MAP_SIZE + MAP_SIZE / 2, -2.0, y * MAP_SIZE + MAP_SIZE / 2],
            animTime: Math.random() * spriteObj.animSpeed,
            textureIndex: Math.floor(Math.random() * spriteObj.textures.length),
          })
      }
    }
  }

  return {
    instances,
    sprites,
  }
}
*/

//
// Create an object with the given name, uniforms, buffers and texture
//
function createObject(name, uniforms, buffers, textures, animSpeed) {
  return {
    name,
    uniforms,
    buffers,
    textures,
    animSpeed,
  }
}

export function parseMap(map, gl, physWorld) {
  const instances = []
  let wallIndex = 0

  for (const sector of map.sectors) {
    for (const wall of sector.walls) {
      wallIndex++

      const tr = wall.texRatio ? wall.texRatio : 1
      const { bufferInfo, shape } = buildWall(gl, wall.x1, wall.y1, wall.x2, wall.y2, sector.floorHeight, sector.ceilingHeight, tr)
      const wallTexture = twgl.createTexture(gl, {
        src: `textures/${wall.texture}.png`,
      })

      const wallObj = createObject('wall' + wallIndex, baseUniforms, bufferInfo, [wallTexture], 0.0)

      physWorld.addBody(new Cannon.Body({ mass: 1000, shape }))

      instances.push({
        object: wallObj,
        location: [0, 0, 0],
        textureIndex: 0,
      })
    }
  }

  const bufferInfoFloor = buildFlat(gl, 0, 0, 60, 0, 60, 60, 0, 60, 0)
  const floorTexture = twgl.createTexture(gl, { src: 'textures/FLOOR4_8.png' })
  const floorObj = createObject('floor', baseUniforms, bufferInfoFloor, [floorTexture], 0.0)
  instances.push({
    object: floorObj,
    location: [0, 0, 0],
    textureIndex: 0,
  })

  const bufferInfoCeil = buildFlat(gl, 0, 0, 60, 0, 60, 60, 0, 60, 10, false)
  const ceilTexture = twgl.createTexture(gl, { src: 'textures/FLOOR5_4.png' })
  const ceilObj = createObject('ceil', baseUniforms, bufferInfoCeil, [ceilTexture], 0.0)
  instances.push({
    object: ceilObj,
    location: [0, 0, 0],
    textureIndex: 0,
  })

  return instances
}
