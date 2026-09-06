<template>
  <div class="grid-section">
    <!-- LocalDeck Preview -->
    <div class="section-header device-header">
      <h2>LocalDeck Preview</h2>
      <span class="badge">Physical Layout (Max 24)</span>
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

    <!-- Label Library -->
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
  fillTo24,
  addLabel,
  onDragStart,
  onDragEnd,
  onDropDeckSlot,
  onDropLibrary
} = useStore()
</script>
