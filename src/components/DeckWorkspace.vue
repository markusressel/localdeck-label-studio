<template>
  <div class="grid-section" style="background: transparent; border: none; overflow: hidden; gap: 1.5rem;">
    <!-- LocalDeck Preview -->
    <div class="deck-preview-panel" :style="{ flex: `0 0 ${deckPanelHeight}px`, minHeight: '200px', display: 'flex', flexDirection: 'column', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', overflow: 'hidden' }">
      <div class="section-header device-header">
      <CustomSelect v-model="activeDeckId" :options="deckOptions" style="width: 200px; font-weight: 600;" />
      <div style="display: flex; gap: 0.25rem; margin-left: 0.5rem;">
        <button class="icon-btn" @click="addDeck" title="Add New Deck"><Icon icon="mdi:plus" /></button>
        <button class="icon-btn" @click="renameDeck" title="Rename Deck"><Icon icon="mdi:pencil" /></button>
        <button class="icon-btn" @click="removeDeck" :disabled="decks.length <= 1" title="Delete Deck" :style="{ opacity: decks.length <= 1 ? 0.3 : 1 }"><Icon icon="mdi:trash-can-outline" /></button>
      </div>

      <div class="spacer"></div>
      
      <div class="setting-group" style="margin-right: 1rem; cursor: pointer;" @click="show3DPreview = !show3DPreview" :title="show3DPreview ? 'Back to 2D Editor' : 'Experimental 3D Preview'">
        <Icon :key="show3DPreview ? '3d-on' : '3d-off'" :icon="show3DPreview ? 'mdi:view-dashboard-outline' : 'mdi:cube-outline'" style="font-size: 1.5rem; color: var(--text-muted);" :style="{ color: show3DPreview ? 'var(--primary)' : 'var(--text-muted)' }" />
      </div>

      <div class="setting-group" style="margin-right: 1rem; cursor: pointer;" @click="highQualityRender = !highQualityRender" title="Toggle High Quality Path Tracing (GPU intensive)">
        <Icon :icon="highQualityRender ? 'mdi:diamond' : 'mdi:diamond-outline'" :style="{ fontSize: '1.5rem', color: highQualityRender ? 'var(--primary)' : 'var(--text-muted)' }" />
      </div>

      <div class="setting-group" style="margin-right: 1rem; cursor: pointer;" @click="darkRoom = !darkRoom" title="Toggle Room Lighting">
        <Icon :key="darkRoom ? 'night' : 'sunny'" :icon="darkRoom ? 'mdi:weather-night' : 'mdi:weather-sunny'" style="font-size: 1.5rem; color: var(--text-muted);" />
      </div>

      <div class="setting-group" style="margin-right: 1rem; min-width: 150px;">
        <CustomSelect 
          v-model="labelMaterial" 
          :options="[
            { value: 'transparent', label: 'Transparent Film' },
            { value: 'thin-paper', label: 'Thin Paper' },
            { value: 'thick-paper', label: 'Thick Paper' }
          ]"
        />
      </div>

      <div class="setting-group global-light-group" style="margin-right: 0;">
        <Icon icon="mdi:led-on" style="color: var(--text-muted); font-size: 1.2rem;" />
        <div class="light-controls">
          <ColorPicker v-model="globalLightColor" title="Global LED Color" />
          <div style="width: 80px;" title="Global Brightness"><CustomSlider v-model="globalLightBrightness" :min="0" :max="100" showValue /></div>
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
    <div class="device-preview-container" style="overflow: auto; flex: 1;">
      <div class="localdeck-device" v-if="!show3DPreview">
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
              :globalLightColor="globalLightColor"
              :globalLightBrightness="globalLightBrightness"
              :globalLightEffect="globalLightEffect"
              :globalTextSize="globalTextSize"
              :globalTextColor="globalTextColor"
              :globalIconSize="globalIconSize"
              :globalIconColor="globalIconColor"
              :globalIconFlatten="globalIconFlatten"
              :globalBackgroundColor="globalBackgroundColor"
              :printMode="false"
              :darkRoom="darkRoom"
            />
            <div class="item-overlay" v-if="getLabelAtSlot(i - 1) && selectedId === getLabelAtSlot(i - 1).id">
              <Icon icon="mdi:pencil" />
            </div>
          </div>
        </div>
      </div>
      <Deck3DPreview v-else />
    </div>

    </div>
    
    <DragHandle @resize="onResize" />

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
        v-for="(label, index) in filteredLabels" 
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
          :globalLightColor="globalLightColor"
          :globalLightBrightness="globalLightBrightness"
          :globalLightEffect="globalLightEffect"
          :globalTextSize="globalTextSize"
          :globalTextColor="globalTextColor"
          :globalIconSize="globalIconSize"
          :globalIconColor="globalIconColor"
          :globalIconFlatten="globalIconFlatten"
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
import Deck3DPreview from './Deck3DPreview.vue'
import { ref, computed } from 'vue'
import LabelPreview from './LabelPreview.vue'
import ColorPicker from './ColorPicker.vue'
import CustomSelect from './CustomSelect.vue'
import CustomInput from './CustomInput.vue'
import CustomSlider from './CustomSlider.vue'
import DragHandle from './DragHandle.vue'

const deckPanelHeight = ref(400)
const onResize = (delta) => {
  const newHeight = deckPanelHeight.value + delta;
  const minHeight = 200;
  const maxHeight = window.innerHeight - 300;
  deckPanelHeight.value = Math.max(minHeight, Math.min(newHeight, maxHeight));
}

const store = useStore()
const {
  decks,
  activeDeckId,
  activeDeck,
} = store

const addDeck = () => {
  const name = prompt("Enter a name for the new LocalDeck configuration:", "New Deck")
  if (!name) return
  const id = Date.now().toString()
  decks.value.push({ id, name, width: 6, height: 4, slots: {} })
  activeDeckId.value = id
}

const deckOptions = computed(() => decks.value.map(d => ({ value: d.id, label: d.name })))

const librarySearch = ref('')
const show3DPreview = ref(false)

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

const renameDeck = () => {
  if (!activeDeck.value) return
  const name = prompt("Enter a new name for this LocalDeck:", activeDeck.value.name)
  if (name) activeDeck.value.name = name
}

const removeDeck = () => {
  if (decks.value.length <= 1) return
  if (confirm(`Are you sure you want to delete the configuration "${activeDeck.value.name}"?`)) {
    const idx = decks.value.findIndex(d => d.id === activeDeckId.value)
    decks.value.splice(idx, 1)
    activeDeckId.value = decks.value[0].id
  }
}

const {
  labelWidth,
  labelHeight,
  labelMaterial,
  globalLightColor,
  globalLightBrightness,
  globalLightEffect,
  globalTextSize,
  globalTextColor,
  globalIconSize,
  globalIconColor,
  globalIconFlatten,
  globalBackgroundColor,
  zoomLevel,
  darkRoom,
  highQualityRender,
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

import { onMounted, onUnmounted } from 'vue'

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
