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

## Map Data Structures
```ts
interface Vertex {
  x: number
  y: number
}
```

```ts
interface Line {
  id: number        // Id number
  start: string     // Vertex id
  end: string       // Vertex id
  front: {
    sector: number
    texTop: string
    texMid: string
    texBot: string
    texRatio: number
  }
  back: {
    sector: number
    texTop: string
    texMid: string
    texBot: string
    texRatio: number
  }
}
```

```ts
interface Sector {
  id: number           // Id number
  floor: number        // Height of floor (Y axis)
  ceiling: number      // Height of ceiling (Y axis)
  texFloor: string     // Name of texture on floor
  texCeil: string      // Name of texture on ceiling
  lines: Array<number> // List of line ids that make up this sector
}
```

## Things

```ts
interface Thing {
  template: ThingTemplate            // Thing template reference
  location: [number, number, number] // Location in world
  animTime: number                   // Current anim time, updated each frame
  textureIndex: number               // Which texture is currently shown
}
```

```ts
interface ThingTemplate {
  name: string,               // Name / type of this thing
  buffers: twgl.BufferInfo    // Buffers to render thing, from twgl
  textures: Array<GLTexture>  // Array of OpenGL texture buffers
  animSpeed: number,          // Speed of animation
  yOffset: number,            // Offset on Y axis for floor alignment
}
```