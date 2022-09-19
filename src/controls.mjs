import { mat4 } from '../lib/gl-matrix/esm/index.js'
import { pointInPolygonNested } from '../lib/point-in-poly/pip.mjs'

let inputMap = {}

//
// Initialize the input handling
//
export function initInput(gl) {
  window.addEventListener('keydown', (e) => {
    inputMap[e.key] = true
  })

  window.addEventListener('keyup', (e) => {
    delete inputMap[e.key]
  })

  function touchMouseHandler(e) {
    e.preventDefault()

    let x = -1
    let y = -1
    if (e.touches) {
      x = e.touches[0].clientX
      y = e.touches[0].clientY
    } else {
      x = e.clientX
      y = e.clientY
    }

    if (x < 0 || y < 0) return

    if (x < gl.canvas.clientWidth / 3) {
      inputMap['a'] = true
    }
    if (x > gl.canvas.clientWidth - gl.canvas.clientWidth / 3) {
      inputMap['d'] = true
    }
    if (y < gl.canvas.clientHeight / 3) {
      inputMap['w'] = true
    }
    if (y > gl.canvas.clientHeight - gl.canvas.clientHeight / 3) {
      inputMap['s'] = true
    }

    return false
  }

  const canvas = document.querySelector('canvas')
  canvas.addEventListener('touchstart', touchMouseHandler)
  canvas.addEventListener('mousedown', touchMouseHandler)

  canvas.addEventListener('touchend', () => {
    inputMap = {}
  })

  canvas.addEventListener('mouseup', () => {
    inputMap = {}
  })
}

//
// Handle any active input, called every frame
//
export function handleInputs(deltaTime, player, camera, map) {
  const moveSpeed = 72.0 // Don't understand why don't need to multiply by deltaTime here
  const turnSpeed = 3.9 * deltaTime

  if (inputMap['w'] || inputMap['ArrowUp']) {
    player.body.velocity.set(-player.facing[0] * moveSpeed, -player.facing[1] * moveSpeed, -player.facing[2] * moveSpeed)
  }

  if (inputMap['s'] || inputMap['ArrowDown']) {
    player.body.velocity.set(player.facing[0] * moveSpeed, player.facing[1] * moveSpeed, player.facing[2] * moveSpeed)
  }

  if (inputMap['q'] || inputMap['z']) {
    player.body.velocity.set((-player.facing[2] * moveSpeed) / 2, 0, (player.facing[0] * moveSpeed) / 2)
  }

  if (inputMap['e'] || inputMap['x']) {
    player.body.velocity.set((player.facing[2] * moveSpeed) / 2, 0, (-player.facing[0] * moveSpeed) / 2)
  }

  if (inputMap['a'] || inputMap['ArrowLeft']) {
    mat4.rotateY(camera, camera, turnSpeed)

    // update facing
    player.facing = [camera[8], camera[9], camera[10]]
  }

  if (inputMap['d'] || inputMap['ArrowRight']) {
    mat4.rotateY(camera, camera, -turnSpeed)

    // update facing
    player.facing = [camera[8], camera[9], camera[10]]
  }

  // Check which sector player is in
  for (const [sid, sector] of Object.entries(map.sectors)) {
    if (pointInPolygonNested([player.location[0], player.location[2]], sector.poly)) {
      player.sector = sid
      break
    }
  }

  camera[13] = player.sector ? map.sectors[player.sector].floor + player.height : player.height

  // Move the camera & light to the player position
  player.location = [player.body.position.x, player.body.position.y, player.body.position.z]
  camera[12] = player.body.position.x
  camera[14] = player.body.position.z
}
