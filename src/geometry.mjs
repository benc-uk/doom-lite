import * as twgl from '../lib/twgl/dist/4.x/twgl-full.module.js'
import * as Cannon from '../lib/cannon-es/dist/cannon-es.js'
import { vec3 } from '../lib/gl-matrix/esm/index.js'

export const TEX_SCALE = 10

//
// buildWall - creates a rectangle, how hard can that be?!
// Returns a twgl BufferInfo https://twgljs.org/docs/module-twgl.html#.BufferInfo
//
export function buildWall(gl, p1x, p1y, p2x, p2y, floorHeight, ceilingHeight, widthRatio = 1) {
  // prettier-ignore
  const positions = [
     p1x, ceilingHeight, p1y,
     p2x, ceilingHeight, p2y,
     p1x, floorHeight, p1y,
     p2x, floorHeight, p2y,
  ]

  const indices = [0, 2, 1, 1, 2, 3]
  const bufferInfo = makeFlatBuffer(gl, positions, indices, widthRatio)
  const shape = new Cannon.Trimesh(positions, indices)

  return { bufferInfo, shape }
}

export function buildFlat(gl, p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y, height, up = true) {
  // prettier-ignore
  const positions = [
     p1x, height, p1y,
     p2x, height, p2y,
     p4x, height, p4y,
     p3x, height, p3y,
  ]

  const indices = [0, 2, 1, 1, 2, 3]
  if (!up) {
    indices.reverse()
  }

  const bufferInfo = makeFlatBuffer(gl, positions, indices, 1)

  return bufferInfo
}

function makeFlatBuffer(gl, positions, indices, widthRatio) {
  // Work out normal with classic cross product method
  const v1 = vec3.fromValues(positions[0] - positions[3], positions[1] - positions[4], positions[2] - positions[5])
  const v2 = vec3.fromValues(positions[0] - positions[6], positions[1] - positions[7], positions[2] - positions[8])

  const v1Len = vec3.length(v1) / (TEX_SCALE * widthRatio)
  const v2Len = (vec3.length(v2) / (TEX_SCALE * widthRatio)) * widthRatio

  const norm = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), v2, v1))

  const arrays = {
    position: positions,
    texcoord: [0, 0, v1Len, 0, 0, v2Len, v1Len, v2Len],
    normal: [norm[0], norm[1], norm[2], norm[0], norm[1], norm[2], norm[0], norm[1], norm[2], norm[0], norm[1], norm[2]],
    indices,
  }
  return twgl.createBufferInfoFromArrays(gl, arrays)
}
