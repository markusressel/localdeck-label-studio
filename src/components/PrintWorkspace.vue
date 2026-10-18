<template>
  <div id="print-area">
    <div v-html="`<style>@media print { @page { margin: 0; size: ${printFormat === 'A4' ? 'A4 portrait' : printFormat === 'A4-L' ? 'A4 landscape' : 'Letter portrait'}; } }</style>`"></div>
    <div class="print-preview-sidebar no-print" v-if="previewMode">
      <h2>Labels to Print</h2>
      
      <div class="setting-group-vertical" style="flex: 1; overflow: hidden; display: flex; flex-direction: column;">
        <div class="labels-checklist" style="overflow-y: auto; flex: 1; padding-right: 1rem;">
          <div v-for="group in groupedChecklistItems" :key="group.category" style="margin-bottom: 1.5rem;">
            <div style="font-size: 0.75rem; color: var(--text-color); font-weight: 600; margin-bottom: 0.5rem;">
              <CustomCheckbox 
                :modelValue="isGroupFullySelected(group)" 
                :indeterminate="isGroupPartiallySelected(group)"
                @update:modelValue="toggleGroupSelection(group)" 
              >
                {{ group.category }}
              </CustomCheckbox>
            </div>
            
            <div class="tree-children" style="position: relative; margin-left: 9px;">
              <!-- Vertical main branch -->
              <div style="position: absolute; left: 0; top: -0.25rem; bottom: 0.65rem; width: 1px; background: var(--card-border); opacity: 0.6;"></div>
              
              <div v-for="item in group.items" :key="item.id" class="checklist-item" style="position: relative; padding-left: 1.25rem; margin-bottom: 0.5rem;">
                <!-- Horizontal sub-branch -->
                <div style="position: absolute; left: 0; top: 0.6rem; width: 0.8rem; height: 1px; background: var(--card-border); opacity: 0.6;"></div>
                
                <CustomCheckbox :value="item.id" v-model="selectedPrintIds" style="font-size: 0.85rem; width: 100%;">
                  <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <span style="display: flex; align-items: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      <Icon v-if="item.label.icon && !isEmoji(item.label.icon)" :icon="item.label.icon" style="margin-right: 6px; vertical-align: middle; font-size: 1.1em; flex-shrink: 0;" />
                      <span v-else-if="item.label.icon && isEmoji(item.label.icon)" style="margin-right: 6px; vertical-align: middle; font-size: 1.1em; flex-shrink: 0;">{{ item.label.icon }}</span>
                      <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ item.label.text || 'Unnamed' }}</span>
                    </span>
                    <span v-if="item.hint" style="font-size: 0.65rem; color: var(--text-muted); opacity: 0.7; margin-left: 0.5rem; flex-shrink: 0;">
                      {{ item.hint }}
                    </span>
                  </div>
                </CustomCheckbox>
              </div>
            </div>
          </div>
        </div>
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

    <div class="print-preview-sidebar right-sidebar no-print" v-if="previewMode">
      <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 1.5rem; padding-right: 1rem;">
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
      </div>

      <div class="print-actions-bottom" style="margin-top: auto; display: flex; flex-direction: column; gap: 0.5rem; flex-shrink: 0; padding-top: 1.5rem; border-top: 1px solid var(--card-border);">
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
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { useStore } from '../composables/useStore.js'
import { usePrintCanvas } from '../composables/usePrintCanvas.js'
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
  onDragEnd,
  getLabelById,
  getLabelByOccurrenceId,
  printLabels
} = useStore()

const {
  previewContentRef,
  paperSheetRef,
  printDragTarget,
  selectedPrintSlots,
  printSelectionBox,
  onPrintDragStart,
  onPrintDrop,
  startPanOrSelect,
  doPanOrSelect,
  endPanOrSelect,
  handleZoom
} = usePrintCanvas()

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

const groupedChecklistItems = computed(() => {
  const groups = {}
  printChecklistItems.value.forEach(item => {
    if (!groups[item.category]) groups[item.category] = []
    groups[item.category].push(item)
  })
  
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === 'Library (Unused)') return 1
    if (b === 'Library (Unused)') return -1
    return a.localeCompare(b)
  })
  
  return sortedKeys.map(key => {
    const items = groups[key].sort((a, b) => {
      const textA = a.label.text || 'Unnamed'
      const textB = b.label.text || 'Unnamed'
      return textA.localeCompare(textB)
    })
    return {
      category: key,
      items
    }
  })
})

const isGroupFullySelected = (group) => {
  if (group.items.length === 0) return false
  return group.items.every(item => selectedPrintIds.value.includes(item.id))
}

const isGroupPartiallySelected = (group) => {
  if (group.items.length === 0) return false
  const selectedCount = group.items.filter(item => selectedPrintIds.value.includes(item.id)).length
  return selectedCount > 0 && selectedCount < group.items.length
}

const toggleGroupSelection = (group) => {
  const allSelected = isGroupFullySelected(group)
  const newSelection = [...selectedPrintIds.value]
  
  if (allSelected) {
    group.items.forEach(item => {
      const idx = newSelection.indexOf(item.id)
      if (idx > -1) newSelection.splice(idx, 1)
    })
  } else {
    group.items.forEach(item => {
      if (!newSelection.includes(item.id)) {
        newSelection.push(item.id)
      }
    })
  }
  
  selectedPrintIds.value = newSelection
}
</script>
