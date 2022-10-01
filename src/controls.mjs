// ===== controls.mjs ===============================================================
// Input handling and controls for movement of the player
// Also camera, lighting and physics is updated here
// Ben Coleman, 2022
// ==================================================================================

import { mat4 } from '../lib/gl-matrix/esm/index.js'
import { pointInPolygonFlat } from '../lib/point-in-poly/pip.mjs'
import { showToast } from './toast.mjs'

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
export function handleInputs(deltaTime, player, camera) {
  let moveSpeed = 60.0 // Don't understand why don't need to multiply by deltaTime here
  let turnSpeed = 3.9 * deltaTime
  const playerFacing = [camera[8], camera[9], camera[10]]

  // For extra slow movement
  if (inputMap['Shift']) {
    moveSpeed *= 0.3
    turnSpeed *= 0.2
  }

  // Move forward/back
  if (inputMap['w'] || inputMap['W'] || inputMap['ArrowUp']) {
    player.body.velocity.set(-playerFacing[0] * moveSpeed, -playerFacing[1] * moveSpeed, -playerFacing[2] * moveSpeed)
  }
  if (inputMap['s'] || inputMap['S'] || inputMap['ArrowDown']) {
    player.body.velocity.set(playerFacing[0] * moveSpeed, playerFacing[1] * moveSpeed, playerFacing[2] * moveSpeed)
  }

  // Strafe left/right
  if (inputMap['q'] || inputMap['Q']) {
    player.body.velocity.set((-playerFacing[2] * moveSpeed) / 2, 0, (playerFacing[0] * moveSpeed) / 2)
  }
  if (inputMap['e'] || inputMap['E']) {
    player.body.velocity.set((playerFacing[2] * moveSpeed) / 2, 0, (-playerFacing[0] * moveSpeed) / 2)
  }

  // Turn left & right
  if (inputMap['a'] || inputMap['A'] || inputMap['ArrowLeft']) {
    player.yAngle += turnSpeed
  }
  if (inputMap['d'] || inputMap['D'] || inputMap['ArrowRight']) {
    player.yAngle -= turnSpeed
  }

  // Look up/down
  if (inputMap['r']) {
    player.xAngle += turnSpeed / 4
  }
  if (inputMap['f']) {
    player.xAngle -= turnSpeed / 4
  }

  // No clip controls for debugging
  if (inputMap['PageUp'] && player.noClip) {
    player.height += 0.3
  }
  if (inputMap['PageDown'] && player.noClip) {
    player.height -= 0.3
  }
  if (inputMap['Insert']) {
    player.noClip = !player.noClip
    delete inputMap['Insert']
    showToast('🚫 NoClip ' + (player.noClip ? 'enabled' : 'disabled'))
  }

  // FOV controls
  if (inputMap['1']) {
    player.fov -= 2
    if (player.fov < 1) player.fov = 1
  }
  if (inputMap['2']) {
    player.fov += 2
    if (player.fov >= 170) player.fov = 170
  }
}

//
// Update where the player camera etc
//
export function updatePlayerCamera(map, player, camera) {
  // Check which sector player is in, this is brute force
  // TODO: Any way to optimize this?
  for (const [sid, sector] of Object.entries(map.sectors)) {
    if (pointInPolygonFlat([player.body.position.x, player.body.position.z], sector.poly)) {
      player.sector = sid
      break
    }
  }

  const playerY = player.sector ? map.sectors[player.sector].floor + player.height : player.height
  player.body.position.y = playerY
  mat4.translate(camera, camera, [player.body.position.x, player.body.position.y, player.body.position.z])
  mat4.rotateY(camera, camera, player.yAngle)
  mat4.rotateX(camera, camera, player.xAngle)

  // lower the body so we bump into low geometry
  player.body.position.y = playerY - 0.8

  // Handle no clip mode
  if (player.noClip) {
    player.body.collisionFilterGroup = 0
  } else {
    player.body.collisionFilterGroup = 1
  }
}
