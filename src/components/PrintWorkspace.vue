<template>
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
    
    <div 
      class="print-preview-content" 
      ref="previewContentRef" 
      @wheel.prevent="handleZoom" 
      @mousedown="startPanOrSelect" 
      @mousemove="doPanOrSelect" 
      @mouseup="endPanOrSelect" 
      @mouseleave="endPanOrSelect"
    >
      <div 
        class="paper-zoom-wrapper" 
        :style="{ 
          width: `calc(${paperDimensions.w}mm * ${printZoom})`, 
          height: `calc(${paperDimensions.h}mm * ${printZoom})` 
        }"
      >
        <div 
          class="paper-sheet" 
          ref="paperSheetRef"
          :class="'format-' + printFormat" 
          :style="{ 
            transform: `scale(${printZoom})`, 
            transformOrigin: 'top left',
            backgroundSize: `${labelWidth}mm ${labelHeight}mm`, 
            backgroundPosition: '5mm 5mm' 
          }"
        >
          <div class="paper-ruler no-print"></div>
          <div 
            v-if="printSelectionBox" 
            class="print-selection-box no-print" 
            :style="{ 
              left: printSelectionBox.x + 'px', 
              top: printSelectionBox.y + 'px', 
              width: printSelectionBox.w + 'px', 
              height: printSelectionBox.h + 'px' 
            }"
          ></div>
          
          <div class="label-grid">
            <div 
              v-for="(labelId, index) in printGrid.slice(0, totalPrintSlots)"
              :key="'slot-' + index"
              class="print-grid-slot"
              :class="{ 'is-drag-over': printDragTarget === index, 'is-selected': selectedPrintSlots.has(index) }"
              :style="{ width: labelWidth + 'mm', height: labelHeight + 'mm' }"
              @dragover.prevent="printDragTarget = index"
              @dragleave.prevent="printDragTarget = null"
              @drop="onPrintDrop($event, index)"
            >
              <LabelPreview
                v-if="labelId"
                :label="getLabelById(labelId)"
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
                draggable="true"
                @dragstart="onPrintDragStart($event, labelId, index)"
                @dragend="printDraggedSlot = null"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useStore } from '../composables/useStore.js'
import LabelPreview from './LabelPreview.vue'

const {
  previewMode,
  printFormat,
  printZoom,
  selectedPrintIds,
  printGrid,
  printDraggedSlot,
  printDragTarget,
  previewContentRef,
  printSelectionBox,
  selectedPrintSlots,
  paperSheetRef,
  labels,
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
  darkRoom,
  paperDimensions,
  totalPrintSlots,
  selectAllPrint,
  selectNonePrint,
  selectDeckPrint,
  onPrintDragStart,
  onPrintDrop,
  getLabelById,
  printLabels,
  startPanOrSelect,
  doPanOrSelect,
  endPanOrSelect,
  handleZoom
} = useStore()
</script>
