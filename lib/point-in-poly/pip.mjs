// Taken from https://www.npmjs.com/package/point-in-polygon
// License: MIT
// And updated to work with ES6 modules

export function pointInPolygonFlat(point, vs, start, end) {
  var x = point[0],
    y = point[1]
  var inside = false
  if (start === undefined) start = 0
  if (end === undefined) end = vs.length
  var len = (end - start) / 2
  for (var i = 0, j = len - 1; i < len; j = i++) {
    var xi = vs[start + i * 2 + 0],
      yi = vs[start + i * 2 + 1]
    var xj = vs[start + j * 2 + 0],
      yj = vs[start + j * 2 + 1]
    var intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

export function pointInPolygonNested(point, vs, start, end) {
  var x = point[0],
    y = point[1]
  var inside = false
  if (start === undefined) start = 0
  if (end === undefined) end = vs.length
  var len = end - start
  for (var i = 0, j = len - 1; i < len; j = i++) {
    var xi = vs[i + start][0],
      yi = vs[i + start][1]
    var xj = vs[j + start][0],
      yj = vs[j + start][1]
    var intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}
