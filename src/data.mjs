// ===== data.mjs ===================================================================
// Loading of data files such as the map and also loading all textures
// Ben Coleman, 2022
// ==================================================================================

import * as twgl from '../lib/twgl/dist/4.x/twgl-full.module.js'

import JSON5 from '../lib/json5/dist/index.min.mjs'

const TEXTURE_PATH = 'graphics/upscaled/textures'
const FLAT_PATH = 'graphics/upscaled/flats'
const THING_PATH = 'graphics/upscaled/things'
const MISSING_PATH = 'graphics/missing.png'

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

  const MAG_TEXTURES = gl.LINEAR
  const MAG_SPRITES = gl.NEAREST

  // We have additional passes of the map & thingDB data structure here, not ideal but fast enough
  for (const [_, line] of Object.entries(map.lines)) {
    if (line.front.texMid) textureRequestMap[`TEX_${line.front.texMid}`] = { src: `${TEXTURE_PATH}/${line.front.texMid}.png`, mag: MAG_TEXTURES }
    if (line.front.texBot) textureRequestMap[`TEX_${line.front.texBot}`] = { src: `${TEXTURE_PATH}/${line.front.texBot}.png`, mag: MAG_TEXTURES }
    if (line.front.texTop) textureRequestMap[`TEX_${line.front.texTop}`] = { src: `${TEXTURE_PATH}/${line.front.texTop}.png`, mag: MAG_TEXTURES }
    if (line.back.texMid) textureRequestMap[`TEX_${line.back.texMid}`] = { src: `${TEXTURE_PATH}/${line.back.texMid}.png`, mag: MAG_TEXTURES }
    if (line.back.texBot) textureRequestMap[`TEX_${line.back.texBot}`] = { src: `${TEXTURE_PATH}/${line.back.texBot}.png`, mag: MAG_TEXTURES }
    if (line.back.texTop) textureRequestMap[`TEX_${line.back.texTop}`] = { src: `${TEXTURE_PATH}/${line.back.texTop}.png`, mag: MAG_TEXTURES }
  }

  for (const [_, sector] of Object.entries(map.sectors)) {
    if (sector.texFloor) textureRequestMap[`FLAT_${sector.texFloor}`] = { src: `${FLAT_PATH}/${sector.texFloor}.png`, mag: MAG_TEXTURES }
    if (sector.texCeil) textureRequestMap[`FLAT_${sector.texCeil}`] = { src: `${FLAT_PATH}/${sector.texCeil}.png`, mag: MAG_TEXTURES }
  }

  for (const dbEntry of thingDB) {
    for (const textureName of dbEntry.textures) {
      textureRequestMap[`THING_${textureName}`] = {
        src: `${THING_PATH}/${textureName}.png`,
        mag: MAG_SPRITES,
        wrap: gl.CLAMP_TO_EDGE,
      }
    }
  }

  // Load a placeholder texture for missing textures
  const missingTexture = await new Promise((resolve, reject) => {
    twgl.createTexture(gl, { src: MISSING_PATH, mag: gl.NEAREST }, (err, texture) => {
      if (!err) {
        resolve(texture)
      } else {
        reject(err)
      }
    })
  })

  // Load all line/wall textures synchronously
  // This way we can get their width/height and use that to build the geometry
  const textureCache = await new Promise((resolve) => {
    twgl.createTextures(gl, textureRequestMap, (err, textures, sources) => {
      for (const name in sources) {
        // Mutate the texture object map, adding width and height
        textures[name] = {
          texture: textures[name],
          width: sources[name].width,
          height: sources[name].height,
        }
      }

      // Find any missing textures and replace with a placeholder
      if (err) {
        for (const e of err) {
          let name = e.split('/')[3].replace('.png', '')
          if (e.includes('/textures/')) name = `TEX_${name}`
          if (e.includes('/things/')) name = `THING_${name}`
          if (e.includes('/flats/')) name = `FLAT_${name}`
          console.warn(`🔥 WARN: missing texture ${name} was replaced with placeholder`)
          textures[name] = {
            texture: missingTexture,
            width: 64,
            height: 64,
          }
        }
      }

      resolve(textures)
    })
  })

  // Add a placeholder texture for missing textures
  textureCache.ERR_MISSING = {
    texture: missingTexture,
    width: 64,
    height: 64,
  }

  // Getter function helper for the texture cache
  textureCache.get = function (type, name) {
    type = type.toUpperCase()
    if (type != 'THING' && type != 'FLAT' && type != 'TEX') {
      throw new Error(`Invalid texture type ${type}`)
    }

    if (textureCache[`${type}_${name}`]) {
      return textureCache[`${type}_${name}`]
    } else {
      console.warn(`🔥 WARN: attempt to fetch missing texture '${name}' from cache`)
      return textureCache.ERR_MISSING
    }
  }

  return textureCache
}
