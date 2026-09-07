<template>
  <div class="grid-section">
    <!-- LocalDeck Preview -->
    <div class="section-header device-header">
      <h2>LocalDeck Preview</h2>
      <div class="matrix-inputs" style="display: flex; align-items: center; gap: 0.25rem; margin-left: 1rem; background: rgba(0,0,0,0.15); padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid var(--card-border);">
        <span class="iconify" data-icon="mdi:grid" style="color: var(--text-muted); margin-right: 0.25rem;"></span>
        <input type="number" v-model.number="matrixWidth" min="1" max="24" style="width: 45px; padding: 0.1rem; text-align: center; background: transparent; border: none; color: white; font-weight: 500;" title="Columns" />
        <span style="color: var(--text-muted); font-size: 0.8rem;">×</span>
        <input type="number" v-model.number="matrixHeight" min="1" max="24" style="width: 45px; padding: 0.1rem; text-align: center; background: transparent; border: none; color: white; font-weight: 500;" title="Rows" />
      </div>
      <div class="spacer"></div>
      
      <div class="setting-group" style="margin-right: 1rem; cursor: pointer;" @click="darkRoom = !darkRoom" title="Toggle Room Lighting">
        <span :key="darkRoom ? 'night' : 'sunny'" class="iconify" :data-icon="darkRoom ? 'mdi:weather-night' : 'mdi:weather-sunny'" style="font-size: 1.5rem; color: var(--text-muted);"></span>
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
        <span class="iconify" data-icon="mdi:led-on" style="color: var(--text-muted); font-size: 1.2rem;"></span>
        <div class="light-controls">
          <ColorPicker v-model="globalLightColor" title="Global LED Color" />
          <input type="range" v-model.number="globalLightBrightness" min="0" max="100" title="Global Brightness" style="width: 60px" />
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
    <div class="device-preview-container">
      <div class="localdeck-device">
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

    <!-- Label Library -->
    <div class="section-header">
      <h2>Label Library</h2>
      <span class="badge">{{ labels.length }} items</span>
      
      <button @click="fillMatrix" class="fill-btn" title="Fill empty deck slots with defaults">
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
          'is-in-preview': label.deckSlot !== null && label.deckSlot < totalMatrixSlots,
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
</template>

<script setup>
import { useStore } from '../composables/useStore.js'
import LabelPreview from './LabelPreview.vue'
import ColorPicker from './ColorPicker.vue'
import CustomSelect from './CustomSelect.vue'

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
  zoomLevel,
  darkRoom,
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
} = useStore()

import { onMounted, onUnmounted } from 'vue'

const handleKeydown = (e) => {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
    if (!selectedId.value) return
    const selected = labels.value.find(l => l.id === selectedId.value)
    if (selected && selected.deckSlot !== null) {
      selected.deckSlot = null
    }
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>
