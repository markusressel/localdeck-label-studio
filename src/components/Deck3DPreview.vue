<template>
  <div class="deck-3d-preview" ref="containerRef">
    <div v-if="isLoading" class="loading-overlay">Initializing 3D Engine...</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useStore } from '../composables/useStore'

const containerRef = ref(null)
const isLoading = ref(true)

const { deckWidth, deckHeight, labels, globalLightColor, globalLightBrightness } = useStore()

let scene, camera, renderer, controls
let animationFrameId

onMounted(() => {
  initThreeJS()
  buildProceduralDeck()
  animate()
  isLoading.value = false
})

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  if (renderer) renderer.dispose()
})

const initThreeJS = () => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#1e1e1e')

  camera = new THREE.PerspectiveCamera(45, containerRef.value.clientWidth / containerRef.value.clientHeight, 0.1, 1000)
  camera.position.set(0, 150, 200)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
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
  const pcbWidth = deckWidth.value * 20
  const pcbHeight = deckHeight.value * 20
  const pcbGeo = new THREE.BoxGeometry(pcbWidth, 2, pcbHeight)
  const pcbMat = new THREE.MeshStandardMaterial({ color: 0x113311, roughness: 0.8 })
  const pcbMesh = new THREE.Mesh(pcbGeo, pcbMat)
  pcbMesh.receiveShadow = true
  scene.add(pcbMesh)

  // Materials
  const switchMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 })
  const stemMat = new THREE.MeshStandardMaterial({ color: 0xaa2222, roughness: 0.4 })
  const capBaseMat = new THREE.MeshPhysicalMaterial({ 
    color: 0xffffff, 
    roughness: 0.2,
    transmission: 0.1, // Slight translucency for plastic
    thickness: 1.5
  })
  const capClearMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 1.0, // Glass-like
    roughness: 0.05,
    ior: 1.5
  })

  // Build grid
  const startX = -pcbWidth / 2 + 10
  const startZ = -pcbHeight / 2 + 10

  for (let r = 0; r < deckHeight.value; r++) {
    for (let c = 0; c < deckWidth.value; c++) {
      const x = startX + c * 20
      const z = startZ + r * 20
      const index = (r * deckWidth.value) + c
      const label = labels.value[index] || {}

      // Switch Base
      const switchMesh = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 14), switchMat)
      switchMesh.position.set(x, 5, z)
      switchMesh.castShadow = true
      scene.add(switchMesh)

      // Stem
      const stemMesh = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), stemMat)
      stemMesh.position.set(x, 11, z)
      scene.add(stemMesh)

      // Cap Base (White)
      const capBase = new THREE.Mesh(new THREE.BoxGeometry(18, 6, 18), capBaseMat)
      capBase.position.set(x, 15, z)
      capBase.castShadow = true
      scene.add(capBase)

      // Cap Clear Insert
      const capClear = new THREE.Mesh(new THREE.BoxGeometry(16, 2, 16), capClearMat)
      capClear.position.set(x, 19, z)
      scene.add(capClear)

      // LED Light
      const isEnabled = label.lightEnabled !== false
      if (isEnabled) {
        const color = label.lightColor || globalLightColor.value || '#10b981'
        const b = (label.lightBrightness ?? globalLightBrightness.value) / 100
        const pointLight = new THREE.PointLight(color, b * 20, 30) // intensity and distance
        pointLight.position.set(x, 7, z - 4) // Positioned near top of switch
        scene.add(pointLight)

        // Helper to see LED
        // const sphereSize = 1;
        // const pointLightHelper = new THREE.PointLightHelper( pointLight, sphereSize );
        // scene.add( pointLightHelper );
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
watch([deckWidth, deckHeight, labels, globalLightColor, globalLightBrightness], () => {
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
  background: #1e1e1e;
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
