<template>
  <div class="app-container" :class="{ 'preview-mode': previewMode, 'is-dragging-global': isDragging }">
    <header class="app-header">
      <div class="header-content">
        <div class="logo-area">
          <h1>LocalDeck Label Studio</h1>
          <p class="subtitle">Design perfect keycap labels</p>
        </div>
        <div class="settings">
          <div class="setting-group">
            <label>Width (mm)</label>
            <input type="number" v-model.number="labelWidth" step="0.1" />
          </div>
          <div class="setting-group">
            <label>Height (mm)</label>
            <input type="number" v-model.number="labelHeight" step="0.1" />
          </div>

          <button @click="previewMode = true" class="secondary preview-toggle-btn">
            <span class="iconify" data-icon="mdi:eye-outline"></span> Preview
          </button>
          <button @click="printLabels" class="primary print-btn">
            <span class="iconify" data-icon="mdi:printer"></span> Print
          </button>
        </div>
      </div>
    </header>

    <main class="app-main">
      <div class="workspace">
        
        <!-- Left: Split view (LocalDeck Top, Library Bottom) -->
        <div class="grid-section">
          
          <!-- LocalDeck Preview (Fixed 6x4) -->
          <div class="section-header device-header">
            <h2>LocalDeck Preview</h2>
            <span class="badge">Included in print (Max 24)</span>
            <div class="spacer"></div>
            
            <div class="setting-group" style="margin-right: 1rem; cursor: pointer;" @click="darkRoom = !darkRoom" title="Toggle Room Lighting">
              <span class="iconify" :data-icon="darkRoom ? 'mdi:weather-night' : 'mdi:weather-sunny'" style="font-size: 1.5rem; color: var(--text-muted);"></span>
            </div>

            <div class="setting-group" style="margin-right: 1rem;">
              <select v-model="labelMaterial">
                <option value="transparent">Transparent Film</option>
                <option value="thin-paper">Thin Paper</option>
                <option value="thick-paper">Thick Paper</option>
              </select>
            </div>

            <div class="setting-group global-light-group" style="margin-right: 0;">
              <span class="iconify" data-icon="mdi:led-on" style="color: var(--text-muted); font-size: 1.2rem;"></span>
              <div class="light-controls">
                <input type="color" v-model="globalLightColor" title="Global LED Color" />
                <input type="range" v-model.number="globalLightBrightness" min="0" max="100" title="Global Brightness" style="width: 60px" />
              </div>
            </div>
          </div>
          <div class="device-preview-container">
            <div class="localdeck-device">
              <div class="device-grid">
                <!-- Selected Labels -->
                <div 
                  v-for="(label, index) in printedLabels.slice(0, 24)"
                  :key="'deck-' + label.id"
                  class="device-slot"
                  :class="{ 
                    'is-selected': selectedIndex === labels.indexOf(label),
                    'is-drag-over': dragOverTarget === 'deck-' + label.id
                  }"
                  @click="selectedIndex = labels.indexOf(label)"
                  draggable="true"
                  @dragstart="onDragStart($event, label)"
                  @dragenter.prevent="dragOverTarget = 'deck-' + label.id"
                  @dragleave="dragOverTarget = null"
                  @dragend="onDragEnd"
                  @dragover.prevent
                  @drop="onDropDeckSlot($event, label)"
                >
                  <LabelPreview 
                    :label="label" 
                    :width="labelWidth" 
                    :height="labelHeight"
                    :scale="1.5"
                    :material="labelMaterial"
                    :globalLightColor="globalLightColor"
                    :globalLightBrightness="globalLightBrightness"
                    :globalTextSize="globalTextSize"
                    :globalTextColor="globalTextColor"
                    :globalIconSize="globalIconSize"
                    :globalIconColor="globalIconColor"
                    :printMode="false"
                    :darkRoom="darkRoom"
                  />
                  <div class="item-overlay" v-if="selectedIndex === labels.indexOf(label)">
                    <span class="iconify" data-icon="mdi:pencil"></span>
                  </div>
                </div>
                <!-- Empty Slots for the remainder of 24 -->
                <div 
                  v-for="i in Math.max(0, 24 - printedLabels.length)"
                  :key="'empty-' + i"
                  class="device-slot empty-slot"
                  :class="{ 'is-drag-over': dragOverTarget === 'empty-' + i }"
                  :style="{ width: `calc((${labelWidth + 4}mm) * 1.5)`, height: `calc((${labelHeight + 4}mm) * 1.5)` }"
                  @dragenter.prevent="dragOverTarget = 'empty-' + i"
                  @dragleave="dragOverTarget = null"
                  @dragend="onDragEnd"
                  @dragover.prevent
                  @drop="onDropEmptySlot($event)"
                >
                </div>
              </div>
            </div>
          </div>

          <!-- Label Library (Flexible Grid) -->
          <div class="section-header">
            <h2>Label Library</h2>
            <span class="badge">{{ labels.length }} items</span>
            
            <button v-if="labels.length < 24" @click="fillTo24" class="fill-btn" title="Fill up to 24 labels">
              <span class="iconify" data-icon="mdi:playlist-plus"></span> Fill to 24
            </button>
            
            <div class="spacer"></div>
            <div class="zoom-controls">
              <span class="iconify" data-icon="mdi:magnify-minus"></span>
              <input type="range" v-model.number="zoomLevel" min="1" max="6" step="0.5" title="Zoom Level" />
              <span class="iconify" data-icon="mdi:magnify-plus"></span>
              <span class="zoom-text">{{ zoomLevel }}x</span>
            </div>
          </div>
          
          <div class="interactive-grid">
            <div 
              v-for="(label, index) in labels" 
              :key="label.id"
              class="grid-item-wrapper"
              :class="{ 
                'is-selected': selectedIndex === index,
                'is-excluded': label.print === false,
                'is-in-preview': printedLabels.slice(0, 24).includes(label),
                'is-drag-over': dragOverTarget === 'lib-' + label.id
              }"
              @click="selectedIndex = index"
              draggable="true"
              @dragstart="onDragStart($event, label)"
              @dragenter.prevent="dragOverTarget = 'lib-' + label.id"
              @dragleave="dragOverTarget = null"
              @dragend="onDragEnd"
              @dragover.prevent
              @drop="onDropLibrary($event, label)"
            >
              <LabelPreview 
                :label="label" 
                :width="labelWidth" 
                :height="labelHeight"
                :scale="zoomLevel"
                :material="labelMaterial"
                :globalLightColor="globalLightColor"
                :globalLightBrightness="globalLightBrightness"
                :globalTextSize="globalTextSize"
                :globalTextColor="globalTextColor"
                :globalIconSize="globalIconSize"
                :globalIconColor="globalIconColor"
                :printMode="false"
                :darkRoom="darkRoom"
              />
              <div class="item-overlay" v-if="selectedIndex === index">
                <span class="iconify" data-icon="mdi:pencil"></span>
              </div>
              <div class="excluded-overlay" v-if="label.print === false" title="Excluded from print">
                <span class="iconify" data-icon="mdi:printer-off"></span>
              </div>
            </div>
            
            <div 
              class="add-grid-item" 
              @click="addLabel"
              :style="{ width: `calc((${labelWidth + 4}mm) * ${zoomLevel})`, height: `calc((${labelHeight + 4}mm) * ${zoomLevel})` }"
              title="Add new label"
            >
              <span class="iconify" data-icon="mdi:plus"></span>
            </div>
          </div>
        </div>

        <!-- Right: Sidebar Editor (Detail) -->
        <aside class="sidebar-section">
          
          <div class="editor-panel global-panel">
            <div class="panel-header">
              <h2>Global Styles</h2>
            </div>
            <div class="panel-content">
              <div class="control-row">
                <div class="control-group half">
                  <label>Text Size (px)</label>
                  <input type="number" v-model.number="globalTextSize" min="6" max="32" />
                </div>
                <div class="control-group half">
                  <label>Text Color</label>
                  <input type="color" v-model="globalTextColor" class="color-picker" />
                </div>
              </div>
              <div class="control-row mt-2">
                <div class="control-group half">
                  <label>Icon Size (px)</label>
                  <input type="number" v-model.number="globalIconSize" min="10" max="64" />
                </div>
                <div class="control-group half">
                  <label>Icon Color</label>
                  <input type="color" v-model="globalIconColor" class="color-picker" />
                </div>
              </div>
            </div>
          </div>

          <div class="editor-panel detail-panel" v-if="selectedIndex !== null && labels[selectedIndex]">
            <div class="panel-header">
              <h2>Edit Label</h2>
              <div class="panel-actions">
                <button class="icon-btn" @click="duplicateSelected" title="Duplicate Label">
                  <span class="iconify" data-icon="mdi:content-copy"></span>
                </button>
                <button class="icon-btn danger-text" @click="removeSelected" title="Remove Label">
                  <span class="iconify" data-icon="mdi:trash-can-outline"></span>
                </button>
              </div>
            </div>
            
            <div class="panel-content">
              <LabelEditor 
                v-model="labels[selectedIndex]" 
              />
            </div>
          </div>
          
          <div class="empty-state detail-panel" v-else>
            <span class="iconify empty-icon" data-icon="mdi:cursor-default-click-outline"></span>
            <p>Select a label from the grid to edit its properties.</p>
          </div>
        </aside>
      </div>
    </main>

    <!-- Hidden in UI, visible in print OR preview mode -->
    <div id="print-area">
      <button v-if="previewMode" @click="previewMode = false" class="exit-preview-btn no-print">
        <span class="iconify" data-icon="mdi:close"></span> Exit Preview
      </button>
      <button v-if="previewMode" @click="printLabels" class="primary print-now-btn no-print">
        <span class="iconify" data-icon="mdi:printer"></span> Print Now
      </button>
      
      <div class="label-grid">
        <LabelPreview
          v-for="label in printedLabels"
          :key="label.id"
          :label="label"
          :width="labelWidth"
          :height="labelHeight"
          :scale="1"
          :material="labelMaterial"
          :globalLightColor="globalLightColor"
          :globalLightBrightness="globalLightBrightness"
          :globalTextSize="globalTextSize"
          :globalTextColor="globalTextColor"
          :globalIconSize="globalIconSize"
          :globalIconColor="globalIconColor"
          :printMode="true"
          :darkRoom="darkRoom"
        />
      </div>
    </div>

    <!-- Offscreen drag ghost for custom drag image -->
    <div style="position: absolute; top: -2000px; left: -2000px; pointer-events: none;">
      <div id="drag-ghost" style="background: rgba(16, 185, 129, 0.85); padding: 0.4rem 0.8rem; border-radius: 20px; color: white; display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; box-shadow: 0 4px 12px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.3); font-weight: 500; white-space: nowrap;">
        <span class="iconify" data-icon="mdi:cursor-move"></span>
        <span id="drag-ghost-text">Label</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import LabelEditor from './components/LabelEditor.vue'
import LabelPreview from './components/LabelPreview.vue'

const labelWidth = ref(14)
const labelHeight = ref(14)
const labelMaterial = ref('transparent')
const globalLightColor = ref('#10b981')
const globalLightBrightness = ref(80)
const globalTextSize = ref(10)
const globalTextColor = ref('#000000')
const globalIconSize = ref(24)
const globalIconColor = ref('#000000')
const zoomLevel = ref(2)
const darkRoom = ref(true)
const labels = ref([])
const isDragging = ref(false)
const dragOverTarget = ref(null)
const selectedIndex = ref(null)
const previewMode = ref(false)

const printedLabels = computed(() => labels.value.filter(l => l.print !== false))

const homeAutomationDefaults = [
  { text: 'Living Room', icon: 'mdi:sofa' },
  { text: 'Kitchen', icon: 'mdi:stove' },
  { text: 'Bedroom', icon: 'mdi:bed-empty' },
  { text: 'Office', icon: 'mdi:desk' },
  { text: 'Bathroom', icon: 'mdi:shower' },
  { text: 'Garage', icon: 'mdi:garage' },
  { text: 'Lights', icon: 'mdi:lightbulb' },
  { text: 'Thermostat', icon: 'mdi:thermostat' },
  { text: 'AC', icon: 'mdi:air-conditioner' },
  { text: 'Heater', icon: 'mdi:radiator' },
  { text: 'Fan', icon: 'mdi:fan' },
  { text: 'TV', icon: 'mdi:television' },
  { text: 'Music', icon: 'mdi:music' },
  { text: 'Speakers', icon: 'mdi:speaker' },
  { text: 'Vacuum', icon: 'mdi:robot-vacuum' },
  { text: 'Blinds', icon: 'mdi:blinds' },
  { text: 'Curtains', icon: 'mdi:curtains' },
  { text: 'Lock', icon: 'mdi:lock' },
  { text: 'Unlock', icon: 'mdi:lock-open' },
  { text: 'Camera', icon: 'mdi:cctv' },
  { text: 'Alarm', icon: 'mdi:alarm-bell' },
  { text: 'Motion', icon: 'mdi:motion-sensor' },
  { text: 'Night Mode', icon: 'mdi:weather-night' },
  { text: 'Away Mode', icon: 'mdi:car' },
  { text: 'All Off', icon: 'mdi:power' }
]

const getRandomDefault = () => {
  const template = homeAutomationDefaults[Math.floor(Math.random() * homeAutomationDefaults.length)]
  return { ...template }
}

const generateId = () => Math.random().toString(36).substr(2, 9)

const loadState = () => {
  const saved = localStorage.getItem('localdeck-labels')
  let loaded = false
  if (saved) {
    try {
      const data = JSON.parse(saved)
      if (data.width) labelWidth.value = data.width
      if (data.height) labelHeight.value = data.height
      if (data.material) labelMaterial.value = data.material
      if (data.globalLightColor) globalLightColor.value = data.globalLightColor
      if (data.globalLightBrightness !== undefined) globalLightBrightness.value = data.globalLightBrightness
      if (data.globalTextSize !== undefined) globalTextSize.value = data.globalTextSize
      if (data.globalTextColor) globalTextColor.value = data.globalTextColor
      if (data.globalIconSize !== undefined) globalIconSize.value = data.globalIconSize
      if (data.globalIconColor) globalIconColor.value = data.globalIconColor
      if (data.zoomLevel) zoomLevel.value = data.zoomLevel
      if (data.labels && data.labels.length > 0) {
        labels.value = data.labels.map(l => {
          if (l.textSize === 10 && l.textColor === '#000000') { l.textSize = null; l.textColor = null; }
          if (l.iconSize === 24 && l.iconColor === '#000000') { l.iconSize = null; l.iconColor = null; }
          return l;
        })
        loaded = true
      }
    } catch (e) {
      console.error('Failed to load saved labels', e)
    }
  }
  return loaded
}

const saveState = () => {
  localStorage.setItem('localdeck-labels', JSON.stringify({
    width: labelWidth.value,
    height: labelHeight.value,
    material: labelMaterial.value,
    globalLightColor: globalLightColor.value,
    globalLightBrightness: globalLightBrightness.value,
    globalTextSize: globalTextSize.value,
    globalTextColor: globalTextColor.value,
    globalIconSize: globalIconSize.value,
    globalIconColor: globalIconColor.value,
    zoomLevel: zoomLevel.value,
    labels: labels.value
  }))
}

const addLabel = (overrides = {}) => {
  const newProps = Object.keys(overrides).length > 0 ? overrides : { text: 'New Label', icon: 'mdi:home' }
  
  labels.value.push({
    id: generateId(),
    text: newProps.text,
    textSize: null,
    textColor: null,
    icon: newProps.icon,
    iconSize: null,
    iconColor: null,
    image: null,
    lightColor: null,
    lightBrightness: null,
    print: true
  })
}

const fillTo24 = () => {
  const needed = 24 - labels.value.length
  if (needed > 0) {
    for (let i = 0; i < needed; i++) {
      addLabel(getRandomDefault())
    }
  }
}

const duplicateSelected = () => {
  if (selectedIndex.value === null) return
  const toDuplicate = labels.value[selectedIndex.value]
  const newIndex = selectedIndex.value + 1
  labels.value.splice(newIndex, 0, {
    ...toDuplicate,
    id: generateId()
  })
  selectedIndex.value = newIndex
}

const removeSelected = () => {
  if (selectedIndex.value === null) return
  labels.value.splice(selectedIndex.value, 1)
  
  if (labels.value.length === 0) {
    selectedIndex.value = null
  } else if (selectedIndex.value >= labels.value.length) {
    selectedIndex.value = labels.value.length - 1
  }
}

const printLabels = async () => {
  selectedIndex.value = null
  await nextTick()
  window.print()
}

// Drag and Drop Logic
const onDragStart = (e, label) => {
  isDragging.value = true
  e.dataTransfer.setData('text/plain', label.id)
  e.dataTransfer.effectAllowed = 'move'
  
  // Use custom compact drag badge
  const ghost = document.getElementById('drag-ghost')
  const ghostText = document.getElementById('drag-ghost-text')
  if (ghost && ghostText) {
    ghostText.textContent = label.text || 'Label'
    e.dataTransfer.setDragImage(ghost, 15, 15)
  }
}

const onDragEnd = () => {
  isDragging.value = false
  dragOverTarget.value = null
}

const onDropDeckSlot = (e, targetLabel) => {
  dragOverTarget.value = null
  const draggedId = e.dataTransfer.getData('text/plain')
  if (!draggedId) return
  
  const draggedIndex = labels.value.findIndex(l => l.id === draggedId)
  if (draggedIndex === -1) return
  
  const draggedLabel = labels.value[draggedIndex]
  draggedLabel.print = true 
  
  if (targetLabel && targetLabel.id !== draggedId) {
    const targetIndex = labels.value.findIndex(l => l.id === targetLabel.id)
    labels.value[draggedIndex] = targetLabel
    labels.value[targetIndex] = draggedLabel
    
    if (selectedIndex.value === draggedIndex) selectedIndex.value = targetIndex
    else if (selectedIndex.value === targetIndex) selectedIndex.value = draggedIndex
  }
}

const onDropEmptySlot = (e) => {
  dragOverTarget.value = null
  const draggedId = e.dataTransfer.getData('text/plain')
  if (!draggedId) return
  
  const draggedIndex = labels.value.findIndex(l => l.id === draggedId)
  if (draggedIndex === -1) return
  
  const draggedLabel = labels.value[draggedIndex]
  draggedLabel.print = true
  
  labels.value.splice(draggedIndex, 1)
  labels.value.push(draggedLabel)
  if (selectedIndex.value === draggedIndex) selectedIndex.value = labels.value.length - 1
}

const onDropLibrary = (e, targetLabel) => {
  onDropDeckSlot(e, targetLabel)
}

watch([labelWidth, labelHeight, labelMaterial, globalLightColor, globalLightBrightness, globalTextSize, globalTextColor, globalIconSize, globalIconColor, zoomLevel, labels], saveState, { deep: true })

onMounted(() => {
  const loaded = loadState()
  if (!loaded) {
    fillTo24()
    selectedIndex.value = 0
  } else if (labels.value.length > 0) {
    selectedIndex.value = 0
  }
})
</script>

<style scoped>
/* Prevent dragleave flickering by making children un-hoverable during drag */
.is-dragging-global .device-slot *,
.is-dragging-global .empty-slot *,
.is-dragging-global .grid-item-wrapper * {
  pointer-events: none !important;
}

.app-container {
  padding-top: 5rem;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--card-border);
  z-index: 50;
}

.header-content {
  max-width: 1600px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-area h1 {
  font-size: 1.5rem;
  background: linear-gradient(to right, #10b981, #3b82f6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.settings {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.setting-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.setting-group label {
  margin-bottom: 0;
  white-space: nowrap;
}

.setting-group input[type="number"] {
  width: 70px;
}
.setting-group select {
  width: auto;
}

.global-light-group {
  background: rgba(255,255,255,0.05);
  padding: 0.25rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--card-border);
}

.light-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.light-controls input[type="color"] {
  width: 32px;
  height: 28px;
  padding: 0;
  border-radius: 4px;
}

.light-controls input[type="range"] {
  width: 80px;
}

.print-btn, .preview-toggle-btn {
  height: 42px;
}

.app-main {
  flex: 1;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
  padding: 2rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.workspace {
  display: flex;
  gap: 2rem;
  height: calc(100vh - 9rem);
}

.grid-section {
  flex: 1;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
}

.section-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--card-border);
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(15, 23, 42, 0.9);
  position: sticky;
  top: 0;
  z-index: 30;
}

.device-header {
  border-bottom: none;
}

.device-preview-container {
  padding: 0 2rem 2rem 2rem;
  display: flex;
  justify-content: center;
  border-bottom: 2px dashed var(--card-border);
}

.localdeck-device {
  background: #1a1b1e;
  padding: 1rem;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.05);
  border: 1px solid #333;
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(6, max-content);
  gap: 6px;
}

.device-slot, .empty-slot, .grid-item-wrapper {
  position: relative;
  cursor: grab;
  border-radius: 6px;
  transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.15s ease;
}
.device-slot:active, .grid-item-wrapper:active {
  cursor: grabbing;
}
.device-slot.is-selected {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Drag Over animations */
.device-slot.is-drag-over,
.empty-slot.is-drag-over,
.grid-item-wrapper.is-drag-over {
  transform: scale(1.08) !important;
  outline: 3px solid var(--primary) !important;
  outline-offset: 4px !important;
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.6) !important;
  z-index: 100 !important;
}

.empty-slot {
  background: rgba(255,255,255,0.02);
  border: 1px dashed rgba(255,255,255,0.1);
}

.section-header h2 {
  font-size: 1.1rem;
  margin: 0;
}

.badge {
  background: rgba(255,255,255,0.1);
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.fill-btn {
  background: transparent;
  color: var(--primary);
  border: 1px dashed var(--primary);
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-left: 0.5rem;
}
.fill-btn:hover {
  background: rgba(16, 185, 129, 0.1);
}

.spacer {
  flex: 1;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255,255,255,0.05);
  padding: 0.25rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--card-border);
}

.zoom-controls .iconify {
  color: var(--text-muted);
  font-size: 1.1rem;
}

.zoom-controls input[type="range"] {
  width: 100px;
}

.zoom-text {
  font-size: 0.8rem;
  color: var(--text-muted);
  min-width: 3ch;
  text-align: right;
}

.interactive-grid {
  padding: 2rem;
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  align-content: flex-start;
}


.grid-item-wrapper.is-excluded {
  opacity: 0.5;
  filter: grayscale(0.8);
}

.grid-item-wrapper.is-in-preview {
  outline: 2px solid rgba(16, 185, 129, 0.6);
  outline-offset: 4px;
}

.grid-item-wrapper:hover {
  transform: scale(1.02);
}

.grid-item-wrapper.is-selected {
  outline: 3px solid var(--primary);
  outline-offset: 4px;
}

.item-overlay {
  position: absolute;
  top: -12px;
  right: -12px;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  z-index: 20;
}

.excluded-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.7);
  color: white;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  z-index: 20;
  pointer-events: none;
}

.add-grid-item {
  border: 2px dashed var(--card-border);
  border-radius: 6px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.2s;
  background: rgba(255,255,255,0.02);
}

.add-grid-item:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(16, 185, 129, 0.05);
}
.add-grid-item .iconify {
  font-size: 1.5rem;
}

.sidebar-section {
  width: 400px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%;
}

.global-panel {
  flex: none;
  height: auto;
}

.detail-panel {
  flex: 1;
  min-height: 0;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-group label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted);
}

.control-group input[type="number"] {
  width: 100%;
}

.control-row {
  display: flex;
  gap: 1rem;
}

.half {
  flex: 1;
}

.color-picker {
  height: 38px;
  padding: 0;
  border-radius: 6px;
  width: 100%;
  cursor: pointer;
}

.mt-2 {
  margin-top: 0.5rem;
}

.editor-panel {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--card-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0,0,0,0.1);
}

.panel-header h2 {
  font-size: 1.1rem;
  margin: 0;
}

.panel-actions {
  display: flex;
  gap: 0.25rem;
}

.icon-btn {
  padding: 0.4rem;
  background: transparent;
  color: var(--text-muted);
  box-shadow: none;
}
.icon-btn:hover {
  background: rgba(255,255,255,0.1);
  color: var(--text-main);
}
.danger-text:hover {
  color: var(--danger);
}

.panel-content {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.empty-state {
  background: var(--card-bg);
  border: 1px dashed var(--card-border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--text-muted);
  text-align: center;
  padding: 2rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

/* Print Area and Preview Mode */
#print-area {
  display: none;
}

.exit-preview-btn {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 10000;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid var(--card-border);
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}

.print-now-btn {
  position: fixed;
  top: 1rem;
  right: 150px;
  z-index: 10000;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
}

.preview-mode {
  background-color: white;
}

.preview-mode .app-header, 
.preview-mode .app-main {
  display: none !important;
}

.preview-mode #print-area {
  display: block !important;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  min-height: 100vh;
  background: white;
  padding: 2cm;
}

@media print {
  .app-container {
    height: auto;
    padding: 0;
  }
  .app-header, .app-main {
    display: none !important;
  }
  #print-area {
    display: block !important;
    padding: 0;
  }
  .no-print {
    display: none !important;
  }
}
</style>
