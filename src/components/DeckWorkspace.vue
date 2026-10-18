<template>
  <div class="grid-section" ref="sectionRef" style="background: transparent; border: none; overflow: hidden; gap: 1.5rem;">
    <!-- LocalDeck Preview -->
    <div class="deck-preview-panel" ref="panelRef" :style="{ flex: `0 0 ${shownPanelHeight}px`, minHeight: '200px', display: 'flex', flexDirection: 'column', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', overflow: 'hidden' }">
      <div class="section-header device-header" ref="panelHeaderRef">
      <CustomSelect v-model="activeDeckId" :options="deckOptions" style="width: 200px; font-weight: 600;" />
      <div style="display: flex; gap: 0.25rem; margin-left: 0.5rem;">
        <button class="icon-btn" @click="promptAddDeck" title="Add New Deck"><Icon icon="mdi:plus" /></button>
        <button class="icon-btn" @click="promptRenameDeck" title="Rename Deck"><Icon icon="mdi:pencil" /></button>
        <button class="icon-btn" @click="confirmRemoveDeck" :disabled="decks.length <= 1" title="Delete Deck" :style="{ opacity: decks.length <= 1 ? 0.3 : 1 }"><Icon icon="mdi:trash-can-outline" /></button>
      </div>

      <div class="spacer"></div>
      



      <div class="setting-group" style="margin-right: 1rem; cursor: pointer;" @click="darkRoom = !darkRoom" title="Toggle Room Lighting">
        <Icon :key="darkRoom ? 'night' : 'sunny'" :icon="darkRoom ? 'mdi:weather-night' : 'mdi:weather-sunny'" style="font-size: 1.5rem; color: var(--text-muted);" />
      </div>

      <div class="setting-group global-light-group" style="margin-right: 0;">
        <Icon icon="mdi:led-on" style="color: var(--text-muted); font-size: 1.2rem;" />
        <div class="light-controls">
          <ColorPicker v-model="globalLightColor" title="Global LED Color" />
          <div style="width: 150px; min-width: 120px;" title="Global Brightness"><CustomSlider v-model="globalLightBrightness" :min="0" :max="100" showValue /></div>
          <CustomSelect 
            v-model="globalLightEffect" 
            :options="[
              { value: 'static', label: 'Static' },
              { value: 'breathing', label: 'Breathing' },
              { value: 'rainbow', label: 'Rainbow' }
            ]"
            style="min-width: 120px; margin-left: 0.5rem;"
          />
        </div>
      </div>
    </div>
    <div class="device-preview-container" style="overflow: auto; flex: 1; position: relative;">
      
      <!-- 2D Render Settings Overlay -->
      <div class="floating-controls">
        <div class="settings-dropdown">
          <div 
            class="floating-btn" 
            :class="{ active: show2dSettings }"
            @click="show2dSettings = !show2dSettings" 
            title="2D Render Settings"
          >
            <Icon icon="mdi:cog" />
            <span>2D Render Settings</span>
            <Icon :icon="show2dSettings ? 'mdi:chevron-up' : 'mdi:chevron-down'" />
          </div>
          
          <div class="settings-panel" v-if="show2dSettings">
            
            <div class="setting-field" title="Scales the light of every LED: cap walls, label and the glow on the case">
              <label>LED Intensity (0-2)</label>
              <NumberStepper v-model="preview2dLedIntensity" :min="0" :max="2" :step="0.05" :defaultVal="1" />
            </div>
            
            <div class="setting-row-multi">
              <div class="setting-field half" title="How much LED light passes through the label. Set by the label material">
                <label>Translucency</label>
                <NumberStepper v-model="preview2dTranslucency" :min="0" :max="1" :step="0.01" :defaultVal="1" />
              </div>
              <div class="setting-field half" title="How far the label scatters the light. Set by the label material">
                <label>Diffusion (px)</label>
                <NumberStepper v-model="preview2dFalloff" :min="0" :max="20" :step="1" :defaultVal="0" />
              </div>
            </div>

          </div>
        </div>
      </div>
      <div class="localdeck-device" ref="deviceRef">
        <div class="device-grid" :style="{ gridTemplateColumns: `repeat(${matrixWidth}, max-content)` }">
          <div 
            v-for="i in totalMatrixSlots"
            :key="'deck-slot-' + (i - 1)"
            class="device-slot"
            :class="{ 
              'is-selected': getLabelAtSlot(i - 1) && selectedId === getLabelAtSlot(i - 1).id,
              'is-drag-over': dragOverTarget === 'deck-' + (i - 1),
              'empty-slot': !getLabelAtSlot(i - 1)
            }"
            @click="getLabelAtSlot(i - 1) ? selectedId = getLabelAtSlot(i - 1).id : null"
            :draggable="!!getLabelAtSlot(i - 1)"
            @dragstart="getLabelAtSlot(i - 1) && onDragStart($event, getLabelAtSlot(i - 1), String(i - 1))"
            @dragenter.prevent="dragOverTarget = 'deck-' + (i - 1)"
            @dragleave.prevent="dragOverTarget = null"
            @dragend="onDragEnd"
            @dragover.prevent="dragOverTarget = 'deck-' + (i - 1)"
            @drop="onDropDeckSlot($event, i - 1)"
            :style="!getLabelAtSlot(i - 1) ? { width: `calc((${labelWidth + 4}mm) * 1.5)`, height: `calc((${labelHeight + 4}mm) * 1.5)` } : {}"
          >
            <div class="slot-hardware-index">{{ getButtonIndex(i - 1) }}</div>
            <LabelPreview 
              v-if="getLabelAtSlot(i - 1)"
              :label="getLabelAtSlot(i - 1)" 
              :width="labelWidth" 
              :height="labelHeight"
              :scale="1.5"
              :material="labelMaterial"
              :printMode="false"
              :darkRoom="darkRoom"
            />
            <div class="item-overlay" v-if="getLabelAtSlot(i - 1) && selectedId === getLabelAtSlot(i - 1).id">
              <Icon icon="mdi:pencil" />
            </div>
          </div>
        </div>
      </div>
    </div>

    </div>
    
    <DragHandle @resize="onResize" @reset="deckPanelHeight = null" title="Drag to resize, double-click to fit the deck" />

    <!-- Label Library -->
    <div class="library-panel" style="flex: 1; min-height: 200px; display: flex; flex-direction: column; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; overflow: hidden;">
      <div class="section-header">
      <h2>Label Library</h2>
      <span class="badge">{{ labels.length }} items</span>
      
      <div style="margin-left: 1rem; width: 200px;">
        <CustomInput v-model="librarySearch" @keydown.esc="librarySearch = ''" placeholder="Search labels..." icon="mdi:magnify" />
      </div>
      
      <button @click="fillMatrix" class="fill-btn" title="Fill empty deck slots with defaults">
        <Icon icon="mdi:playlist-plus" /> Fill Empty Deck Slots
      </button>
      
      <div class="spacer"></div>
      <div class="zoom-controls">
        <Icon icon="mdi:magnify-minus" @click="zoomLevel = Math.max(1, zoomLevel - 0.5)" />
        <div style="width: 100px;" title="Zoom Level"><CustomSlider v-model="zoomLevel" :min="1" :max="6" :step="0.5" /></div>
        <Icon icon="mdi:magnify-plus" @click="zoomLevel = Math.min(6, zoomLevel + 0.5)" />
        <span class="zoom-text">{{ zoomLevel }}x</span>
      </div>
    </div>
    
    <div class="interactive-grid" style="overflow-y: auto; flex: 1;">
      <div 
        v-for="label in filteredLabels" 
        :key="label.id"
        class="grid-item-wrapper"
        :class="{ 
          'is-selected': selectedId === label.id,
          'is-in-preview': activeDeck.slots && Object.keys(activeDeck.slots).find(k => activeDeck.slots[k] === label.id) !== undefined && Object.keys(activeDeck.slots).find(k => activeDeck.slots[k] === label.id) < totalMatrixSlots,
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
          :printMode="false"
          :darkRoom="darkRoom"
        />
        <div class="item-overlay" v-if="selectedId === label.id">
          <Icon icon="mdi:pencil" />
        </div>
      </div>
      
      <div 
        class="add-grid-item" 
        @click="addLabel({}, null)"
        :style="{ width: `calc((${labelWidth + 4}mm) * ${zoomLevel})`, height: `calc((${labelHeight + 4}mm) * ${zoomLevel})` }"
        title="Add new label to library"
      >
        <Icon icon="mdi:plus" />
      </div>
    </div>
  </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { useStore } from '../composables/useStore.js'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import LabelPreview from './LabelPreview.vue'
import ColorPicker from './ColorPicker.vue'
import CustomSelect from './CustomSelect.vue'
import CustomInput from './CustomInput.vue'
import CustomSlider from './CustomSlider.vue'
import DragHandle from './DragHandle.vue'
import NumberStepper from './NumberStepper.vue'

const show2dSettings = ref(false)

const store = useStore()
const {
  decks,
  activeDeckId,
  activeDeck,
  deckPanelHeight,
} = store

const MIN_PANEL_HEIGHT = 200
// The label library below the deck keeps at least this much, gaps and drag handle included
const LIBRARY_MIN_SPACE = 150
const sectionRef = ref(null)
const sectionHeight = ref(window.innerHeight)
const measureSection = () => { if (sectionRef.value) sectionHeight.value = sectionRef.value.clientHeight }
const clampPanelHeight = (h) => Math.max(MIN_PANEL_HEIGHT, Math.min(h, sectionHeight.value - LIBRARY_MIN_SPACE))

// Height that shows the whole deck: header, device and its margins, panel border
const panelRef = ref(null)
const panelHeaderRef = ref(null)
const deviceRef = ref(null)
const fitHeight = ref(400)
const measureFitHeight = () => {
  if (!panelRef.value || !panelHeaderRef.value || !deviceRef.value) return
  const deviceStyle = getComputedStyle(deviceRef.value)
  const border = panelRef.value.offsetHeight - panelRef.value.clientHeight
  fitHeight.value = Math.ceil(
    panelHeaderRef.value.offsetHeight + deviceRef.value.offsetHeight +
    parseFloat(deviceStyle.marginTop) + parseFloat(deviceStyle.marginBottom) + border
  )
}
let deviceObserver = null
onMounted(() => {
  measureFitHeight()
  measureSection()
  deviceObserver = new ResizeObserver(() => { measureFitHeight(); measureSection() })
  deviceObserver.observe(deviceRef.value)
  deviceObserver.observe(sectionRef.value)
})
onUnmounted(() => deviceObserver?.disconnect())

// A dragged height is saved; until then the panel fits the deck
const shownPanelHeight = computed(() => clampPanelHeight(deckPanelHeight.value ?? fitHeight.value))
const onResize = (delta) => {
  deckPanelHeight.value = clampPanelHeight(shownPanelHeight.value + delta)
}

const promptAddDeck = () => {
  const name = prompt("Enter a name for the new LocalDeck configuration:", "New Deck")
  if (name) store.addDeck(name)
}

const deckOptions = computed(() => decks.value.map(d => ({ value: d.id, label: d.name })))

const librarySearch = ref('')

const filteredLabels = computed(() => {
  const query = librarySearch.value.toLowerCase().trim()
  if (!query) return labels.value
  
  return labels.value.filter(l => {
    const textMatch = l.text && l.text.toLowerCase().includes(query)
    const iconMatch = l.icon && l.icon.toLowerCase().includes(query)
    return textMatch || iconMatch
  })
})

const getButtonIndex = (slotIndex) => {
  const w = matrixWidth.value
  const h = matrixHeight.value
  const row = Math.floor(slotIndex / w)
  const col = slotIndex % w
  return ((h - 1 - row) * w) + col + 1
}

const promptRenameDeck = () => {
  if (!activeDeck.value) return
  const name = prompt("Enter a new name for this LocalDeck:", activeDeck.value.name)
  store.renameDeck(activeDeck.value.id, name)
}

const confirmRemoveDeck = () => {
  if (decks.value.length <= 1) return
  if (confirm(`Are you sure you want to delete the configuration "${activeDeck.value.name}"?`)) {
    store.removeDeck(activeDeck.value.id)
  }
}

const {
  labelWidth,
  labelHeight,
  labelMaterial,
  globalLightColor,
  globalLightBrightness,
  globalLightEffect,
  zoomLevel,
  darkRoom,
  preview2dLedIntensity,
  preview2dTranslucency,
  preview2dFalloff,
  labels,
  dragOverTarget,
  selectedId,
  getLabelAtSlot,
  fillMatrix,
  matrixWidth,
  matrixHeight,
  totalMatrixSlots,
  addLabel,
  onDragStart,
  onDragEnd,
  onDropDeckSlot,
  onDropLibrary
} = store


const handleKeydown = (e) => {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
    if (!selectedId.value) return
    const deck = activeDeck.value
    if (deck && deck.slots) {
      const slotStr = Object.keys(deck.slots).find(key => deck.slots[key] === selectedId.value)
      if (slotStr !== undefined) {
        delete deck.slots[slotStr]
      }
    }
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<!-- Unscoped on purpose: these rules also style child components -->
<style>
/* Prevent dragleave flickering by making children un-hoverable during drag */
.is-dragging-global .device-slot *,
.is-dragging-global .empty-slot *,
.is-dragging-global .grid-item-wrapper * {
  pointer-events: none !important;
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
  /* Let block layout handle the height correctly */
  display: block;
}

.localdeck-device {
  margin: 2rem auto;
  width: max-content;
  height: max-content;
  flex-shrink: 0;
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
.slot-hardware-index {
  position: absolute;
  top: -12px;
  left: -8px;
  background: var(--card-bg);
  color: var(--text-muted);
  font-size: 0.65rem;
  font-weight: bold;
  font-family: monospace;
  padding: 1px 4px;
  border-radius: 4px;
  border: 1px solid var(--card-border);
  z-index: 5;
  pointer-events: none;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
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

.zoom-controls svg {
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
.add-grid-item svg {
  font-size: 1.5rem;
}
</style>
