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

          <input type="file" ref="fileInput" @change="importData" accept=".json" style="display: none" />
          <button @click="triggerImport" class="secondary import-btn">
            <span class="iconify" data-icon="mdi:import"></span> Import
          </button>
          <button @click="exportData" class="secondary export-btn">
            <span class="iconify" data-icon="mdi:export"></span> Export
          </button>
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
            <span class="badge">Physical Layout (Max 24)</span>
            <div class="spacer"></div>
            
            <div class="setting-group" style="margin-right: 1rem; cursor: pointer;" @click="darkRoom = !darkRoom" title="Toggle Room Lighting">
              <span :key="darkRoom ? 'night' : 'sunny'" class="iconify" :data-icon="darkRoom ? 'mdi:weather-night' : 'mdi:weather-sunny'" style="font-size: 1.5rem; color: var(--text-muted);"></span>
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
                <ColorPicker v-model="globalLightColor" title="Global LED Color" />
                <input type="range" v-model.number="globalLightBrightness" min="0" max="100" title="Global Brightness" style="width: 60px" />
                <select v-model="globalLightEffect" title="Light Effect" style="width: auto; margin-left: 0.5rem; padding: 0.2rem; background: rgba(0,0,0,0.2); border: 1px solid var(--card-border); color: white; border-radius: 4px;">
                  <option value="static">Static</option>
                  <option value="breathing">Breathing</option>
                  <option value="rainbow">Rainbow</option>
                </select>
              </div>
            </div>
          </div>
          <div class="device-preview-container">
            <div class="localdeck-device">
              <div class="device-grid">
                
                <!-- Fixed 24 Grid Slots -->
                <div 
                  v-for="i in 24"
                  :key="'deck-slot-' + (i - 1)"
                  class="device-slot"
                  :class="{ 
                    'is-selected': getLabelAtSlot(i - 1) && selectedId === getLabelAtSlot(i - 1).id,
                    'is-drag-over': dragOverTarget === 'deck-' + (i - 1),
                    'empty-slot': !getLabelAtSlot(i - 1)
                  }"
                  @click="getLabelAtSlot(i - 1) ? selectedId = getLabelAtSlot(i - 1).id : null"
                  :draggable="!!getLabelAtSlot(i - 1)"
                  @dragstart="getLabelAtSlot(i - 1) && onDragStart($event, getLabelAtSlot(i - 1))"
                  @dragenter.prevent="dragOverTarget = 'deck-' + (i - 1)"
                  @dragleave.prevent="dragOverTarget = null"
                  @dragend="onDragEnd"
                  @dragover.prevent="dragOverTarget = 'deck-' + (i - 1)"
                  @drop="onDropDeckSlot($event, i - 1)"
                  :style="!getLabelAtSlot(i - 1) ? { width: `calc((${labelWidth + 4}mm) * 1.5)`, height: `calc((${labelHeight + 4}mm) * 1.5)` } : {}"
                >
                  <LabelPreview 
                    v-if="getLabelAtSlot(i - 1)"
                    :label="getLabelAtSlot(i - 1)" 
                    :width="labelWidth" 
                    :height="labelHeight"
                    :scale="1.5"
                    :material="labelMaterial"
                    :globalLightColor="globalLightColor"
                    :globalLightBrightness="globalLightBrightness"
                    :globalLightEffect="globalLightEffect"
                    :globalTextSize="globalTextSize"
                    :globalTextColor="globalTextColor"
                    :globalIconSize="globalIconSize"
                    :globalIconColor="globalIconColor"
                    :printMode="false"
                    :darkRoom="darkRoom"
                  />
                  <div class="item-overlay" v-if="getLabelAtSlot(i - 1) && selectedId === getLabelAtSlot(i - 1).id">
                    <span class="iconify" data-icon="mdi:pencil"></span>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <!-- Label Library (Flexible Grid) -->
          <div class="section-header">
            <h2>Label Library</h2>
            <span class="badge">{{ labels.length }} items</span>
            
            <button @click="fillTo24" class="fill-btn" title="Fill empty deck slots with defaults">
              <span class="iconify" data-icon="mdi:playlist-plus"></span> Fill Empty Deck Slots
            </button>
            
            <div class="spacer"></div>
            <div class="zoom-controls">
              <span class="iconify zoom-btn" data-icon="mdi:magnify-minus" @click="zoomLevel = Math.max(1, zoomLevel - 0.5)"></span>
              <input type="range" v-model.number="zoomLevel" min="1" max="6" step="0.5" title="Zoom Level" />
              <span class="iconify zoom-btn" data-icon="mdi:magnify-plus" @click="zoomLevel = Math.min(6, zoomLevel + 0.5)"></span>
              <span class="zoom-text">{{ zoomLevel }}x</span>
            </div>
          </div>
          
          <div class="interactive-grid">
            <div 
              v-for="(label, index) in labels" 
              :key="label.id"
              class="grid-item-wrapper"
              :class="{ 
                'is-selected': selectedId === label.id,
                'is-in-preview': label.deckSlot !== null,
                'is-drag-over': dragOverTarget === 'lib-' + label.id
              }"
              @click="selectedId = label.id"
              draggable="true"
              @dragstart="onDragStart($event, label)"
              @dragenter.prevent="dragOverTarget = 'lib-' + label.id"
              @dragleave.prevent="dragOverTarget = null"
              @dragend="onDragEnd"
              @dragover.prevent="dragOverTarget = 'lib-' + label.id"
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
                :globalLightEffect="globalLightEffect"
                :globalTextSize="globalTextSize"
                :globalTextColor="globalTextColor"
                :globalIconSize="globalIconSize"
                :globalIconColor="globalIconColor"
                :printMode="false"
                :darkRoom="darkRoom"
              />
              <div class="item-overlay" v-if="selectedId === label.id">
                <span class="iconify" data-icon="mdi:pencil"></span>
              </div>
            </div>
            
            <div 
              class="add-grid-item" 
              @click="addLabel({}, null)"
              :style="{ width: `calc((${labelWidth + 4}mm) * ${zoomLevel})`, height: `calc((${labelHeight + 4}mm) * ${zoomLevel})` }"
              title="Add new label to library"
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
                  <ColorPicker v-model="globalTextColor" />
                </div>
              </div>
              <div class="control-row mt-2">
                <div class="control-group half">
                  <label>Icon Size (px)</label>
                  <input type="number" v-model.number="globalIconSize" min="10" max="64" />
                </div>
                <div class="control-group half">
                  <label>Icon Color</label>
                  <ColorPicker v-model="globalIconColor" />
                </div>
              </div>
            </div>
          </div>

          <div class="editor-panel detail-panel" v-if="selectedItemIndex !== null">
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
                v-model="labels[selectedItemIndex]" 
              />
            </div>
          </div>
          
          <div class="empty-state detail-panel" v-else>
            <span class="iconify empty-icon" data-icon="mdi:cursor-default-click-outline"></span>
            <p>Select a label to edit its properties.</p>
          </div>
        </aside>
      </div>
    </main>

    <!-- Hidden in UI, visible in print OR preview mode -->
    <div id="print-area">
      <div class="print-preview-sidebar no-print" v-if="previewMode">
        <h2>Print Settings</h2>
        
        <div class="setting-group-vertical">
          <label>Paper Format</label>
          <select v-model="printFormat">
            <option value="A4">A4 (Portrait)</option>
            <option value="A4-L">A4 (Landscape)</option>
            <option value="Letter">US Letter</option>
          </select>
        </div>

        <div class="setting-group-vertical">
          <label>Skip Positions</label>
          <input type="number" v-model.number="printSkip" min="0" />
          <small>Leave empty spaces at the beginning.</small>
        </div>

        <div class="setting-group-vertical" style="flex: 1; overflow: hidden; display: flex; flex-direction: column;">
          <label>Labels to Print</label>
          <div class="checklist-actions" style="margin-bottom: 0.5rem; display: flex; gap: 0.5rem;">
             <button @click="selectAllPrint" class="secondary" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">All</button>
             <button @click="selectNonePrint" class="secondary" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">None</button>
             <button @click="selectDeckPrint" class="secondary" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">Deck Only</button>
          </div>
          <div class="labels-checklist" style="overflow-y: auto; flex: 1; border: 1px solid var(--card-border); padding: 0.5rem; border-radius: 4px;">
            <div v-for="label in labels" :key="label.id" class="checklist-item" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <input type="checkbox" :id="'chk-'+label.id" :value="label.id" v-model="selectedPrintIds" />
              <label :for="'chk-'+label.id" style="font-size: 0.85rem; margin: 0; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                <span v-if="label.icon" class="iconify" :data-icon="label.icon" style="margin-right: 4px; vertical-align: middle;"></span>
                {{ label.text || 'Unnamed' }}
              </label>
            </div>
          </div>
        </div>

        <div class="print-actions-bottom" style="margin-top: auto; display: flex; flex-direction: column; gap: 0.5rem;">
          <button @click="printLabels" class="primary print-now-btn" style="width: 100%;">
            <span class="iconify" data-icon="mdi:printer"></span> Print
          </button>
          <button @click="previewMode = false" class="secondary exit-preview-btn" style="width: 100%;">
            Cancel
          </button>
        </div>
      </div>
      
      <div class="print-preview-content">
        <div class="paper-sheet" :class="'format-' + printFormat">
          <div class="paper-ruler no-print"></div>
          
          <div class="label-grid">
            <div class="empty-print-slot" v-for="i in printSkip" :key="'skip-'+i" :style="{ width: labelWidth + 'mm', height: labelHeight + 'mm' }"></div>
            <LabelPreview
              v-for="label in explicitlyPrintedLabels"
              :key="'print-' + label.id"
              :label="label"
              :width="labelWidth"
              :height="labelHeight"
              :scale="1"
              :material="labelMaterial"
              :globalLightColor="globalLightColor"
              :globalLightBrightness="globalLightBrightness"
              :globalLightEffect="globalLightEffect"
              :globalTextSize="globalTextSize"
              :globalTextColor="globalTextColor"
              :globalIconSize="globalIconSize"
              :globalIconColor="globalIconColor"
              :printMode="true"
              :darkRoom="darkRoom"
            />
          </div>
        </div>
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
import ColorPicker from './components/ColorPicker.vue'

const labelWidth = ref(14)
const labelHeight = ref(14)
const labelMaterial = ref('transparent')
const globalLightColor = ref('#10b981')
const globalLightBrightness = ref(80)
const globalLightEffect = ref('static')
const globalTextSize = ref(10)
const globalTextColor = ref('#000000')
const globalIconSize = ref(24)
const globalIconColor = ref('#000000')
const zoomLevel = ref(2)
const darkRoom = ref(true)
const labels = ref([])
const isDragging = ref(false)
const dragOverTarget = ref(null)
const selectedId = ref(null)
const previewMode = ref(false)
const fileInput = ref(null)

const printFormat = ref('A4')
const printSkip = ref(0)
const selectedPrintIds = ref([])

const getLabelAtSlot = (slotIndex) => {
  return labels.value.find(l => l.deckSlot === slotIndex) || null
}

const printedLabels = computed(() => {
  return labels.value.filter(l => l.deckSlot !== null).sort((a, b) => a.deckSlot - b.deckSlot)
})

watch(previewMode, (newVal) => {
  if (newVal) {
    selectedPrintIds.value = printedLabels.value.map(l => l.id)
  }
})

const explicitlyPrintedLabels = computed(() => {
  // Sort them as they appear in the UI: first deck slots, then library order, or just keep library order
  return labels.value.filter(l => selectedPrintIds.value.includes(l.id))
})

const selectAllPrint = () => { selectedPrintIds.value = labels.value.map(l => l.id) }
const selectNonePrint = () => { selectedPrintIds.value = [] }
const selectDeckPrint = () => { selectedPrintIds.value = printedLabels.value.map(l => l.id) }

const selectedItemIndex = computed(() => {
  if (!selectedId.value) return null
  const idx = labels.value.findIndex(l => l.id === selectedId.value)
  return idx !== -1 ? idx : null
})

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
      if (data.globalLightEffect) globalLightEffect.value = data.globalLightEffect
      if (data.globalTextSize !== undefined) globalTextSize.value = data.globalTextSize
      if (data.globalTextColor) globalTextColor.value = data.globalTextColor
      if (data.globalIconSize !== undefined) globalIconSize.value = data.globalIconSize
      if (data.globalIconColor) globalIconColor.value = data.globalIconColor
      if (data.zoomLevel) zoomLevel.value = data.zoomLevel
      if (data.selectedId) selectedId.value = data.selectedId
      if (data.labels && data.labels.length > 0) {
        let nextDeckSlot = 0;
        labels.value = data.labels.map((l, index) => {
          if (l.textSize === 10 && l.textColor === '#000000') { l.textSize = null; l.textColor = null; }
          if (l.iconSize === 24 && l.iconColor === '#000000') { l.iconSize = null; l.iconColor = null; }
          
          if (l.deckSlot === undefined) {
             if (l.print !== false && nextDeckSlot < 24) {
               l.deckSlot = nextDeckSlot;
               nextDeckSlot++;
             } else {
               l.deckSlot = null;
             }
             delete l.print;
          }
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
    globalLightEffect: globalLightEffect.value,
    globalTextSize: globalTextSize.value,
    globalTextColor: globalTextColor.value,
    globalIconSize: globalIconSize.value,
    globalIconColor: globalIconColor.value,
    zoomLevel: zoomLevel.value,
    selectedId: selectedId.value,
    labels: labels.value
  }))
}

const addLabel = (overrides = {}, slot = null) => {
  const newProps = Object.keys(overrides).length > 0 ? overrides : { text: 'New Label', icon: 'mdi:home' }
  const newId = generateId()
  labels.value.push({
    id: newId,
    deckSlot: slot,
    text: newProps.text,
    textSize: null,
    textColor: null,
    icon: newProps.icon,
    iconSize: null,
    iconColor: null,
    image: null,
    lightColor: null,
    lightBrightness: null
  })
  return newId
}

const fillTo24 = () => {
  for (let i = 0; i < 24; i++) {
    if (!getLabelAtSlot(i)) {
      addLabel(getRandomDefault(), i)
    }
  }
}

const duplicateSelected = () => {
  if (selectedItemIndex.value === null) return
  const toDuplicate = labels.value[selectedItemIndex.value]
  const newId = generateId()
  const newIndex = selectedItemIndex.value + 1
  labels.value.splice(newIndex, 0, {
    ...toDuplicate,
    id: newId,
    deckSlot: null // Duplicates always go to library to prevent deck overlap
  })
  selectedId.value = newId
}

const removeSelected = () => {
  const idx = selectedItemIndex.value
  if (idx === null) return
  labels.value.splice(idx, 1)
  
  if (labels.value.length === 0) {
    selectedId.value = null
  } else if (idx >= labels.value.length) {
    selectedId.value = labels.value[labels.value.length - 1].id
  } else {
    selectedId.value = labels.value[idx].id
  }
}

const printLabels = async () => {
  selectedId.value = null
  await nextTick()
  window.print()
}

const exportData = () => {
  const dataToExport = {
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
  }
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2))
  const downloadAnchorNode = document.createElement('a')
  downloadAnchorNode.setAttribute("href", dataStr)
  downloadAnchorNode.setAttribute("download", "localdeck_labels.json")
  document.body.appendChild(downloadAnchorNode)
  downloadAnchorNode.click()
  downloadAnchorNode.remove()
}

const triggerImport = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

const importData = (event) => {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      if (data.width !== undefined) labelWidth.value = data.width
      if (data.height !== undefined) labelHeight.value = data.height
      if (data.material !== undefined) labelMaterial.value = data.material
      if (data.globalLightColor !== undefined) globalLightColor.value = data.globalLightColor
      if (data.globalLightBrightness !== undefined) globalLightBrightness.value = data.globalLightBrightness
      if (data.globalTextSize !== undefined) globalTextSize.value = data.globalTextSize
      if (data.globalTextColor !== undefined) globalTextColor.value = data.globalTextColor
      if (data.globalIconSize !== undefined) globalIconSize.value = data.globalIconSize
      if (data.globalIconColor !== undefined) globalIconColor.value = data.globalIconColor
      if (data.zoomLevel !== undefined) zoomLevel.value = data.zoomLevel
      if (data.labels) labels.value = data.labels
    } catch (err) {
      console.error("Failed to parse imported JSON", err)
      alert("Invalid JSON file")
    }
    event.target.value = ''
  }
  reader.readAsText(file)
}

// Drag and Drop Logic
const onDragStart = (e, label) => {
  isDragging.value = true
  e.dataTransfer.setData('text/plain', label.id)
  e.dataTransfer.effectAllowed = 'move'
  
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

const onDropDeckSlot = (e, targetSlotIndex) => {
  dragOverTarget.value = null
  const draggedId = e.dataTransfer.getData('text/plain')
  if (!draggedId) return
  
  const draggedLabel = labels.value.find(l => l.id === draggedId)
  if (!draggedLabel) return
  
  const targetLabel = getLabelAtSlot(targetSlotIndex)
  
  if (targetLabel && targetLabel.id !== draggedId) {
    // Physical Deck: We SWAP slots so spatial memory isn't broken
    const tempSlot = draggedLabel.deckSlot
    draggedLabel.deckSlot = targetSlotIndex
    targetLabel.deckSlot = tempSlot
  } else if (!targetLabel) {
    // Empty deck slot
    draggedLabel.deckSlot = targetSlotIndex
  }
}

const onDropLibrary = (e, targetLabel) => {
  dragOverTarget.value = null
  const draggedId = e.dataTransfer.getData('text/plain')
  if (!draggedId) return
  
  const draggedIndex = labels.value.findIndex(l => l.id === draggedId)
  const targetIndex = labels.value.findIndex(l => l.id === targetLabel.id)
  
  if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return
  
  const draggedLabel = labels.value[draggedIndex]
  
  // Library: Fluid list insertion
  labels.value.splice(draggedIndex, 1)
  labels.value.splice(targetIndex, 0, draggedLabel)
}

watch([labelWidth, labelHeight, labelMaterial, globalLightColor, globalLightBrightness, globalLightEffect, globalTextSize, globalTextColor, globalIconSize, globalIconColor, zoomLevel, labels, selectedId], saveState, { deep: true })

onMounted(() => {
  const loaded = loadState()
  if (!loaded) {
    fillTo24()
    if (labels.value.length > 0) selectedId.value = labels.value[0].id
  } else if (labels.value.length > 0 && !selectedId.value) {
    selectedId.value = labels.value[0].id
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

.zoom-btn {
  cursor: pointer;
  transition: color 0.2s, transform 0.1s;
}

.zoom-btn:hover {
  color: white;
  transform: scale(1.1);
}

.zoom-btn:active {
  transform: scale(0.9);
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
.label-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 2mm;
  align-content: flex-start;
}

#print-area {
  display: none;
}

/* Make preview-mode NOT flashbang with white background */
.preview-mode {
  background-color: var(--bg);
}

.preview-mode .app-header, 
.preview-mode .app-main {
  display: none !important;
}

.preview-mode #print-area {
  display: flex !important;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background: rgba(15, 23, 42, 0.95);
}

.print-preview-sidebar {
  width: 320px;
  background: var(--card-bg);
  border-right: 1px solid var(--card-border);
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  gap: 1.5rem;
  box-shadow: 2px 0 10px rgba(0,0,0,0.5);
  z-index: 10;
}

.print-preview-sidebar h2 {
  font-size: 1.25rem;
  margin: 0;
}

.setting-group-vertical {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.setting-group-vertical label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted);
}
.setting-group-vertical select,
.setting-group-vertical input[type="number"] {
  width: 100%;
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--card-border);
  color: white;
  padding: 0.5rem;
  border-radius: 4px;
}
.setting-group-vertical small {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.print-preview-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto;
  padding: 2rem;
}

.paper-sheet {
  background: white;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  position: relative;
  /* Visual grid lines to help align */
  background-image: linear-gradient(#e5e5e5 1px, transparent 1px), linear-gradient(90deg, #e5e5e5 1px, transparent 1px);
  background-size: 10mm 10mm;
  padding: 5mm; /* Default margins */
  margin: auto;
}

.format-A4 {
  width: 210mm;
  min-height: 297mm;
}
.format-A4-L {
  width: 297mm;
  min-height: 210mm;
}
.format-Letter {
  width: 215.9mm;
  min-height: 279.4mm;
}

.paper-ruler {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  border: 1px solid #ccc;
  z-index: 0;
}

.paper-sheet .label-grid {
  position: relative;
  z-index: 1;
}

@media print {
  @page {
    size: auto;
    margin: 5mm;
  }
  
  .app-container {
    height: auto;
    padding: 0;
    margin: 0;
    background: white;
  }
  .app-header, .app-main {
    display: none !important;
  }
  #print-area {
    display: block !important;
    padding: 0;
    background: transparent;
  }
  .print-preview-content {
    display: block;
    padding: 0;
    overflow: visible;
  }
  .paper-sheet {
    box-shadow: none;
    margin: 0;
    padding: 0;
    background-image: none !important; /* Hide grid when actually printing */
    width: 100%;
    min-height: auto;
  }
  .no-print {
    display: none !important;
  }
}
</style>
