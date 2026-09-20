<template>
  <div class="app-container" :class="{ 'preview-mode': previewMode, 'is-dragging-global': isDragging }">
    <header class="app-header">
      <div class="header-content">
        <div class="logo-area">
          <img src="/favicon.svg" alt="LocalDeck Logo" class="app-logo" />
          <div class="logo-text">
            <h1>LocalDeck Label Studio</h1>
            <p class="subtitle">Design perfect keycap labels</p>
          </div>
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
            <Icon icon="mdi:import" /> Import
          </button>
          <button @click="exportData" class="secondary export-btn">
            <Icon icon="mdi:export" /> Export
          </button>
          <button @click="previewMode = !previewMode" class="primary print-btn" :class="{ 'active': previewMode }">
            <Icon icon="mdi:printer" /> {{ previewMode ? 'Close Print' : 'Print' }}
          </button>
        </div>
      </div>
    </header>

    <main class="app-main">
      <div class="workspace">
        <DeckWorkspace />
        <Sidebar />
      </div>
    </main>

    <PrintWorkspace />

    <!-- Offscreen drag ghost for custom drag image -->
    <div style="position: absolute; top: -2000px; left: -2000px; pointer-events: none;">
      <div id="drag-ghost" style="background: rgba(16, 185, 129, 0.85); padding: 0.4rem 0.8rem; border-radius: 20px; color: white; display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; box-shadow: 0 4px 12px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.3); font-weight: 500; white-space: nowrap;">

        <Icon icon="mdi:cursor-move" />
        <span id="drag-ghost-text">Label</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { onMounted } from 'vue'
import { useStore } from './composables/useStore.js'
import DeckWorkspace from './components/DeckWorkspace.vue'
import Sidebar from './components/Sidebar.vue'
import PrintWorkspace from './components/PrintWorkspace.vue'

const store = useStore()

const {
  previewMode,
  isDragging,
  labelWidth,
  labelHeight,
  fileInput,
  triggerImport,
  importData,
  exportData,
  printLabels,
  spacePressed,
  loadState,
  fillTo24,
  labels,
  selectedId
} = store

onMounted(() => {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault()
      spacePressed.value = true
    }
  })
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') spacePressed.value = false
  })
  const loaded = loadState()
  if (!loaded) {
    fillTo24()
    if (labels.value.length > 0) selectedId.value = labels.value[0].id
  } else if (labels.value.length > 0 && !selectedId.value) {
    selectedId.value = labels.value[0].id
  }
})
</script>

<style>
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

.logo-area {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.app-logo {
  width: 42px;
  height: 42px;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
}

.logo-text {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.logo-area h1 {
  margin: 0;
  font-size: 1.5rem;
  background: linear-gradient(to right, var(--primary), var(--blue-500));
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
.add-grid-item svg {
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

/* #print-area display moved to handle slide animation */

/* Make preview-mode NOT flashbang with white background */
.preview-mode {
  background-color: var(--bg);
}

.preview-mode .app-main {
  opacity: 0.2;
  pointer-events: none;
  transition: opacity 0.4s;
}

.app-main {
  transition: opacity 0.4s;
}

#print-area {
  display: flex !important;
  position: fixed;
  top: 76px;
  left: 0;
  width: 100%;
  height: calc(100vh - 76px);
  background: rgba(15, 23, 42, 0.98);
  z-index: 40;
  transform: translateY(-120%);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;
}

.preview-mode #print-area {
  transform: translateY(0);
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

.print-preview-sidebar.right-sidebar {
  border-right: none;
  border-left: 1px solid var(--card-border);
  box-shadow: -2px 0 10px rgba(0,0,0,0.5);
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
  overflow: auto;
  padding: 2rem;
  background: var(--bg-color);
}

.paper-zoom-wrapper {
  margin: 2rem auto;
}

.paper-sheet {
  background: white;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  position: relative;
  background-image: linear-gradient(#e5e5e5 1px, transparent 1px), linear-gradient(90deg, #e5e5e5 1px, transparent 1px);
  padding: 5mm; 
  margin: auto;
  flex-shrink: 0;
  box-sizing: border-box;
}

.sheet-material-transparent {
  background-color: #f0f4f8;
}
.sheet-material-transparent::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: 
    linear-gradient(45deg, rgba(0,0,0,0.02) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.02) 75%, rgba(0,0,0,0.02)),
    linear-gradient(45deg, rgba(0,0,0,0.02) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.02) 75%, rgba(0,0,0,0.02));
  background-size: 20px 20px;
  background-position: 0 0, 10px 10px;
  z-index: 0;
}

.print-grid-slot {
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.1s;
}
.print-grid-slot.is-drag-over {
  background: rgba(16, 185, 129, 0.2);
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}

.print-grid-slot.is-selected {
  outline: 2px solid #3b82f6;
  outline-offset: -2px;
  background: rgba(59, 130, 246, 0.15);
}

.print-selection-box {
  position: absolute;
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid #3b82f6;
  pointer-events: none;
  z-index: 100;
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
    margin: 0;
  }
  
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    height: 100% !important;
    overflow: hidden !important;
  }
  
  .app-container {
    height: auto;
    padding: 0;
    margin: 0;
    background: white;
  }
  .paper-zoom-wrapper {
    transform: none !important;
    width: auto !important;
    height: auto !important;
    margin: 0 !important;
  }
  .app-header, .app-main {
    display: none !important;
  }
  #print-area {
    display: block !important;
    padding: 0;
    background: transparent;
    top: 0 !important;
    transform: none !important;
    height: auto !important;
  }
  .print-preview-content {
    display: block;
    padding: 0;
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
  }
  .paper-sheet {
    box-shadow: none !important;
    margin: 0 !important;
    background-image: none !important;
    transform: none !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    max-height: 100vh !important;
    overflow: hidden !important;
  }
  .sheet-material-transparent::before {
    display: none !important;
  }
  .no-print {
    display: none !important;
  }
}
</style>
