# Data Structure reference

Some vague attempt at documenting the data structures

## Overall Level Data

```ts
interface Map {
  name: string

  playerStart: { 
    x: number
    y: number
  },

  // All the things
  things: Array<Thing>,

  // Id is an auto incrementing integer
  vertices: Map<number, Vertex>,

  // Id is an auto incrementing integer
  lines: Map<number, Line>,

  // Id is an auto incrementing integer
  sectors: Map<number, Sector>,

  // Used to generate incrementing ids
  lineInc: number,
  sectorInc: number,
}
```

## Map File Structures

```ts
interface Vertex [number, number]  // 0 = X, 1 = Y
```

```ts
interface Line {
  id: number           // Id number
  start: number        // Vertex id of start of line, order decides front/back
  end: number          // Vertex id of end of line, order decides front/back
  impassable: boolean  // Mark this line as impassable, not used 
  doubleSided: boolean // Mark as double sided, not used 
  front: {
    sector: number // Sector on the front (right side) of this line
    texTop: string // Texture name for top area (optional)
    texMid: string // Texture name for middle area (optional)
    texBot: string // Texture name for bottom area (optional)
  }
  back: {
    sector: number // Sector on the back (left side) of this line
    texTop: string // Texture name for top area (optional)
    texMid: string // Texture name for middle area (optional)
    texBot: string // Texture name for bottom area (optional)
  }
}
```

```ts
interface Sector {
  id: number           // Id number
  floor: number        // Height of floor (Y axis)
  ceiling: number      // Height of ceiling (Y axis), if false remove ceiling
  texFloor: string     // Name of texture on floor
  texCeil: string      // Name of texture on ceiling
  holes: Array<number> // Offsets in lines array of lines which are holes in the poly
  lines: Array<number> // List of line ids that make up this sector
  brightness: number   // Modulate the light level in this sector
  brightFloor: number  // Modulate the light level of the floor
  brightCeil: number   // Modulate the light level of the ceiling
}
```

```ts
interface Thing {
  type: string    // Reference to the thing db and the name of the thing
  x: number       // Position 
  y: number       // Position
  yOffset: number // Vertical offset
}
```

## Things DB File

```ts
interface ThingDBEntry {
  name: demon,
  size: number,
  animSpeed: number
  textures: Array<string>
}
```

## In memory structures

### Thing template (created from ThingDBEntry in the DB file)

```ts
interface ThingTemplate {
  name: string,               // Name / type of this thing
  buffers: twgl.BufferInfo    // Buffers to render thing, from twgl
  textures: Array<GLTexture>  // Array of OpenGL texture buffers
  animSpeed: number,          // Speed of animation
  yOffset: number,            // Offset on Y axis for floor alignment
}
```

### Thing instance for rendering

```ts
interface Thing {
  template: ThingTemplate            // Thing template reference
  location: [number, number, number] // Location in world
  animTime: number                   // Current anim time, updated each frame
  textureIndex: number               // Which texture is currently shown
}
```

## World instance for rendering (line/wall or floor or ceiling)

```ts
interface WorldObj {
  id: number                   // Tracking number
  type: string                 // Either 'line', 'floor', 'ceiling'
  bufferInfo: twgl.BufferInfo  // Buffers to render this part of the world, from twgl
  texture: GLTexture           // Texture in GLTexture format
  uniforms: Array<any>         // Additional uniforms to pass to shader
}
```