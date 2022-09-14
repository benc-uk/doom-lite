export const MAP_SIZE = 10

// prettier-ignore
export const map = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 2, 0, 1, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 1, 0, 0, 2, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 2, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 2, 2, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 2, 0, 0, 0, 0, 0, 0, 2, 1],
  [1, 0, 0, 0, 2, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 0, 1, 0, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 0, 2, 2, 0, 1, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
]

export const mapNew = {
  name: 'Demo Map',
  sectors: [
    {
      floorHeight: 0,
      ceilingHeight: 10,
      // prettier-ignore
      walls: [
        { x1: 0,  y1: 0,  x2: 50, y2: 0,  texture: 'STARGR2' },
        { x1: 50, y1: 0,  x2: 50, y2: 30, texture: 'STARG2' },
        { x1: 50, y1: 30, x2: 0,  y2: 50, texture: 'BROVINE', texRatio: 2 },
        { x1: 0,  y1: 50, x2: 0,  y2: 0,  texture: 'SKSNAK1', texRatio: 0.5 },

        { x1: 5,  y1: 0, x2: 10,  y2: 5,  texture: 'CEMENT6' },
        { x1: 10,  y1: 5, x2: 15,  y2: 0,  texture: 'CEMENT6'},

        { x1: 25,  y1: 0, x2: 30,  y2: 10,  texture: 'STONE3' },
        { x1: 30,  y1: 10, x2: 35,  y2: 0,  texture: 'STONE3'},
      ],
    },
  ],
}
