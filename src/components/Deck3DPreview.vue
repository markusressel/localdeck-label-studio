<template>
  <div class="deck-3d-preview" ref="containerRef">
    <div v-if="isLoading" class="loading-overlay">Initializing 3D Engine...</div>
    
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
            <label>LED Intensity (cd)</label>
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
import { emojify } from '../utils/emojiUtils.js'
import { WebGLPathTracer } from 'three-gpu-pathtracer'
import { useStore } from '../composables/useStore'
import { resolveLabelStyle } from '../utils/labelStyle.js'
import { loadIconImage } from '../utils/iconImage.js'
import NumberStepper from './NumberStepper.vue'

const containerRef = ref(null)
const isLoading = ref(true)
const showSettings = ref(false)

const { matrixWidth, matrixHeight, labels, globalStyle, darkRoom, highQualityRender, caseColor, labelMaterial, switchBodyColor, switchStemColor, previewLedIntensity, previewCapTranslucency, previewCapAttenuation } = useStore()

let scene, camera, renderer, controls, pathTracer
let switchGLTF = null
let keycapOBJ = null
let animationFrameId
const iconImageCache = new Map()

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
  if (renderer) renderer.dispose()
})

const initThreeJS = () => {
  scene = new THREE.Scene()
  // scene.background = new THREE.Color('#1e1e1e') // Removed to make it transparent

  const w = containerRef.value.clientWidth || 800
  const h = containerRef.value.clientHeight || 600
  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000)
  camera.position.set(0, 150, 200)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(w, h)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0

  containerRef.value.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  pathTracer = new WebGLPathTracer(renderer)

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
  // Dynamic Room Lighting based on Dark Room toggle
  // In Dark Room, all ambient light is killed. In Light Room, it's very bright.
  const ambientIntensity = darkRoom.value ? 0.0 : 0.8
  const dirIntensity = darkRoom.value ? 0.0 : 2.5
  
  // Dynamically set background color to match the room state
  scene.background = new THREE.Color(darkRoom.value ? '#000000' : '#1a1a1c')

  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, ambientIntensity)
  scene.add(ambientLight)

  // Add directional light ("desk lamp")
  const dirLight = new THREE.DirectionalLight(0xffffff, dirIntensity)
  dirLight.position.set(50, 100, 50)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 2048
  dirLight.shadow.mapSize.height = 2048
  scene.add(dirLight)

  // PCB Base
  const pcbWidth = matrixWidth.value * 20
  const pcbHeight = matrixHeight.value * 20
  const pcbGeo = new THREE.BoxGeometry(pcbWidth, 2, pcbHeight)
  const pcbMat = new THREE.MeshStandardMaterial({ color: 0x113311, roughness: 0.8 })
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
  
  const caseGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings)
  caseGeo.rotateX(Math.PI / 2) // Now it lies flat on XZ, and extrudes downwards in Y
  
  const caseMeshMat = new THREE.MeshStandardMaterial({ 
    color: caseColor.value, 
    roughness: 0.8, 
    metalness: 0.1 
  })
  const caseMesh = new THREE.Mesh(caseGeo, caseMeshMat)
  // Raised to Y=9 (2mm taller) to fully set the switches into the housing base
  caseMesh.position.set(0, 9, 0) 
  caseMesh.castShadow = true
  caseMesh.receiveShadow = true
  scene.add(caseMesh)

  // Materials
  const switchMat = new THREE.MeshStandardMaterial({ color: switchBodyColor.value, roughness: 0.7 })
  const stemMat = new THREE.MeshStandardMaterial({ color: 0xaa2222, roughness: 0.4 })
  
  const switchHousingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
  
  // HIGHLY REALISTIC VOLUMETRIC CAP:
  // This uses absolute physical optical properties. 
  // It relies on Transmission (volume), IOR (refraction to hide internals), and Roughness (frosting).
  // In WebGL this will shimmer (screen-space limitation).
  // In Path Tracer this will be noisy during movement (true volumetric path-tracing limitation), but will converge to photorealism.
  const capBaseMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.5, // Frosted surface
    metalness: 0.0,
    transmission: 1.0, // 100% volume
    ior: 1.5, // Bends light heavily so you cannot clearly see the switch stem inside!
    thickness: 2.0, // 2mm thick plastic volume
    attenuationColor: new THREE.Color(0xffffff),
    attenuationDistance: previewCapAttenuation.value, // Light travels this far before being absorbed
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: true
  })
  
  // Clear snap-on cover
  // HYBRID RENDERER TRICK:
  // In standard WebGL, we use opacity to avoid the multi-transmission culling bug.
  // In Path Tracer mode, we unleash the true physical transmission shader for perfect refraction!
  const capClearMat = highQualityRender.value 
    ? new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.0,
        roughness: 0.05, // Crystal clear
        transmission: 1.0, // Perfect glass
        ior: 1.5, // Refractive index of plastic
        thickness: 0.5,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false
      })
    : new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.1,
        opacity: 0.3, // Fakes glass in standard WebGL
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false
      })

  // Build grid
  for (let r = 0; r < matrixHeight.value; r++) {
    for (let c = 0; c < matrixWidth.value; c++) {
      const x = gridStartX + c * 20
      const z = gridStartZ + r * 20
      const index = (r * matrixWidth.value) + c
      const label = labels.value[index] || {}

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
        const switchMesh = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 14), switchMat)
        switchMesh.position.set(x, 5, z)
        switchMesh.castShadow = true
        scene.add(switchMesh)
  
        const stemMesh = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), stemMat)
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
              whiteCapMesh = child
            } else if (child.name.includes('obj2')) {
              child.material = capClearMat
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
          labelPlaneY = box1.max.y + 0.1; console.log("Calculated labelPlaneY:", labelPlaneY)
        } else {
          labelPlaneY = capBaseY + keycapOBJ.userData.capHeight
        }
      } else {
        const baseGeo = new THREE.CylinderGeometry(10, 12, 6, 4)
        const capBase = new THREE.Mesh(baseGeo, capBaseMat)
        capBase.position.set(x, 15, z)
        capBase.rotation.y = Math.PI / 4
        capBase.castShadow = true
        scene.add(capBase)

        const clearGeo = new THREE.CylinderGeometry(10.5, 11, 2, 4)
        const capClear = new THREE.Mesh(clearGeo, capClearMat)
        capClear.position.set(x, 19, z)
        capClear.rotation.y = Math.PI / 4
        scene.add(capClear)
      }
      
      // Label Rendering (Canvas Texture)
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 256
      const ctx = canvas.getContext('2d')
      
      // Background
      const style = resolveLabelStyle(label, globalStyle.value)
      let bgColor = style.backgroundColor || 'transparent'
      if (bgColor === 'transparent') bgColor = '#ffffff'
      if (bgColor.length === 9) bgColor = bgColor.substring(0, 7)
      
      if (labelMaterial.value !== 'transparent') {
        ctx.fillStyle = bgColor
        ctx.fillRect(0, 0, 256, 256)
      } else {
        ctx.clearRect(0, 0, 256, 256)
      }
      
      // Text/Icon
      let textColor = style.textColor || '#000000'
      if (textColor.length === 9) textColor = textColor.substring(0, 7)
      let iconColor = style.iconColor || '#000000'
      if (iconColor.length === 9) iconColor = iconColor.substring(0, 7)
      ctx.fillStyle = textColor
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // 2D Preview renders in DOM pixels where ~53px = 14mm. Our canvas is 256x256. Scale factor is approx 4.8.
      const PX_SCALE = 4.8
      
      // Emulate the CSS Flexbox (flex-direction: column) base layout positions
      let tBaseY = 128
      let iBaseY = 128
      if (label.text && label.icon) {
        iBaseY = 96  // Push icon up
        tBaseY = 186 // Push text down
      }
      
      if (label.text) {
        const tX = (label.textOffsetX || 0) * PX_SCALE
        const tY = (label.textOffsetY || 0) * PX_SCALE
        const tSize = style.textSize * PX_SCALE
        
        ctx.save()
        ctx.translate(128 + tX, tBaseY + tY)
        ctx.font = `bold ${tSize}px sans-serif`
        ctx.textBaseline = 'middle'
        ctx.fillStyle = textColor // Ensure text uses textColor!
        ctx.fillText(emojify(label.text), 0, 0)
        ctx.restore()
      } 
      if (label.icon) {
        const isIconify = label.icon.includes(':') && !label.icon.startsWith(':')
        if (isIconify) {
          const parts = label.icon.split(':')
          if (parts.length === 2) {
            const iX = (label.iconOffsetX || 0) * PX_SCALE
            const iY = (label.iconOffsetY || 0) * PX_SCALE
            const iSize = style.iconSize * PX_SCALE
            
            const drawIcon = (image) => {
              ctx.save()
              ctx.translate(128 + iX, iBaseY + iY)
              ctx.scale(label.iconFlipH ? -1 : 1, label.iconFlipV ? -1 : 1)
              ctx.drawImage(image, -iSize/2, -iSize/2, iSize, iSize)
              ctx.restore()
              labelTex.needsUpdate = true
              if (pathTracer && highQualityRender.value) pathTracer.updateCamera()
            }

            loadIconImage(label.icon, iconColor)
              .then(drawIcon)
              .catch(err => console.warn(`3D preview: could not load icon ${label.icon}`, err))
          }
        } else {
          // Native Emoji Rendering
          const iX = (label.iconOffsetX || 0) * PX_SCALE
          const iY = (label.iconOffsetY || 0) * PX_SCALE
          const iSize = style.iconSize * PX_SCALE
          
          ctx.save()
          ctx.translate(128 + iX, iBaseY + iY)
          ctx.scale(label.iconFlipH ? -1 : 1, label.iconFlipV ? -1 : 1)
          ctx.font = `${iSize}px sans-serif`
          ctx.textBaseline = 'middle'
          ctx.fillStyle = iconColor
          ctx.fillText(emojify(label.icon), 0, 0)
          ctx.restore()
        }
      } else if (label.image) {
        // Custom Image Rendering
        const iX = (label.iconOffsetX || 0) * PX_SCALE
        const iY = (label.iconOffsetY || 0) * PX_SCALE
        const iSize = style.iconSize * PX_SCALE

        const drawCustomImage = (image) => {
          ctx.save()
          ctx.translate(128 + iX, iBaseY + iY)
          ctx.scale(label.iconFlipH ? -1 : 1, label.iconFlipV ? -1 : 1)
          ctx.drawImage(image, -iSize/2, -iSize/2, iSize, iSize)
          ctx.restore()
          labelTex.needsUpdate = true
          if (pathTracer && highQualityRender.value) pathTracer.updateCamera()
        }

        if (iconImageCache.has(label.image)) {
          drawCustomImage(iconImageCache.get(label.image))
        } else {
          const img = new Image()
          img.crossOrigin = 'Anonymous'
          img.onload = () => {
            iconImageCache.set(label.image, img)
            drawCustomImage(img)
          }
          img.src = label.image
        }
      }

      const labelTex = new THREE.CanvasTexture(canvas)
      let matConfig = { 
        map: labelTex, 
        transparent: false, // MUST BE FALSE so the clear cover's transmission shader includes it in the opaque pass!
        side: THREE.DoubleSide,
        depthWrite: true, 
        alphaTest: 0.5, // Physically cuts out transparent film pixels so we can see the cap underneath!
        roughness: 0.9,
        metalness: 0.0
      }
      
      // We no longer use opacity since transparent=false. The paper is treated as a solid cutout.
      
      // MeshStandardMaterial respects lighting so it casts/receives shadows!
      const labelMat = new THREE.MeshStandardMaterial(matConfig)
      
      // Plane for label
      const planeWidth = 10 * Math.sqrt(2) // Match top width of cap
      const labelGeo = new THREE.PlaneGeometry(planeWidth - 1, planeWidth - 1)
      const labelMesh = new THREE.Mesh(labelGeo, labelMat)
      // Most keycaps have a ~5 degree slope towards the user
      labelMesh.rotation.x = -Math.PI / 2
      labelMesh.position.set(x, labelPlaneY, z)
      labelMesh.renderOrder = 999 // Force it to render on top of the opaque cap
      scene.add(labelMesh)

      // LED Light
      if (style.lightEnabled) {
        let color = style.lightColor || '#10b981'
        if (color.length === 9) color = color.substring(0, 7)
        const b = style.lightBrightness / 100
        
        // Internal LED placed exactly where the physical switch LED slot is.
        // Needs massive intensity to punch through the 2mm volumetric plastic!
        const pointLight = new THREE.PointLight(color, b * previewLedIntensity.value, 20)
        pointLight.position.set(x, 10, z + 5)
        scene.add(pointLight)
        
        // Removed topGlow: The fake overhead light caused a harsh specular circle.
        // The emissive keycap base will now naturally illuminate the label from below!
      }
    }
  }

  // Adjust camera to look at center
  controls.target.set(0, 0, 0)
}

const animate = () => {
  animationFrameId = requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

// Watch for changes to rebuild deck
let rebuildTimeout = null
watch([matrixWidth, matrixHeight, labels, globalStyle, darkRoom, highQualityRender, caseColor, labelMaterial, switchBodyColor, switchStemColor, previewLedIntensity, previewCapTranslucency, previewCapAttenuation], () => {
  if (rebuildTimeout) clearTimeout(rebuildTimeout)
  rebuildTimeout = setTimeout(() => {
    // Very crude rebuild: clear scene and rebuild
    while(scene.children.length > 0){ 
      scene.remove(scene.children[0]) 
    }
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
