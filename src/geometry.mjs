import * as twgl from '../lib/twgl/dist/4.x/twgl-full.module.js'
import { vec3 } from '../lib/gl-matrix/esm/index.js'

export const TEX_SCALE = 10

//
// wallBufferInfo - creates a rectangle, how hard can that be?!
// Returns a twgl BufferInfo https://twgljs.org/docs/module-twgl.html#.BufferInfo
//
export function wallBufferInfo(gl, p1, p2, floorHeight, ceilingHeight) {
  // prettier-ignore
  const positions = [
     p1.x, ceilingHeight, p1.y,
     p2.x, ceilingHeight, p2.y,
     p1.x, floorHeight, p1.y,
     p2.x, floorHeight, p2.y,
  ];

  // Work out normal with classic cross product method
  const v1 = vec3.fromValues(positions[0] - positions[3], positions[1] - positions[4], positions[2] - positions[5])
  const v2 = vec3.fromValues(positions[0] - positions[6], positions[1] - positions[7], positions[2] - positions[8])

  const v1Len = vec3.length(v1) / TEX_SCALE
  const v2Len = vec3.length(v2) / TEX_SCALE

  const norm = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), v2, v1))

  const arrays = {
    position: positions,
    texcoord: [0, 0, v1Len, 0, 0, v2Len, v1Len, v2Len],
    normal: [norm[0], norm[1], norm[2], norm[0], norm[1], norm[2], norm[0], norm[1], norm[2], norm[0], norm[1], norm[2]],
    indices: [0, 2, 1, 1, 2, 3],
  }

  return twgl.createBufferInfoFromArrays(gl, arrays)
}
