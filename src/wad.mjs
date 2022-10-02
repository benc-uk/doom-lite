// ===== wad.mjs ===============================================================
// Loading and parsing Doom WAD files
// Ben Coleman, 2022
// ==================================================================================

const DIRECTORY_SIZE = 16

const MAP_LUMP_NAMES = [
  'THINGS',
  'LINEDEFS',
  'SIDEDEFS',
  'VERTEXES',
  'SEGS',
  'SSECTORS',
  'NODES',
  'SECTORS',
  'REJECT',
  'BLOCKMAP',
  'GL_VERT',
  'GL_SEGS',
  'GL_SSECT',
  'GL_NODES',
  'GL_PVS',
]

export class WAD {
  constructor() {
    this.filename = null
    this.rawData = null
    this.type = null
    this.directory = []
  }

  //
  // Load a WAD file from a URL
  //
  async load(wadFileUrl) {
    const wadResp = await fetch(wadFileUrl)
    if (!wadResp.ok) {
      throw new Error(`Unable to load ${wadFileUrl} ${wadResp.status}`)
    }
    this.rawData = await wadResp.arrayBuffer()
    this.filename = wadFileUrl

    // Parse the header
    const wadTypeBuff = this.rawData.slice(0, 4)
    this.type = String.fromCharCode.apply(null, new Uint8Array(wadTypeBuff))
    const lumpCount = new DataView(this.rawData, 4).getInt32(0, true)
    const directoryOffset = new DataView(this.rawData, 8).getInt32(0, true)

    // Parse the directory
    for (let i = 0; i < lumpCount; i++) {
      const offset = directoryOffset + i * DIRECTORY_SIZE
      const dirEntry = new DirEntry(this.rawData, offset, i)
      this.directory.push(dirEntry)
      //console.log(`### Found lump ${dirEntry.name} @ ${dirEntry.offset} (${dirEntry.size} bytes)`)
    }
    console.log(`### Loaded ${this.type} '${wadFileUrl}' holding ${lumpCount} lumps`)
  }

  //
  // Convert all the lumps in a named map into a JSON object
  //
  parseMap(mapName) {
    const mapMarker = this.directory.find((lump) => lump.name === mapName)
    if (!mapMarker) {
      throw new Error(`Unable to find map '${mapName}'`)
    }

    const mapLumps = {}
    for (let i = mapMarker.index + 1; i < this.directory.length; i++) {
      const nextDirEntry = this.directory[i]
      // Stop when we hit the next entry which is NOT a map lump
      if (!MAP_LUMP_NAMES.includes(nextDirEntry.name)) break

      const lump = new DataView(this.rawData, nextDirEntry.offset, nextDirEntry.size)
      mapLumps[nextDirEntry.name] = lump
    }
    console.log(`### Found map '${mapName}' with ${Object.keys(mapLumps).length} lumps`)

    const vertLump = mapLumps['VERTEXES']
    const verts = []
    for (let i = 0; i < vertLump.byteLength; i += 4) {
      const vert = []
      vert[0] = vertLump.getInt16(i, true)
      vert[1] = vertLump.getInt16(i + 2, true)
      verts.push(vert)
    }

    const segLump = mapLumps['SEGS']
    if (!segLump) throw new Error(`Unable to find SEGS lump in map '${mapName}'`)
    const segs = []
    for (let i = 0; i < segLump.byteLength; i += 12) {
      const seg = {
        startVert: segLump.getInt16(i, true),
        endVert: segLump.getInt16(i + 2, true),
        angle: segLump.getInt16(i + 4, true),
        linedef: segLump.getInt16(i + 6, true),
        direction: segLump.getInt16(i + 8, true),
        offset: segLump.getInt16(i + 10, true),
      }
      segs.push(seg)
    }

    const lineDefLump = mapLumps['LINEDEFS']
    if (!lineDefLump) throw new Error(`Unable to find LINEDEFS lump in map '${mapName}'`)
    const lineDefs = []
    for (let i = 0; i < lineDefLump.byteLength; i += 14) {
      const lineDef = {
        startVert: lineDefLump.getInt16(i, true),
        endVert: lineDefLump.getInt16(i + 2, true),
        flags: lineDefLump.getInt16(i + 4, true),
        type: lineDefLump.getInt16(i + 6, true),
        sectorTag: lineDefLump.getInt16(i + 8, true),
        rightSideDef: lineDefLump.getInt16(i + 10, true),
        leftSideDef: lineDefLump.getInt16(i + 12, true),
      }
      lineDefs.push(lineDef)
    }

    const sideDefLump = mapLumps['SIDEDEFS']
    if (!sideDefLump) throw new Error(`Unable to find SIDEDEFS lump in map '${mapName}'`)
    const sideDefs = []
    for (let i = 0; i < sideDefLump.byteLength; i += 30) {
      const sideDef = {
        xOffset: sideDefLump.getInt16(i, true),
        yOffset: sideDefLump.getInt16(i + 2, true),
        upperTexture: getString(sideDefLump.buffer, sideDefLump.byteOffset + i + 4),
        lowerTexture: getString(sideDefLump.buffer, sideDefLump.byteOffset + i + 12),
        middleTexture: getString(sideDefLump.buffer, sideDefLump.byteOffset + i + 20),
        sector: sideDefLump.getInt16(i + 28, true),
      }
      sideDefs.push(sideDef)
    }

    const sectorLump = mapLumps['SECTORS']
    if (!sectorLump) throw new Error(`Unable to find SECTORS lump in map '${mapName}'`)
    const sectors = []
    for (let i = 0; i < sectorLump.byteLength; i += 26) {
      const sector = {
        floorHeight: sectorLump.getInt16(i, true),
        ceilingHeight: sectorLump.getInt16(i + 2, true),
        floorTexture: getString(sectorLump.buffer, sectorLump.byteOffset + i + 4),
        ceilingTexture: getString(sectorLump.buffer, sectorLump.byteOffset + i + 12),
        lightLevel: sectorLump.getInt16(i + 20, true),
        specialType: sectorLump.getUint16(i + 22, true),
        tag: sectorLump.getUint16(i + 24, true),
      }
      sectors.push(sector)
    }

    const subSectorLump = mapLumps['SSECTORS']
    if (!subSectorLump) throw new Error(`Unable to find SSECTORS lump in map '${mapName}'`)
    const subSectors = []
    for (let i = 0; i < subSectorLump.byteLength; i += 4) {
      const subSector = {
        numSegs: subSectorLump.getInt16(i, true),
        firstSeg: subSectorLump.getInt16(i + 2, true),
      }
      subSectors.push(subSector)
    }

    return { verts, lineDefs, sideDefs, sectors, segs, subSectors }
  }
}

class DirEntry {
  constructor(rawData, offset, index) {
    this.offset = new DataView(rawData, offset).getInt32(0, true)
    this.size = new DataView(rawData, offset + 4).getInt32(0, true)
    this.name = getString(rawData, offset + 8)
    this.index = index
  }
}

function getString(arrBuff, offset) {
  const strBuffer = arrBuff.slice(offset, offset + 8)
  return String.fromCharCode.apply(null, new Uint8Array(strBuffer)).replace(/\0/g, '')
}
