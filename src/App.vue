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
  fileInput,
  triggerImport,
  importData,
  exportData,
  loadState,
  seedDefaultLabels,
  labels,
  selectedId
} = store

onMounted(() => {
  const loaded = loadState()
  if (!loaded) {
    seedDefaultLabels()
    if (labels.value.length > 0) selectedId.value = labels.value[0].id
  } else if (labels.value.length > 0 && !selectedId.value) {
    selectedId.value = labels.value[0].id
  }
})
</script>

<style>
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

.print-btn, .preview-toggle-btn {
  height: 42px;
}

.app-main {
  flex: 1;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
  padding: 1.5rem 1rem 1rem 1rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.workspace {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 2rem;
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
