<template>
  <aside class="sidebar-section">
    <div class="editor-panel global-panel">
      <div class="panel-header">
        <h2>Global Styles</h2>
      </div>
      <div class="panel-content">
        <div class="style-group">
          <div class="style-group-header">
            <Icon icon="mdi:format-text" class="header-icon" />
            <span>Default Text Style</span>
          </div>
          <div class="control-row">
            <div class="control-group half">
              <label>Size (px)</label>
              <input type="number" v-model.number="globalTextSize" min="6" max="32" />
            </div>
            <div class="control-group half">
              <label>Color</label>
              <ColorPicker v-model="globalTextColor" />
            </div>
          </div>
        </div>

        <div class="style-group bordered-top">
          <div class="style-group-header">
            <Icon icon="mdi:palette-outline" class="header-icon" />
            <span>Default Background</span>
          </div>
          <div class="control-row">
            <div class="control-group">
              <label>Color</label>
              <ColorPicker v-model="globalBackgroundColor" />
            </div>
          </div>
        </div>

        <div class="style-group bordered-top">
          <div class="style-group-header">
            <Icon icon="mdi:star-outline" class="header-icon" />
            <span>Default Icon Style</span>
          </div>
          <div class="control-row">
            <div class="control-group half">
              <label>Size (px)</label>
              <input type="number" v-model.number="globalIconSize" min="10" max="64" />
            </div>
            <div class="control-group half">
              <label>Color</label>
              <ColorPicker v-model="globalIconColor" />
            </div>
          </div>
        </div>
        <div class="style-group bordered-top">
          <div class="style-group-header">
            <Icon icon="mdi:keyboard-variant" class="header-icon" />
            <span>LocalDeck Hardware</span>
          </div>
          <div class="control-row">
            <div class="control-group">
              <label>Case Base</label>
              <ColorPicker v-model="caseColor" />
            </div>
          </div>
          <div class="control-row" style="margin-top: 0.5rem">
            <div class="control-group half">
              <label>Switch Body</label>
              <ColorPicker v-model="switchBodyColor" />
            </div>
            <div class="control-group half">
              <label>Switch Stem</label>
              <ColorPicker v-model="switchStemColor" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="editor-panel detail-panel" v-if="selectedItemIndex !== null">
      <div class="panel-header">
        <h2>Edit Label</h2>
        <div class="panel-actions">
          <button class="icon-btn" @click="duplicateSelected" title="Duplicate Label">
            <Icon icon="mdi:content-copy" />
          </button>
        </div>
      </div>
      
      <div class="panel-content">
        <LabelEditor v-model="labels[selectedItemIndex]" :key="labels[selectedItemIndex].id" />
        
        <div style="margin-top: 1.5rem;">
          <button class="primary" style="width: 100%; background: var(--danger); border-color: var(--danger); display: flex; align-items: center; justify-content: center; gap: 0.5rem;" @click="removeSelected">
            <Icon icon="mdi:trash-can-outline" /> Delete Label
          </button>
        </div>
      </div>
    </div>
    
    <div class="empty-state detail-panel" v-else>
      <Icon icon="mdi:cursor-default-click-outline" />
      <p>Select a label to edit its properties.</p>
    </div>
  </aside>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { useStore } from '../composables/useStore.js'
import ColorPicker from './ColorPicker.vue'
import LabelEditor from './LabelEditor.vue'

const {
  globalTextSize,
  globalTextColor,
  globalIconSize,
  globalIconColor,
  caseColor,
  switchBodyColor,
  switchStemColor,
  globalBackgroundColor,
  selectedItemIndex,
  duplicateSelected,
  removeSelected,
  labels
} = useStore()
</script>


