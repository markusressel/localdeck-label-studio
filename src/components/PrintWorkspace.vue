<template>
  <div id="print-area">
    <div v-html="`<style>@media print { @page { margin: 0; size: ${printFormat === 'A4' ? 'A4 portrait' : printFormat === 'A4-L' ? 'A4 landscape' : 'Letter portrait'}; } }</style>`"></div>
    <div class="print-preview-sidebar no-print" v-if="previewMode">
      <h2>Print Settings</h2>
      
      <div class="setting-group-vertical">
        <label>Paper Format</label>
        <CustomSelect 
          v-model="printFormat" 
          :options="[
            { value: 'A4', label: 'A4 (Portrait)' },
            { value: 'A4-L', label: 'A4 (Landscape)' },
            { value: 'Letter', label: 'US Letter' }
          ]"
        />
      </div>
      
      <div class="setting-group-vertical mt-3">
        <label>Printer Hardware Top Margin (mm)</label>
        <small style="color: var(--text-muted); font-size: 0.75rem; margin-bottom: 0.25rem;">Shift labels down if your printer cuts them off.</small>
        <NumberStepper v-model="printOffsetY" :min="0" :max="50" :defaultVal="0" />
      </div>

      <div class="setting-group-vertical" style="flex: 1; overflow: hidden; display: flex; flex-direction: column;">
        <label>Labels to Print</label>
        <div class="checklist-actions" style="margin-bottom: 0.5rem; display: flex; gap: 0.5rem;">
           <button @click="selectAllPrint" class="secondary" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">All</button>
           <button @click="selectNonePrint" class="secondary" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">None</button>
           <button @click="selectDeckPrint" class="secondary" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">Deck Only</button>
        </div>
        <div class="labels-checklist" style="overflow-y: auto; flex: 1; border: 1px solid var(--card-border); padding: 0.5rem; border-radius: 4px;">
          <div v-for="item in printChecklistItems" :key="item.id" class="checklist-item" style="display: flex; flex-direction: column; margin-bottom: 0.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.25rem;">
            <div style="font-size: 0.65rem; color: var(--text-muted); margin-bottom: 0.15rem; font-weight: 600;">
              {{ item.category }} <span v-if="item.hint" style="font-weight: normal; opacity: 0.7;">— {{ item.hint }}</span>
            </div>
            <CustomCheckbox :value="item.id" v-model="selectedPrintIds" style="font-size: 0.85rem;">
              <Icon v-if="item.label.icon && !isEmoji(item.label.icon)" :icon="item.label.icon" style="margin-right: 4px; vertical-align: middle; font-size: 1.1em;" />
              <span v-else-if="item.label.icon && isEmoji(item.label.icon)" style="margin-right: 4px; vertical-align: middle; font-size: 1.1em;">{{ item.label.icon }}</span>
              {{ item.label.text || 'Unnamed' }}
            </CustomCheckbox>
          </div>
        </div>
      </div>

      <div class="print-actions-bottom" style="margin-top: auto; display: flex; flex-direction: column; gap: 0.5rem;">
        <AlertBox type="warning">
          Please ensure your browser's print dialog is manually set to <strong>{{ printFormat }}</strong> to match your preview.
        </AlertBox>
        <button @click="printLabels" class="primary print-now-btn" style="width: 100%;">
          <Icon icon="mdi:printer" /> Print
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
      <div class="canvas-infinite-space" style="padding: 100vh 100vw; display: flex; justify-content: center; align-items: center; min-width: max-content; min-height: max-content;">
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
            :class="['format-' + printFormat, 'sheet-material-' + labelMaterial]"
            :style="{ 
              transform: `scale(${printZoom})`, 
              transformOrigin: 'top left',
              backgroundSize: `${labelWidth}mm ${labelHeight}mm`, 
              backgroundPosition: `5mm calc(5mm + ${printOffsetY}mm)`
            }"
          >
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
            
            <div class="label-grid" :style="{ marginTop: printOffsetY + 'mm' }">
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
                <div class="print-border-overlay" :style="getSlotBorderStyle(index, labelId)"></div>
                <LabelPreview
                  v-if="labelId"
                  :label="getLabelByOccurrenceId(labelId)"
                  :width="labelWidth"
                  :height="labelHeight"
                  :scale="printZoom"
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
                  :printMode="true"
                  :darkRoom="darkRoom"
                  draggable="true"
                  @dragstart="onPrintDragStart($event, labelId, index)"
                  @dragend="onDragEnd"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { useStore } from '../composables/useStore.js'
import LabelPreview from './LabelPreview.vue'
import CustomSelect from './CustomSelect.vue'
import NumberStepper from './NumberStepper.vue'
import CustomCheckbox from './CustomCheckbox.vue'
import AlertBox from './AlertBox.vue'
import { computed } from 'vue'
import * as emoji from 'node-emoji'

import { isEmoji } from '../utils/emojiUtils.js'

const {
  previewMode,
  printFormat,
  printZoom,
  printOffsetY,
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
  globalIconFlatten,
  globalBackgroundColor,
  darkRoom,
  paperDimensions,
  totalPrintSlots,
  cols,
  printChecklistItems,
  selectAllPrint,
  selectNonePrint,
  selectDeckPrint,
  onPrintDragStart,
  onDragEnd,
  onPrintDrop,
  getLabelById,
  getLabelByOccurrenceId,
  printLabels,
  startPanOrSelect,
  doPanOrSelect,
  endPanOrSelect,
  handleZoom
} = useStore()

const pageCssSize = computed(() => {
  return `${paperDimensions.value.w}mm ${paperDimensions.value.h}mm`
})

const getSlotBorderStyle = (index, labelId) => {
  if (!labelId) return {}
  
  const borderValue = '0.5pt dashed black'
  const style = {
    borderRight: borderValue,
    borderBottom: borderValue
  }
  
  if (index % cols.value === 0 || !printGrid.value[index - 1]) {
    style.borderLeft = borderValue
  }
  
  if (index < cols.value || !printGrid.value[index - cols.value]) {
    style.borderTop = borderValue
  }
  
  return style
}
</script>
