import * as twgl from '../lib/twgl/dist/4.x/twgl-full.module.js'
import * as Cannon from '../lib/cannon-es/dist/cannon-es.js'
import { vec3 } from '../lib/gl-matrix/esm/index.js'

export const TEX_SCALE = 10

//
// buildWall - creates a rectangle, how hard can that be?!
// Returns a twgl BufferInfo https://twgljs.org/docs/module-twgl.html#.BufferInfo
//
export function buildWall(gl, p1x, p1y, p2x, p2y, floorHeight, ceilingHeight, widthRatio = 1, flip = false) {
  if (widthRatio === undefined) widthRatio = 1

  // prettier-ignore
  const positions = [
     p1x, ceilingHeight, p1y,
     p2x, ceilingHeight, p2y,
     p1x, floorHeight, p1y,
     p2x, floorHeight, p2y,
  ]

  const indices = [0, 2, 1, 1, 2, 3]
  if (flip) indices.reverse()

  const bufferInfo = makeRectBuffer(gl, positions, indices, widthRatio, flip)
  const shape = new Cannon.Trimesh(positions, [0, 1, 2, 1, 3, 2])

  return { bufferInfo, shape }
}

export function buildFlatOLDNOTUSED(gl, p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y, height, up = true) {
  // prettier-ignore
  const positions = [
     p1x, height, p1y,
     p2x, height, p2y,
     p4x, height, p4y,
     p3x, height, p3y,
  ]

  const indices = [0, 2, 1, 1, 2, 3]
  if (!up) indices.reverse()

  const bufferInfo = makeRectBuffer(gl, positions, indices, 1)

  return bufferInfo
}

function makeRectBuffer(gl, positions, indices, widthRatio, flip = false) {
  // Work out normal with classic cross product method
  const v1 = vec3.fromValues(positions[0] - positions[3], positions[1] - positions[4], positions[2] - positions[5])
  const v2 = vec3.fromValues(positions[0] - positions[6], positions[1] - positions[7], positions[2] - positions[8])

  const v1Len = vec3.length(v1) / (TEX_SCALE * widthRatio)
  const v2Len = (vec3.length(v2) / (TEX_SCALE * widthRatio)) * widthRatio

  const norm = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), v2, v1))
  if (flip) {
    vec3.negate(norm, norm)
  }

  const arrays = {
    position: positions,
    texcoord: [0, 0, v1Len, 0, 0, v2Len, v1Len, v2Len],
    normal: [norm[0], norm[1], norm[2], norm[0], norm[1], norm[2], norm[0], norm[1], norm[2], norm[0], norm[1], norm[2]],
    indices,
  }
  return twgl.createBufferInfoFromArrays(gl, arrays)
}

export function buildFlatNew(gl, poly, indices, height, up = true) {
  console.log('=== buildFlatNew ===')
  console.log('  poly:', JSON.stringify(poly))
  console.log('  indices:', JSON.stringify(indices))

  const position = []
  const texcoord = []
  const indicesCopy = []
  const normal = []
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (let ix = 0; ix < poly.length; ix += 2) {
    const pointX = poly[ix]
    const pointY = poly[ix + 1]
    position.push(pointX)
    position.push(height)
    position.push(pointY)

    minX = Math.min(minX, poly[ix])
    maxX = Math.max(maxX, poly[ix])
    minY = Math.min(minY, poly[ix + 1])
    maxY = Math.max(maxY, poly[ix + 1])
  }

  const normalY = up ? -1 : 1
  for (let ix = 0; ix < poly.length; ix += 2) {
    texcoord.push((poly[ix] - minX) / TEX_SCALE, (poly[ix + 1] - minY) / TEX_SCALE)
    normal.push(0, normalY, 0)
  }

  // Copy indices, in case we need to reverse them
  for (let ix = 0; ix < indices.length; ix++) {
    indicesCopy[ix] = indices[ix]
  }
  if (up) indicesCopy.reverse()

  const arrays = {
    position,
    texcoord,
    normal,
    indices: indicesCopy,
  }
  return twgl.createBufferInfoFromArrays(gl, arrays)
}
