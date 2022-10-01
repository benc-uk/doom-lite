// ===== data.mjs ===================================================================
// Loading of data files such as the map and also loading all textures
// Ben Coleman, 2022
// ==================================================================================

import * as twgl from '../lib/twgl/dist/4.x/twgl-full.module.js'

import JSON5 from '../lib/json5/dist/index.min.mjs'

const TEXTURE_PATH = 'textures'
const SPRITE_PATH = 'sprites'
const THING_DB_PATH = 'data/things.json5'
//
// Load any JSON files, currently the main map and the thing DB
//
export async function loadDataFiles(mapPath) {
  // Try to load the thing templates database
  const thingDbResp = await fetch(THING_DB_PATH)
  if (!thingDbResp.ok) {
    throw new Error(`Unable to load ${THING_DB_PATH} ${thingDbResp.status}`)
  }
  const thingData = await thingDbResp.text()
  const thingDB = JSON5.parse(thingData)

  // fetch map from file
  const mapResp = await fetch(mapPath)
  if (!mapResp.ok) {
    throw new Error(`Unable to load ${mapPath} ${mapResp.status}`)
  }
  const mapData = await mapResp.text()
  const map = JSON5.parse(mapData)

  return { map, thingDB }
}

//
// Load all textures and sprites synchronously in one go, then return a texture cache
//
export async function buildTextureCache(gl, map, thingDB) {
  // Build a hash map of ALL textures we need
  const textureRequestMap = {}

  // We have additional passes of the map & thingDB data structure here, not ideal but fast enough
  for (const [_, line] of Object.entries(map.lines)) {
    if (line.front.texMid) textureRequestMap[line.front.texMid] = { src: `${TEXTURE_PATH}/${line.front.texMid}.png` }
    if (line.front.texBot) textureRequestMap[line.front.texBot] = { src: `${TEXTURE_PATH}/${line.front.texBot}.png` }
    if (line.front.texTop) textureRequestMap[line.front.texTop] = { src: `${TEXTURE_PATH}/${line.front.texTop}.png` }
    if (line.back.texMid) textureRequestMap[line.back.texMid] = { src: `${TEXTURE_PATH}/${line.back.texMid}.png` }
    if (line.back.texBot) textureRequestMap[line.back.texBot] = { src: `${TEXTURE_PATH}/${line.back.texBot}.png` }
    if (line.back.texTop) textureRequestMap[line.back.texTop] = { src: `${TEXTURE_PATH}/${line.back.texTop}.png` }
  }

  for (const [_, sector] of Object.entries(map.sectors)) {
    if (sector.texFloor) textureRequestMap[sector.texFloor] = { src: `${TEXTURE_PATH}/${sector.texFloor}.png` }
    if (sector.texCeil) textureRequestMap[sector.texCeil] = { src: `${TEXTURE_PATH}/${sector.texCeil}.png` }
  }

  for (const dbEntry of thingDB) {
    for (const textureName of dbEntry.textures) {
      textureRequestMap[textureName] = {
        src: `${SPRITE_PATH}/${textureName}.png`,
        mag: gl.NEAREST,
        wrap: gl.CLAMP_TO_EDGE,
      }
    }
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

  return textureCache
}
