import { fetchShaders, hideOverlay, setOverlay } from './utils.mjs'
import { parseMap, buildTemplates } from './world.mjs'
import { initInput, handleInputs, updatePlayer } from './controls.mjs'

import * as Cannon from '../lib/cannon-es/dist/cannon-es.js'
import * as twgl from '../lib/twgl/dist/4.x/twgl-full.module.js'
import { mat4 } from '../lib/gl-matrix/esm/index.js'
import { parse as parseJSONC } from '../lib/jsonc/index.js'
import { getGPUTier } from '../lib/detect-gpu/detect-gpu.esm.js'

const VERSION = '0.4.2-goat'
const FOV = 45
const FAR_CLIP = 120

const FORCE_LOAD_MAP = true
const DEMO_MAP = 'levels/demo.json'
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
  u_lightColor: [1, 1, 1, 1],

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
  console.log(`🎮 GPU - Tier:${gpu.tier}, FPS:${gpu.fps}, Make:${gpu.gpu}, Mobile:${gpu.mobile}`)
  if (gpu.tier < 3 || gpu.fps < 30) {
    alert(`Detected your GPU is tier ${gpu.tier} (3 is best) with a benchmark of ${gpu.fps} FPS. You will likely experience very poor performance`)
  }

  // Load cached map data
  let map
  try {
    // HACK: Force reload of map data
    let mapData = localStorage.getItem('map')
    if (FORCE_LOAD_MAP) mapData = null
    // fetch demo map from file if not in local storage
    if (!mapData) {
      console.log(`💾 Loading map from ${DEMO_MAP} not local storage`)
      const mapResp = await fetch(DEMO_MAP)
      if (!mapResp.ok) {
        throw new Error(`Unable to load ${DEMO_MAP} ${mapResp.status}`)
      }
      mapData = await mapResp.text()
    }

    // Parse map raw JSON data
    map = parseJSONC(mapData)
    console.log(`🗺️ Map '${map.name}' was loaded`)
  } catch (e) {
    setOverlay(`Map loading error: ${e.message}`)
    return // Give up here!
  }

  // Register input & controls handlers
  initInput(gl)

  // Use TWLG to set up the shaders and programs
  // We have two programs and two pairs of shaders, one for the world and one for the sprites
  let worldProg = null
  let spriteProg = null
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

  // Set up all thing templates
  let templates = null
  try {
    templates = await buildTemplates(gl)
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
  const { worldObjs, thingInstances, playerStart } = await parseMap(map, gl, physWorld, templates)
  console.log(`🗺️ Map '${map.name}' was parsed into ${worldObjs.length} parts and ${thingInstances.length} things`)

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
    const uniforms = {
      u_viewInverse: camera, // Add the view inverse to the uniforms, we need it for shading
      u_lightWorldPos: player.location, // Add the light position to the uniforms, we need it for shading
      ...baseUniforms,
    }

    drawWorld(gl, worldProg, uniforms, worldObjs, viewPerspective)
    drawThings(gl, spriteProg, uniforms, thingInstances, view, perspective, deltaTime)

    requestAnimationFrame(render)
  }

  // Start the render loop first time
  requestAnimationFrame(render)
}

//
// Draw the world geometry, which is pre-transformed into world space
//
function drawWorld(gl, programInfo, uniforms, worldObjs, viewPerspective) {
  for (const obj of worldObjs) {
    const drawUniforms = {
      ...uniforms,
      u_debugColor: [0, 0, 0, 0],
      u_yOffset: 0,
      u_xOffset: 0,
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
