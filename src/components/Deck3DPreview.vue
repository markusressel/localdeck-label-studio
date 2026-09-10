<template>
  <div class="deck-3d-preview" ref="containerRef">
    <div v-if="isLoading" class="loading-overlay">Initializing 3D Engine...</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useStore } from '../composables/useStore'

const containerRef = ref(null)
const isLoading = ref(true)

const { matrixWidth, matrixHeight, labels, globalLightColor, globalLightBrightness, globalBackgroundColor, globalTextColor } = useStore()

let scene, camera, renderer, controls
let switchGLTF = null
let animationFrameId

onMounted(async () => {
  initThreeJS()
  await loadModels()
  buildProceduralDeck()
  animate()
  isLoading.value = false
})

const loadModels = () => {
  return new Promise((resolve) => {
    const loader = new GLTFLoader()
    loader.load('/models/switch.glb', (gltf) => {
      switchGLTF = gltf.scene
      // Center and scale the switch correctly
      // We will scale it in the build loop, but let's enable shadows
      switchGLTF.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      resolve()
    }, undefined, (error) => {
      console.error('Error loading switch GLTF:', error)
      resolve() // resolve anyway to not break the app
    })
  })
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
  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
  scene.add(ambientLight)

  // Add directional light (sun/room light)
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
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

  // Materials
  const switchMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 })
  const stemMat = new THREE.MeshStandardMaterial({ color: 0xaa2222, roughness: 0.4 })
  
  // Base cap needs to be translucent and double-sided so light escapes
  const capBaseMat = new THREE.MeshPhysicalMaterial({ 
    color: 0xffffff, 
    roughness: 0.4,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  })
  
  const capClearMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 1.0,
    roughness: 0.1,
    ior: 1.5,
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide
  })

  // Build grid
  const startX = -pcbWidth / 2 + 10
  const startZ = -pcbHeight / 2 + 10

  for (let r = 0; r < matrixHeight.value; r++) {
    for (let c = 0; c < matrixWidth.value; c++) {
      const x = startX + c * 20
      const z = startZ + r * 20
      const index = (r * matrixWidth.value) + c
      const label = labels.value[index] || {}

      // Switch Base (Cherry MX GLTF)
      if (switchGLTF) {
        const mxSwitch = switchGLTF.clone()
        mxSwitch.position.set(x, 5, z)
        mxSwitch.scale.set(25, 25, 25) // Scaled up to match 14x14 procedural grid dimensions // Adjust scale based on typical GLTF sizes (may need tuning)
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

      // Keycap Geometry (Cylinder with 4 segments = Square frustum)
      // Radius is distance to corner. Width is radius * sqrt(2)
      // Top width ~ 14 -> radius = 10
      // Bottom width ~ 18 -> radius = 12.7
      const baseGeo = new THREE.CylinderGeometry(10, 12, 6, 4)
      const capBase = new THREE.Mesh(baseGeo, capBaseMat)
      capBase.position.set(x, 15, z)
      capBase.rotation.y = Math.PI / 4 // Rotate to make it square instead of diamond
      capBase.castShadow = true
      scene.add(capBase)

      // Clear Cap (mimics shape, sits exactly on top)
      // It acts as a shell over the top half
      const clearGeo = new THREE.CylinderGeometry(10.5, 11, 2, 4)
      const capClear = new THREE.Mesh(clearGeo, capClearMat)
      capClear.position.set(x, 19, z)
      capClear.rotation.y = Math.PI / 4
      scene.add(capClear)
      
      // Label Rendering (Canvas Texture)
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 256
      const ctx = canvas.getContext('2d')
      
      // Background
      let bgColor = label.backgroundColor || globalBackgroundColor.value || 'transparent'
      if (bgColor === 'transparent') bgColor = '#ffffff'
      if (bgColor.length === 9) bgColor = bgColor.substring(0, 7)
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, 256, 256)
      
      // Text/Icon
      let textColor = label.textColor || globalTextColor.value || '#000000'
      if (textColor.length === 9) textColor = textColor.substring(0, 7)
      ctx.fillStyle = textColor
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      if (label.text) {
        ctx.font = 'bold 40px sans-serif'
        ctx.fillText(label.text, 128, 128)
      } else if (label.icon) {
        // Fallback for icons since we can't easily draw SVG here yet
        ctx.font = 'bold 80px sans-serif'
        ctx.fillText(label.icon.replace('mdi:', ''), 128, 128) 
      }
      
      const labelTex = new THREE.CanvasTexture(canvas)
      const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true })
      
      // Plane for label
      const planeWidth = 10 * Math.sqrt(2) // Match top width of cap
      const labelGeo = new THREE.PlaneGeometry(planeWidth - 1, planeWidth - 1)
      const labelMesh = new THREE.Mesh(labelGeo, labelMat)
      labelMesh.rotation.x = -Math.PI / 2
      labelMesh.position.set(x, 18.1, z) // Just below clear cap, on top of base cap
      scene.add(labelMesh)

      // LED Light
      const isEnabled = label.lightEnabled !== false
      if (isEnabled) {
        let color = label.lightColor || globalLightColor.value || '#10b981'
        if (color.length === 9) color = color.substring(0, 7)
        const b = (label.lightBrightness ?? globalLightBrightness.value) / 100
        
        // Place light inside the cap and give it high intensity to bleed through DoubleSide translucent plastic
        const pointLight = new THREE.PointLight(color, b * 150, 40)
        pointLight.position.set(x, 14, z)
        scene.add(pointLight)
        
        // Add a secondary faint light ABOVE the cap to simulate the glow lighting up the clear plastic/label
        const topGlow = new THREE.PointLight(color, b * 50, 20)
        topGlow.position.set(x, 21, z)
        scene.add(topGlow)
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
console.log('3D preview refs:', { matrixWidth, matrixHeight, labels, globalLightColor, globalLightBrightness })
watch([matrixWidth, matrixHeight, labels, globalLightColor, globalLightBrightness, globalBackgroundColor, globalTextColor], () => {
  // Very crude rebuild: clear scene and rebuild
  while(scene.children.length > 0){ 
    scene.remove(scene.children[0]) 
  }
  buildProceduralDeck()
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
