// ===== main.mjs ===================================================================
// Main entry point for the game, initialization and core rendering loop
// Ben Coleman, 2022
// ==================================================================================

import { fetchShaders, hideOverlay, setOverlay } from './utils.mjs'
import { buildWorld, buildTemplates } from './world.mjs'
import { initInput, handleInputs, updatePlayer } from './controls.mjs'
import { loadDataFiles, buildTextureCache } from './data.mjs'

import * as Cannon from '../lib/cannon-es/dist/cannon-es.js'
import * as twgl from '../lib/twgl/dist/4.x/twgl-full.module.js'
import { mat4, vec3 } from '../lib/gl-matrix/esm/index.js'
import { getGPUTier } from '../lib/detect-gpu/detect-gpu.esm.js'

const VERSION = '0.5.2'
const FOV = 38
const FAR_CLIP = 140
const MAX_LIGHTS = 16 // Should match shader code

const MAP_FILE = 'levels/demo.json5'
const NO_CLIP = false

let camera
let totalTime = 0

const player = {
  location: [0, 0, 0],
  facing: [0, 0, 0],
  body: null,
  height: 4,
  sector: 0,
}

const baseUniforms = {
  u_lightAmbient: [0.3, 0.3, 0.3, 1],
  u_specular: [1, 1, 1, 1],
  u_shininess: 350,
  u_specularFactor: 0.3,
}

//
// Start here when the page is loaded.
//
window.onload = async () => {
  console.log(`🌍 Starting up... \n⚓ v${VERSION}`)
  document.querySelector('#version').innerText = VERSION

  const gl = document.querySelector('canvas').getContext('webgl2')
  if (!gl) {
    setOverlay('Unable to initialize WebGL. Your browser or machine may not support it!')
    return
  }

  const gpu = await getGPUTier()
  console.log(`🎮 GPU - Tier:${gpu.tier}, FPS:${gpu.fps}, Make:${gpu.gpu}, Mobile:${gpu.isMobile}`)
  if (gpu.tier < 3 || gpu.fps < 30) {
    alert(`Detected your GPU is tier ${gpu.tier} (3 is best) with a benchmark of ${gpu.fps} FPS. You might have a bad time, I dunno`)
  }

  // Load data files like the main and the thing DB
  let map, thingDB
  try {
    console.log(`💾 Loading map '${MAP_FILE}' and other data files...`)
    ;({ map, thingDB } = await loadDataFiles(MAP_FILE))
    console.log(`🗺️ Map '${map.name}' was loaded`)
  } catch (e) {
    setOverlay(`Data loading error: ${e.message}`)
    return // Give up here!
  }

  // Register input & controls handlers
  initInput(gl)

  // Use TWLG to set up the shaders and programs
  // We have two programs and two pairs of shaders, one for the world and one for the sprites
  let worldProg, spriteProg
  try {
    // Note, we load shaders from external files, that's how I like to work
    const { vertex: worldVert, fragment: worldFrag } = await fetchShaders('shaders/world-vert.glsl', 'shaders/world-frag.glsl')
    worldProg = twgl.createProgramInfo(gl, [worldVert, worldFrag])

    const { vertex: spriteVert, fragment: spriteFrag } = await fetchShaders('shaders/sprite-vert.glsl', 'shaders/sprite-frag.glsl')
    spriteProg = twgl.createProgramInfo(gl, [spriteVert, spriteFrag])

    console.log('🎨 Loaded all shaders, GL is ready')
  } catch (err) {
    console.error(err)
    setOverlay(err.message)
    return // Give up here!
  }

  // Load all the textures we need
  let textureCache
  try {
    textureCache = await buildTextureCache(gl, map, thingDB)
    console.log(`🖼️ Loaded ${Object.keys(textureCache).length} textures into cache`)
  } catch (err) {
    console.error(err)
    setOverlay(`Texture loading error ${err}`)
    return // Give up here!
  }

  // Set up all thing templates
  let templates
  try {
    templates = await buildTemplates(gl, textureCache, thingDB)
    console.log(`🗿 Loaded ${Object.keys(templates).length} thing templates`)
  } catch (err) {
    console.error(err)
    setOverlay(`Loading thing templates failed ${err.message}`)
    return // Give up here!
  }

  setTimeout(() => {
    hideOverlay()
  }, 5000)

  // Physics for the world and player body
  const physWorld = new Cannon.World({ gravity: new Cannon.Vec3(0, 0, 0) })
  player.body = new Cannon.Body({
    mass: 0.001,
    shape: new Cannon.Sphere(1.5),
    linearDamping: 0.99998,
  })
  if (NO_CLIP) player.body.collisionFilterGroup = 0
  physWorld.addBody(player.body)
  console.log('🧪 Physics initialized')

  // Build *everything* we are going to render
  const { worldObjs, thingInstances, playerStart } = await buildWorld(map, gl, templates, textureCache)
  console.log(`🧩 Map '${map.name}' was parsed into ${worldObjs.length} parts and ${thingInstances.length} thing instances`)

  // Setup player position and camera
  camera = mat4.targetTo(mat4.create(), [0, 0, 0], [0, 0, -100], [0, 1, 0])
  mat4.translate(camera, camera, [playerStart.x, player.height, playerStart.z])
  mat4.rotateY(camera, camera, map.playerStart.angle)
  player.body.position.set(camera[12], camera[13], camera[14])

  player.facing = [camera[8], camera[9], camera[10]]
  player.location = [camera[12], camera[13], camera[14]]

  updatePlayer(map, player, camera)

  gl.enable(gl.DEPTH_TEST)
  gl.enable(gl.CULL_FACE)

  // Draw the scene repeatedly every frame
  console.log(`♻️ Starting render loop`)
  let prevTime = 0

  document.getElementById('loading').remove()

  //
  // Main render loop, called once per frame
  //
  async function render(now) {
    now *= 0.001
    const deltaTime = now - prevTime // Get smoothed time difference
    prevTime = now
    totalTime += deltaTime

    // Process inputs and controls
    handleInputs(deltaTime, player, camera, map)

    // Update physics
    physWorld.fixedStep()

    if (now % 3 < deltaTime) {
      //console.log(`🚀 FPS: ${Math.round(1 / deltaTime)}`)
    }
    if (totalTime > 5) {
      setOverlay(`PLAYER: ${Math.round(player.location[0])}, ${Math.round(player.location[2])} &nbsp;&nbsp; FPS: ${Math.round(1 / deltaTime)}`)
    }

    gl.clear(gl.COLOR_BUFFER_BIT)

    twgl.resizeCanvasToDisplaySize(gl.canvas)
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

    const view = mat4.invert(mat4.create(), camera)

    // Do this in every frame since the window and therefore the aspect ratio of projection matrix might change
    const perspective = mat4.perspective(mat4.create(), (FOV * Math.PI) / 180, gl.canvas.clientWidth / gl.canvas.clientHeight, 0.1, FAR_CLIP)
    const viewPerspective = mat4.multiply(mat4.create(), perspective, view)

    // Note we place the light at the camera & player position
    const playerLight = {
      pos: player.location,
      color: [1, 1, 1, 1],
      intensity: 1.1,
      radius: 140,
    }

    // Add static lights from things that glow
    const thingLights = []
    for (const instance of thingInstances) {
      if (instance.template.light) {
        const lightTmpl = instance.template.light
        const lightPos = [instance.location[0], instance.location[1] + lightTmpl.height, instance.location[2]]
        const dist = vec3.distance(lightPos, player.location)

        // Only add lights that are close enough to be visible
        if (dist < FAR_CLIP) {
          thingLights.push({ dist, lightPos, lightTmpl })
        }
      }
    }
    // Sort by distance to player
    thingLights.sort((a, b) => a.dist - b.dist)

    // NOTE: For u_lights we use some slight odd syntax that twgl supports for arrays of objects
    const uniforms = {
      u_viewInverse: camera, // Add the view inverse to the uniforms, we need it for shading
      'u_lights[0]': playerLight, // First light is the player light
      ...baseUniforms,
    }

    // Add the rest of u_lights is the closest lights up to MAX_LIGHTS
    let lightCount = 1
    for (const { lightPos, lightTmpl } of thingLights) {
      if (lightCount > MAX_LIGHTS) break
      uniforms[`u_lights[${lightCount++}]`] = {
        pos: lightPos,
        color: lightTmpl.color,
        intensity: lightTmpl.intensity,
        radius: lightTmpl.radius,
      }
    }

    drawWorld(gl, worldProg, uniforms, worldObjs, viewPerspective, physWorld, map)
    drawThings(gl, spriteProg, uniforms, thingInstances, view, perspective, deltaTime)

    requestAnimationFrame(render)
  }

  // Start the render loop first time
  requestAnimationFrame(render)
}

//
// Draw the world geometry, which is pre-transformed into world space
//
function drawWorld(gl, programInfo, uniforms, worldObjs, viewPerspective, physWorld, map) {
  for (const obj of worldObjs) {
    // New optimization! Makes a HUGE difference!
    // Only add bodies of lines that border the player's current sector
    if (obj.body) {
      physWorld.removeBody(obj.body)
    }

    if (obj.type == 'line' && obj.body) {
      const line = map.lines[obj.id]
      const frontSecId = line.front.sector
      const backSecId = line.back.sector

      if (frontSecId == player.sector || backSecId == player.sector) {
        physWorld.addBody(obj.body)
      }
    }

    const drawUniforms = {
      ...uniforms,
      // Reset these uniforms for each object
      u_debugColor: [0, 0, 0, 0],
      u_yOffset: 0,
      u_xOffset: 0,
      u_brightness: 1.0,
      ...obj.uniforms,
      u_texture: obj.texture,
      u_worldInverseTranspose: mat4.create(), // For transforming normals
      u_world: mat4.create(), // For transforming vertices
      u_worldViewProjection: viewPerspective, // Main transformation matrix for vertices
    }

    // Actual drawing
    gl.useProgram(programInfo.program)
    twgl.setBuffersAndAttributes(gl, programInfo, obj.bufferInfo)
    twgl.setUniforms(programInfo, drawUniforms)
    twgl.drawBufferInfo(gl, obj.bufferInfo, gl.TRIANGLES)
  }
}

//
//
//
function drawThings(gl, programInfo, uniforms, thingInstances, view, perspective, deltaTime) {
  for (const instance of thingInstances) {
    let thingTexture = instance.template.textures[instance.textureIndex]
    instance.animTime += deltaTime
    if (instance.animTime > instance.template.animSpeed) {
      instance.animTime = 0.0
      instance.textureIndex = (instance.textureIndex + 1) % instance.template.textures.length
      thingTexture = instance.template.textures[instance.textureIndex]
    }

    uniforms = {
      ...uniforms,
      u_texture: thingTexture,
      u_worldInverseTranspose: mat4.create(), // For transforming normals
      u_worldViewProjection: mat4.create(), // Main transformation matrix for vetices
    }

    // Move object into the world
    const world = mat4.create()
    mat4.translate(world, world, [instance.location[0], instance.location[1], instance.location[2]])
    uniforms.u_world = world

    // Populate u_worldInverseTranspose - used for normals & shading
    mat4.invert(uniforms.u_worldInverseTranspose, world)
    mat4.transpose(uniforms.u_worldInverseTranspose, uniforms.u_worldInverseTranspose)

    // World view before projection, intermediate step for billboarding
    const worldView = mat4.multiply(mat4.create(), view, world)

    // For billboarding, we need to remove the translation part of the world view matrix
    worldView[0] = 1.0
    worldView[1] = 0
    worldView[2] = 0
    worldView[8] = 0
    worldView[9] = 0
    worldView[10] = 1.0

    // Populate u_worldViewProjection which is pretty fundamental
    mat4.multiply(uniforms.u_worldViewProjection, perspective, worldView)

    // Actual drawing
    gl.useProgram(programInfo.program)
    twgl.setBuffersAndAttributes(gl, programInfo, instance.template.buffers)
    twgl.setUniforms(programInfo, uniforms)
    twgl.drawBufferInfo(gl, instance.template.buffers)
  }
}
