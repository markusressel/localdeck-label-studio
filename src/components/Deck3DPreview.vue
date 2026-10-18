<template>
  <div class="deck-3d-preview" ref="containerRef">
    <div v-if="isLoading" class="loading-overlay">Initializing 3D Engine...</div>
    <div v-if="highQualityRender && !isLoading" class="sample-count">{{ pathTracedSamples }} samples</div>
    
    <div class="floating-controls">
      <div class="settings-dropdown">
        <div 
          class="floating-btn" 
          :class="{ active: showSettings }"
          @click="showSettings = !showSettings" 
          title="3D Render Settings"
        >
          <Icon icon="mdi:cog" />
          <span>3D Render Settings</span>
          <Icon :icon="showSettings ? 'mdi:chevron-up' : 'mdi:chevron-down'" />
        </div>
        
        <div class="settings-panel" v-if="showSettings">
          <div class="setting-row">
            <span class="setting-label">Path Tracing</span>
            <CustomSwitch v-model="highQualityRender" />
          </div>
          
          <div class="setting-divider"></div>

          <div class="setting-field">
            <label>Room Light</label>
            <CustomSlider v-model="previewRoomLight" :min="0" :max="100" showValue />
          </div>

          <div class="setting-field">
            <label>LED Intensity</label>
            <NumberStepper v-model="previewLedIntensity" :min="100" :max="10000" :step="100" :defaultVal="3000" />
          </div>
          
          <div class="setting-row-multi">
            <div class="setting-field half">
              <label>Translucency</label>
              <NumberStepper v-model="previewCapTranslucency" :min="0" :max="1" :step="0.05" :defaultVal="0.9" />
            </div>
            <div class="setting-field half">
              <label>Falloff Dist.</label>
              <NumberStepper v-model="previewCapAttenuation" :min="0.1" :max="10" :step="0.1" :defaultVal="2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import CustomSwitch from './CustomSwitch.vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { WebGLPathTracer, GradientEquirectTexture, DenoiseMaterial } from 'three-gpu-pathtracer'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { denoiseSigma, clampFireflies } from '../utils/pathTracing.js'
import { useStore } from '../composables/useStore'
import { resolveLabelStyle } from '../utils/labelStyle.js'
import { loadIconImage, loadImageElement } from '../utils/iconImage.js'
import { drawLabelTexture, TEXTURE_SIZE } from '../utils/labelTexture.js'
import { ledStateAt, isAnimatedEffect, labelBacklight, stemShadow } from '../utils/ledBacklight.js'
import { addLedFalloff } from '../utils/ledMaterials.js'
import NumberStepper from './NumberStepper.vue'
import CustomSlider from './CustomSlider.vue'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

const containerRef = ref(null)
const isLoading = ref(true)
const showSettings = ref(false)
const pathTracedSamples = ref(0)

const { matrixWidth, matrixHeight, labels, decks, activeDeckId, getLabelAtSlot, globalStyle, darkRoom, highQualityRender, caseColor, labelMaterial, switchBodyColor, switchStemColor, previewLedIntensity, previewCapTranslucency, previewCapAttenuation, previewRoomLight } = useStore()

let scene, camera, renderer, controls, pathTracer
// Soft studio-like reflections for the room light; created once. The path
// tracer needs an equirectangular environment instead of the PMREM one.
let roomEnvironment
let pathTracedRoomEnvironment
let denoiseQuad
let switchGLTF = null
let keycapOBJ = null
let animationFrameId

// GPU resources created by the last build, disposed before the next one
const ownedResources = []
const own = (resource) => {
  ownedResources.push(resource)
  return resource
}
const disposeOwnedResources = () => {
  ownedResources.forEach(resource => resource.dispose())
  ownedResources.length = 0
}

// Lit keys: their style and the materials their LED drives, each with a gain
let ledKeys = []
const applyLed = (key, timeS) => {
  const led = ledStateAt(key.style, timeS)
  for (const { material, gain } of key.materials) {
    material.emissive.setRGB(led.r, led.g, led.b)
    material.emissiveIntensity = led.intensity * gain
  }
}

onMounted(async () => {
  initThreeJS()
  await loadModels()
  buildProceduralDeck()
  animate()
  isLoading.value = false
})

const loadModels = () => {
  return Promise.all([
    new Promise((resolve) => {
      const loader = new GLTFLoader()
      loader.load('/models/switch.glb', (gltf) => {
      
      const parts = ['Mid Switch Blue Plastic', 'Mid Top Mid Top', 'Mid Bottom Mid Bottom'] // Exact mesh matches to prevent overlapping
      switchGLTF = new THREE.Group()

      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          // Some importers replace spaces with underscores, let's check both
          const name = child.name.replace(/_/g, ' ')
          if (parts.some(p => name.includes(p))) {
            const meshClone = child.clone()
            
            // The CAD model has the stem fully depressed into the housing. 
            // We need to physically translate the stem mesh UP along its Z axis to un-press it!
            if (name.includes('Mid Switch Blue Plastic')) {
              meshClone.position.z += 0.6 // Lift stem by 0.6 CAD units (approx 6mm)
            }
            
            meshClone.castShadow = true
            meshClone.receiveShadow = true
            switchGLTF.add(meshClone)
          }
        }
      })

      // Rotate the entire group to fix CAD Z-up orientation
      switchGLTF.rotation.x = -Math.PI / 2

      // Force Three.js to update the world matrix so the bounding box calculates correctly after rotation
      switchGLTF.updateMatrixWorld(true)

      // Center the extracted switch meshes based on their new rotated bounds
      const box = new THREE.Box3().setFromObject(switchGLTF)
      const center = box.getCenter(new THREE.Vector3())
      
      // We wrap it in another group to act as the true pivot
      const pivotGroup = new THREE.Group()
      
      // Offset the inner group so its visual center is at 0,0,0
      switchGLTF.position.x -= center.x
      switchGLTF.position.z -= center.z
      switchGLTF.position.y -= box.min.y // bottom flush with 0
      
      // Auto-scale to exactly 14 units wide
      const size = new THREE.Vector3()
      box.getSize(size)
      const targetScale = 15.6 / size.x
      pivotGroup.scale.set(targetScale, targetScale, targetScale)
      
      // Save the final height as userData so we can position it perfectly relative to the keycap
      pivotGroup.userData.switchHeight = size.y * targetScale
      
      pivotGroup.add(switchGLTF)
      switchGLTF = pivotGroup
      
      resolve()
    }, undefined, (error) => {
      console.error('Error loading switch GLTF:', error)
      resolve() 
    })
  }),
  new Promise((resolve) => {
    const loader = new OBJLoader()
    loader.load('/models/keycap.obj', (obj) => {
      
      // Rotate for Z-up
      obj.rotation.x = -Math.PI / 2
      obj.updateMatrixWorld(true)
      
      const box = new THREE.Box3().setFromObject(obj)
      const center = box.getCenter(new THREE.Vector3())
      
      const pivot = new THREE.Group()
      obj.position.x -= center.x
      obj.position.z -= center.z
      obj.position.y -= box.min.y
      
      const size = new THREE.Vector3()
      box.getSize(size)
      const targetScale = 18.0 / size.x // Scale to 18 width (typical keycap base)
      pivot.scale.set(targetScale, targetScale, targetScale)
      pivot.userData.capHeight = size.y * targetScale
      pivot.userData.targetScale = targetScale
      
      pivot.add(obj)
      keycapOBJ = pivot
      
      resolve()
    }, undefined, (error) => {
      console.error('Error loading keycap OBJ:', error)
      resolve()
    })
  })
  ])
}

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', onWindowResize)
  disposeOwnedResources()
  if (roomEnvironment) roomEnvironment.dispose()
  if (pathTracedRoomEnvironment) pathTracedRoomEnvironment.dispose()
  if (pathTracer) pathTracer.dispose()
  if (denoiseQuad) {
    denoiseQuad.material.dispose()
    denoiseQuad.dispose()
  }
  if (renderer) renderer.dispose()
})

const initThreeJS = () => {
  scene = new THREE.Scene()
  // scene.background = new THREE.Color('#1e1e1e') // Removed to make it transparent

  const w = containerRef.value.clientWidth || 800
  const h = containerRef.value.clientHeight || 600
  // A near plane of 1mm keeps enough depth precision for the label sitting 0.1mm above the cap
  camera = new THREE.PerspectiveCamera(45, w / h, 1, 1000)
  camera.position.set(0, 150, 200)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(w, h)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  // Neutral keeps bright LED colors closer to their hue; ACES pushed them towards white
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1.0

  containerRef.value.appendChild(renderer.domElement)

  const pmrem = new THREE.PMREMGenerator(renderer)
  roomEnvironment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  // The path traced LEDs are area lights; the rasterized preview shown before the
  // first samples needs these lookup tables to render them
  RectAreaLightUniformsLib.init()

  pathTracer = new WebGLPathTracer(renderer)
  pathTracer.bounces = 6
  pathTracer.transmissiveBounces = 10
  pathTracer.filterGlossyFactor = 0.5
  pathTracer.dynamicLowRes = true // fast low-res preview while the camera moves
  // One full-frame sample per animation frame. The default 3x3 tiles render a
  // ninth of a sample per frame, which capped convergence at the display rate.
  pathTracer.tiles.set(1, 1)

  // Clamp single extremely bright paths (fireflies) in the full and the low-res
  // path tracer. These are internals of three-gpu-pathtracer, hence the check.
  for (const tracer of [pathTracer._pathTracer, pathTracer._lowResPathTracer]) {
    const { source, replaced } = clampFireflies(tracer.material.fragmentShader, 25)
    if (replaced === 0) console.warn('3D preview: firefly clamp not applied, the three-gpu-pathtracer shader changed')
    tracer.material.fragmentShader = source
    tracer.material.needsUpdate = true
  }

  // Edge-preserving denoising of the first noisy samples, fading out as they converge
  denoiseQuad = new FullScreenQuad(new DenoiseMaterial({
    map: null,
    blending: THREE.NoBlending,
    premultipliedAlpha: renderer.getContextAttributes().premultipliedAlpha
  }))
  pathTracer.renderToCanvasCallback = (target, renderer, quad) => {
    const currentAutoClear = renderer.autoClear
    renderer.autoClear = false
    const sigma = denoiseSigma(pathTracer.samples)
    if (sigma > 0) {
      const denoise = denoiseQuad.material
      denoise.map = target.texture
      denoise.sigma = sigma
      denoise.opacity = quad.material.opacity
      denoise.blending = quad.material.blending
      denoiseQuad.render(renderer)
    } else {
      quad.render(renderer)
    }
    renderer.autoClear = currentAutoClear
  }
  controls.addEventListener('change', () => {
    if (highQualityRender.value) pathTracer.updateCamera()
  })

  pathTracedRoomEnvironment = new GradientEquirectTexture()
  pathTracedRoomEnvironment.topColor.set(0xffffff)
  pathTracedRoomEnvironment.bottomColor.set(0x404040)
  pathTracedRoomEnvironment.update()

  // Resize handler
  window.addEventListener('resize', onWindowResize)
}

const onWindowResize = () => {
  if (!containerRef.value) return
  camera.aspect = containerRef.value.clientWidth / containerRef.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight)
}

const buildProceduralDeck = () => {
  // Room lighting: off in the dark room, otherwise scaled by the Room Light setting.
  // Image-based light from a room environment gives the plastic shape and gloss;
  // a flat ambient light only washed everything out to white.
  const roomLevel = darkRoom.value ? 0 : previewRoomLight.value / 100
  const pathTraced = highQualityRender.value
  scene.environment = pathTraced ? pathTracedRoomEnvironment : roomEnvironment
  // Mostly the desk lamp, with a little room fill so shadows stay visible but not black
  scene.environmentIntensity = roomLevel * 0.35
  const dirIntensity = roomLevel * 2.2
  
  // Dynamically set background color to match the room state
  scene.background = new THREE.Color(darkRoom.value ? '#000000' : '#1a1a1c')

  // Add directional light ("desk lamp")
  // Desk lamp to the upper right of the deck (+x is right, -z is the far side)
  const deckExtent = Math.max(matrixWidth.value, matrixHeight.value) * 10 + 30
  const dirLight = own(new THREE.DirectionalLight(0xffffff, dirIntensity))
  dirLight.position.set(deckExtent + 60, 160, -(deckExtent + 40))
  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 2048
  dirLight.shadow.mapSize.height = 2048
  // The default shadow camera covers only +-5mm; cover the whole deck
  const shadowCamera = dirLight.shadow.camera
  shadowCamera.left = -deckExtent
  shadowCamera.right = deckExtent
  shadowCamera.top = deckExtent
  shadowCamera.bottom = -deckExtent
  shadowCamera.near = 1
  shadowCamera.far = 600
  shadowCamera.updateProjectionMatrix()
  dirLight.shadow.bias = -0.0005
  dirLight.shadow.normalBias = 0.05
  scene.add(dirLight)

  // PCB Base
  const pcbWidth = matrixWidth.value * 20
  const pcbHeight = matrixHeight.value * 20
  const pcbGeo = own(new THREE.BoxGeometry(pcbWidth, 2, pcbHeight))
  const pcbMat = own(new THREE.MeshStandardMaterial({ color: 0x113311, roughness: 0.8 }))
  const pcbMesh = new THREE.Mesh(pcbGeo, pcbMat)
  pcbMesh.receiveShadow = true
  scene.add(pcbMesh)

  // Build Enclosure Case with switch cutouts
  const caseWidth = pcbWidth + 12 // 6mm border on each side
  const caseHeight = pcbHeight + 12
  const radius = 6 // Rounded corner radius
  
  const shape = new THREE.Shape()
  
  const cw2 = caseWidth / 2
  const ch2 = caseHeight / 2
  
  shape.moveTo(-cw2, -ch2 + radius)
  shape.lineTo(-cw2, ch2 - radius)
  shape.quadraticCurveTo(-cw2, ch2, -cw2 + radius, ch2)
  shape.lineTo(cw2 - radius, ch2)
  shape.quadraticCurveTo(cw2, ch2, cw2, ch2 - radius)
  shape.lineTo(cw2, -ch2 + radius)
  shape.quadraticCurveTo(cw2, -ch2, cw2 - radius, -ch2)
  shape.lineTo(-cw2 + radius, -ch2)
  shape.quadraticCurveTo(-cw2, -ch2, -cw2, -ch2 + radius)
  
  // Cutouts
  const gridStartX = -pcbWidth / 2 + 10
  const gridStartZ = -pcbHeight / 2 + 10
  
  for (let r = 0; r < matrixHeight.value; r++) {
    for (let c = 0; c < matrixWidth.value; c++) {
      const cx = gridStartX + c * 20
      const cz = gridStartZ + r * 20
      
      const hole = new THREE.Path()
      const hw = 7.5 // half-width of 15x15 hole to comfortably fit the switch housing
      hole.moveTo(cx - hw, cz - hw)
      hole.lineTo(cx - hw, cz + hw)
      hole.lineTo(cx + hw, cz + hw)
      hole.lineTo(cx + hw, cz - hw)
      hole.lineTo(cx - hw, cz - hw)
      
      shape.holes.push(hole)
    }
  }
  
  const extrudeSettings = {
    depth: 8, // Increased depth for a taller case
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 1.5,
    bevelThickness: 1.5
  }
  
  const caseGeo = own(new THREE.ExtrudeGeometry(shape, extrudeSettings))
  caseGeo.rotateX(Math.PI / 2) // Now it lies flat on XZ, and extrudes downwards in Y
  
  const caseMeshMat = own(new THREE.MeshStandardMaterial({ 
    color: caseColor.value, 
    roughness: 0.8, 
    metalness: 0.1 
  }))
  const caseMesh = new THREE.Mesh(caseGeo, caseMeshMat)
  // Raised to Y=9 (2mm taller) to fully set the switches into the housing base
  caseMesh.position.set(0, 9, 0) 
  caseMesh.castShadow = true
  caseMesh.receiveShadow = true
  scene.add(caseMesh)

  // Materials
  const switchMat = own(new THREE.MeshStandardMaterial({ color: switchBodyColor.value, roughness: 0.7 }))
  const stemMat = own(new THREE.MeshStandardMaterial({ color: 0xaa2222, roughness: 0.4 }))
  const switchHousingMat = own(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }))

  // Backlight model: instead of point lights inside the switch (which only lit
  // surfaces facing them and flickered through screen-space transmission), the
  // LED makes the plastic and the label emit light. Emission fades with the
  // distance from the LED, and the label's own texture decides how much light
  // passes through it (ink blocks it, paper scatters and dims it).
  const ledGain = previewLedIntensity.value / 1500
  const capFalloffMm = previewCapAttenuation.value * 8
  // The frosted cap scatters strongly, so its stem shadow is soft
  const capShadow = stemShadow({ diffusion: 2 })
  const backlight = labelBacklight(labelMaterial.value)

  // Frosted white keycap base, slightly off-white so lit plastic doesn't clip to
  // pure white, with a light clear coat for the plastic sheen.
  // Rasterized, it is opaque and glows from the inside (transmission shimmers in
  // WebGL). Path traced, it is real translucent plastic the LED shines through:
  // Translucency is its transmission, Falloff Dist. how far light gets inside it.
  const createCapBaseMaterial = () => new THREE.MeshPhysicalMaterial({
    color: 0xe6e6e6,
    roughness: 0.45,
    metalness: 0.0,
    clearcoat: 0.3,
    clearcoatRoughness: 0.35,
    ...(pathTraced && {
      // Milky plastic: mostly scattering, letting a blurred part of the light through.
      // Fully transmissive plastic looked like frosted glass, showing the stem inside.
      roughness: 1.0,
      transmission: 0.55,
      thickness: 1.5,
      ior: 1.45,
      attenuationColor: new THREE.Color().setScalar(previewCapTranslucency.value),
      attenuationDistance: previewCapAttenuation.value,
      side: THREE.DoubleSide
    })
  })
  const unlitCapBaseMat = own(createCapBaseMaterial())

  // Clear snap-on cover. Path tracing mode keeps the physical glass material;
  // otherwise a faint glossy shell whose edges pick up the LED color.
  const createCapClearMaterial = () => pathTraced
    ? new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.0,
        roughness: 0.05,
        transmission: 1.0,
        ior: 1.5,
        // Thin-walled: light passes the 0.5mm wall without bending. With a solid
        // refracting cover around the LED, the path tracer could only reach the
        // LED through it by chance, which showed as dots everywhere.
        thickness: 0,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false
      })
    : new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.0,
        roughness: 0.05,
        opacity: 0.15,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false
      })
  const unlitCapClearMat = own(createCapClearMaterial())

  ledKeys = []

  // Build grid
  for (let r = 0; r < matrixHeight.value; r++) {
    for (let c = 0; c < matrixWidth.value; c++) {
      const x = gridStartX + c * 20
      const z = gridStartZ + r * 20
      const index = (r * matrixWidth.value) + c
      // Empty slots render a blank, unlit cap
      const slotLabel = getLabelAtSlot(index)
      const label = slotLabel || {}
      const style = resolveLabelStyle(label, globalStyle.value)
      const isLit = !!slotLabel && style.lightEnabled
      // The switch LED sits on the PCB at the south edge of the housing
      const ledPosition = new THREE.Vector3(x, 3, z + 5)
      const keyCenter = new THREE.Vector3(x, 3, z)
      const ledMaterials = []
      let capBaseMat = unlitCapBaseMat
      let capClearMat = unlitCapClearMat
      if (isLit && !pathTraced) {
        capBaseMat = own(addLedFalloff(createCapBaseMaterial(), {
          ledPosition,
          falloffMm: capFalloffMm,
          occlusion: { towards: keyCenter, ...capShadow }
        }))
        ledMaterials.push({ material: capBaseMat, gain: ledGain * previewCapTranslucency.value })
        capClearMat = own(addLedFalloff(createCapClearMaterial(), { ledPosition, falloffMm: capFalloffMm * 2, rim: true }))
        ledMaterials.push({ material: capClearMat, gain: ledGain * 0.8 })
      }

      // Switch Base (Cherry MX GLTF)
      if (switchGLTF) {
        const mxSwitch = switchGLTF.clone()
        // Rotate 180 degrees so the LED slot faces the bottom (South)
        mxSwitch.rotation.y = Math.PI
        // Place the bottom of the switch directly on top of the PCB (which spans y=0 to y=2)
        mxSwitch.position.set(x, 2, z)
        
        // Override all baked CAD materials to make the body and stem white plastic
        mxSwitch.traverse(child => {
          if (child.isMesh) {
            child.material = switchHousingMat
          }
        })
        
        scene.add(mxSwitch)
      } else {
        const switchMesh = new THREE.Mesh(own(new THREE.BoxGeometry(14, 8, 14)), switchMat)
        switchMesh.position.set(x, 5, z)
        switchMesh.castShadow = true
        scene.add(switchMesh)
  
        const stemMesh = new THREE.Mesh(own(new THREE.BoxGeometry(4, 4, 4)), stemMat)
        stemMesh.position.set(x, 11, z)
        scene.add(stemMesh)
      }

      // Keycap Geometry (OBJ)
      let capBaseY = 15
      let labelPlaneY = 18.1
      if (keycapOBJ) {
        const capClone = keycapOBJ.clone()
        // The switch is at y=2, and has a height. We want the cap to sit slightly down on the stem.
        const switchHeight = switchGLTF ? (switchGLTF.userData.switchHeight || 10) : 10
        capBaseY = 2 + switchHeight - 4 // push down 4 units so the stem connects deep into the cap
        capClone.position.set(x, capBaseY, z)
        
        let whiteCapMesh = null
        capClone.traverse((child) => {
          if (child.isMesh) {
            if (child.name.includes('obj1')) {
              child.material = capBaseMat
              child.castShadow = true
              child.receiveShadow = true
              whiteCapMesh = child
            } else if (child.name.includes('obj2')) {
              child.material = capClearMat
              child.receiveShadow = true
              // Lift the clear cover slightly to guarantee physical clearance for the label
              child.position.y += 0.5 
            }
          }
        })
        scene.add(capClone)
        
        // Calculate exact mathematical top of the white cap after placement
        capClone.updateMatrixWorld(true)
        if (whiteCapMesh) {
          const box1 = new THREE.Box3().setFromObject(whiteCapMesh)
          // Place label EXACTLY 0.1 units above the highest point of the white cap
          labelPlaneY = box1.max.y + 0.1
        } else {
          labelPlaneY = capBaseY + keycapOBJ.userData.capHeight
        }
      } else {
        const baseGeo = own(new THREE.CylinderGeometry(10, 12, 6, 4))
        const capBase = new THREE.Mesh(baseGeo, capBaseMat)
        capBase.position.set(x, 15, z)
        capBase.rotation.y = Math.PI / 4
        capBase.castShadow = true
        scene.add(capBase)

        const clearGeo = own(new THREE.CylinderGeometry(10.5, 11, 2, 4))
        const capClear = new THREE.Mesh(clearGeo, capClearMat)
        capClear.position.set(x, 19, z)
        capClear.rotation.y = Math.PI / 4
        scene.add(capClear)
      }
      
      // Label Rendering (Canvas Texture), drawn at 2x for a sharp print up close
      const canvas = document.createElement('canvas')
      canvas.width = TEXTURE_SIZE * 2
      canvas.height = TEXTURE_SIZE * 2
      const ctx = canvas.getContext('2d')
      ctx.scale(2, 2)
      const labelTex = own(new THREE.CanvasTexture(canvas))
      labelTex.colorSpace = THREE.SRGBColorSpace
      labelTex.anisotropy = renderer.capabilities.getMaxAnisotropy()

      drawLabelTexture(ctx, label, style, {
        opaque: labelMaterial.value !== 'transparent',
        loadIcon: loadIconImage,
        loadImage: loadImageElement
      })?.then(() => {
        // An icon or image finished drawing after the texture was created
        labelTex.needsUpdate = true
        if (pathTraced) pathTracer.updateMaterials()
      })

      // Path traced, the label is a thin translucent sheet the LED shines through,
      // tinted by the print (ink blocks the light)
      const labelMat = own(pathTraced ? new THREE.MeshPhysicalMaterial({
        map: labelTex,
        side: THREE.DoubleSide,
        alphaTest: 0.5,
        transmission: backlight.transmittance,
        thickness: 0,
        ior: 1.5,
        // Printed ink is matte; a near-mirror film lit by a point light only makes fireflies
        roughness: labelMaterial.value === 'transparent' ? 0.4 : 0.9,
        metalness: 0.0
      }) : new THREE.MeshStandardMaterial({
        map: labelTex,
        // Backlight passes through the print: ink blocks it, blank paper or film lets it through
        emissiveMap: labelTex,
        emissive: 0x000000,
        transparent: false, // Must stay opaque so the clear cover's transmission shader includes it
        side: THREE.DoubleSide,
        depthWrite: true,
        alphaTest: 0.5, // Cuts out blank film so the glowing cap shows through
        roughness: 0.9,
        metalness: 0.0,
        // Keeps the label in front of the cap top it sits 0.1mm above
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      }))
      if (isLit && !pathTraced) {
        // The label receives the same light as the cap top below it, times what the
        // material lets through: blank film then matches the cap seen through it,
        // and paper or ink can never be brighter than that
        addLedFalloff(labelMat, {
          ledPosition,
          falloffMm: capFalloffMm,
          occlusion: { towards: keyCenter, ...stemShadow(backlight) }
        })
        ledMaterials.push({ material: labelMat, gain: ledGain * backlight.transmittance })
      }

      // Plane for label
      const planeWidth = 10 * Math.sqrt(2) // Match top width of cap
      const labelGeo = own(new THREE.PlaneGeometry(planeWidth - 1, planeWidth - 1))
      const labelMesh = new THREE.Mesh(labelGeo, labelMat)
      labelMesh.rotation.x = -Math.PI / 2
      labelMesh.position.set(x, labelPlaneY, z)
      labelMesh.renderOrder = 999 // Force it to render on top of the opaque cap
      labelMesh.receiveShadow = true
      scene.add(labelMesh)

      if (isLit && pathTraced) {
        // A real light source. MX switches have a window above the LED in the top
        // of the housing, so the LED sits there, south of the stem, which casts
        // its shadow over the upper part of the label. Effects show a still frame.
        // A 3mm disc facing up rather than a point light: a point light makes surfaces
        // millimeters away extremely bright (1/distance^2), and every path bouncing off
        // them became a firefly that never averaged out. Its luminance is chosen so the
        // light straight up matches LED Intensity (candela = luminance * area).
        const led = ledStateAt(style, 0)
        const ledDiameterMm = 3
        const ledAreaMm2 = Math.PI * (ledDiameterMm / 2) ** 2
        const ledLight = own(new THREE.RectAreaLight(
          new THREE.Color(led.r, led.g, led.b),
          (led.intensity * previewLedIntensity.value) / ledAreaMm2,
          ledDiameterMm,
          ledDiameterMm
        ))
        ledLight.isCircular = true // three-gpu-pathtracer renders it as a disc
        // Just inside the cap's cavity, so it cannot end up enclosed by the opaque housing mesh
        ledLight.position.set(x, capBaseY + 0.5, z + 5)
        ledLight.lookAt(x, capBaseY + 10, z + 5)
        scene.add(ledLight)
      } else if (isLit) {
        const key = { style, animated: isAnimatedEffect(style), materials: ledMaterials }
        applyLed(key, performance.now() / 1000)
        ledKeys.push(key)
      }
    }
  }

  // Adjust camera to look at center
  controls.target.set(0, 0, 0)

  // Builds the BVH of the whole scene; rebuilt on every change
  if (pathTraced) pathTracer.setScene(scene, camera)
}

const animate = () => {
  animationFrameId = requestAnimationFrame(animate)
  const timeS = performance.now() / 1000
  for (const key of ledKeys) {
    if (key.animated) applyLed(key, timeS)
  }
  controls.update()
  if (highQualityRender.value && pathTracer.scene) {
    pathTracer.renderSample()
    pathTracedSamples.value = Math.floor(pathTracer.samples)
  } else {
    renderer.render(scene, camera)
  }
}

// Watch for changes to rebuild deck
let rebuildTimeout = null
watch([matrixWidth, matrixHeight, labels, decks, activeDeckId, globalStyle, darkRoom, highQualityRender, caseColor, labelMaterial, switchBodyColor, switchStemColor, previewLedIntensity, previewCapTranslucency, previewCapAttenuation, previewRoomLight], () => {
  if (rebuildTimeout) clearTimeout(rebuildTimeout)
  rebuildTimeout = setTimeout(() => {
    // Very crude rebuild: clear scene and rebuild
    while(scene.children.length > 0){ 
      scene.remove(scene.children[0]) 
    }
    disposeOwnedResources()
    buildProceduralDeck()
  }, 250) // 250ms debounce prevents Iconify API rate limiting (HTTP 429) and reduces BVH rebuild stutter
}, { deep: true })
</script>

<style scoped>
.deck-3d-preview {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  background: transparent;
}
.sample-count {
  position: absolute;
  left: 0.75rem;
  bottom: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  pointer-events: none;
}
.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  background: rgba(0,0,0,0.5);
  font-weight: bold;
}

</style>
