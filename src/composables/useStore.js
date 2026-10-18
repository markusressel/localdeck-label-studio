import { ref, computed, watch, nextTick } from 'vue'

/**
 * Create an independent store instance: all reactive app state, its derived
 * values, the actions on it, and autosave to `storage`.
 *
 * The app uses one shared instance via useStore(); tests create their own.
 *
 * @param {object} [options]
 * @param {Storage} [options.storage] - where autosave reads and writes (default: localStorage)
 */
export function createStore({ storage = globalThis.localStorage } = {}) {
  const labelWidth = ref(14)
  const labelHeight = ref(14)
  const decks = ref([
    { id: 'default', name: 'Main Deck', width: 6, height: 4, slots: {} }
  ])
  const activeDeckId = ref('default')

  const activeDeck = computed(() => decks.value.find(d => d.id === activeDeckId.value) || decks.value[0])
  const matrixWidth = computed({
    get: () => activeDeck.value.width,
    set: (v) => activeDeck.value.width = v
  })
  const matrixHeight = computed({
    get: () => activeDeck.value.height,
    set: (v) => activeDeck.value.height = v
  })
  const totalMatrixSlots = computed(() => matrixWidth.value * matrixHeight.value)
  const labelMaterial = ref('transparent')
  const globalLightColor = ref('#10b981')
  const globalLightBrightness = ref(80)
  const globalLightEffect = ref('static')
  const globalTextSize = ref(10)
  const globalTextColor = ref('#000000')
  const globalIconSize = ref(24)
  const globalIconColor = ref('#000000')
  const globalIconFlatten = ref(false)

  const caseColor = ref('#2a2a2b')
  const switchBodyColor = ref('#ffffff')
  const switchStemColor = ref('#ffffff')
  const globalBackgroundColor = ref('transparent')
  const zoomLevel = ref(2)
  const darkRoom = ref(false)
  const highQualityRender = ref(false)
  const previewLedIntensity = ref(3000)
  const previewCapTranslucency = ref(0.9)
  const previewCapAttenuation = ref(2.0)
  const previewRoomLight = ref(60) // 3D room light brightness in %, when the room lights are on

  const preview2dLedIntensity = ref(0.0)
  const preview2dTranslucency = ref(1.0)
  const preview2dFalloff = ref(0.0)

  watch(labelMaterial, (newMat) => {
    if (newMat === 'transparent') {
      preview2dLedIntensity.value = 0.0
      preview2dTranslucency.value = 1.0
      preview2dFalloff.value = 0.0
    } else if (newMat === 'thin-paper') {
      preview2dLedIntensity.value = 0.9
      preview2dTranslucency.value = 0.15
      preview2dFalloff.value = 5.0
    } else if (newMat === 'thick-paper') {
      preview2dLedIntensity.value = 0.65
      preview2dTranslucency.value = 0.02
      preview2dFalloff.value = 10.0
    }
  })

  const labels = ref([])
  const isDragging = ref(false)
  const dragOverTarget = ref(null)
  const selectedId = ref(null)
  const previewMode = ref(false)

  const printFormat = ref('A4')
  const printZoom = ref(1)
  const printOffsetY = ref(0)
  const selectedPrintIds = ref([])
  const printGrid = ref([])

  const fileInput = ref(null)

  const paperDimensions = computed(() => {
    if (printFormat.value === 'A4') return { w: 210, h: 297 }
    if (printFormat.value === 'A4-L') return { w: 297, h: 210 }
    return { w: 215.9, h: 279.4 }
  })

  const cols = computed(() => {
    const w = paperDimensions.value.w - 10
    return Math.floor(w / labelWidth.value)
  })
  const rows = computed(() => {
    const h = paperDimensions.value.h - 10
    return Math.floor(h / labelHeight.value)
  })
  const totalPrintSlots = computed(() => cols.value * rows.value)

  const getLabelAtSlot = (slotIndex) => {
    const deck = activeDeck.value
    if (!deck.slots) deck.slots = {}
    const labelId = deck.slots[slotIndex]
    if (!labelId) return null
    return labels.value.find(l => l.id === labelId) || null
  }

  const printChecklistItems = computed(() => {
    const items = []
    const usedLabelIds = new Set()

    decks.value.forEach(deck => {
      if (!deck.slots) return
      Object.keys(deck.slots).forEach(slotIdx => {
        const labelId = deck.slots[slotIdx]
        const label = labels.value.find(l => l.id === labelId)
        if (label) {
          usedLabelIds.add(labelId)
          items.push({
            id: `deck-${deck.id}-slot-${slotIdx}`,
            labelId: label.id,
            label: label,
            category: deck.name || 'Deck',
            hint: `Slot ${parseInt(slotIdx) + 1}`
          })
        }
      })
    })

    labels.value.forEach(label => {
      if (!usedLabelIds.has(label.id)) {
        items.push({
          id: `unused-${label.id}`,
          labelId: label.id,
          label: label,
          category: 'Library (Unused)',
          hint: ''
        })
      }
    })

    return items
  })

  const explicitlyPrintedLabels = computed(() => {
    return printChecklistItems.value.filter(item => selectedPrintIds.value.includes(item.id))
  })

  const syncPrintGrid = () => {
    if (printGrid.value.length !== totalPrintSlots.value) {
      const newGrid = new Array(totalPrintSlots.value).fill(null)
      for (let i = 0; i < Math.min(printGrid.value.length, totalPrintSlots.value); i++) newGrid[i] = printGrid.value[i]
      printGrid.value = newGrid
    }

    const validIds = new Set(explicitlyPrintedLabels.value.map(item => item.id))
    for (let i = 0; i < printGrid.value.length; i++) {
      if (printGrid.value[i] && !validIds.has(printGrid.value[i])) printGrid.value[i] = null
    }

    const existingIds = new Set(printGrid.value.filter(Boolean))
    let pointer = 0
    explicitlyPrintedLabels.value.forEach(item => {
      if (!existingIds.has(item.id)) {
         while (pointer < printGrid.value.length && printGrid.value[pointer] !== null) pointer++
         if (pointer < printGrid.value.length) printGrid.value[pointer] = item.id
      }
    })
  }

  watch(explicitlyPrintedLabels, syncPrintGrid, { deep: true })
  watch([printFormat, labelWidth, labelHeight], syncPrintGrid)

  // Global defaults that labels inherit from; see utils/labelStyle.js
  const globalStyle = computed(() => ({
    textSize: globalTextSize.value,
    textColor: globalTextColor.value,
    iconSize: globalIconSize.value,
    iconColor: globalIconColor.value,
    iconFlatten: globalIconFlatten.value,
    backgroundColor: globalBackgroundColor.value,
    lightColor: globalLightColor.value,
    lightBrightness: globalLightBrightness.value,
    lightEffect: globalLightEffect.value
  }))

  const selectedItemIndex = computed(() => {
    if (!selectedId.value) return null
    const idx = labels.value.findIndex(l => l.id === selectedId.value)
    return idx !== -1 ? idx : null
  })

  const homeAutomationDefaults = [
    { text: 'Living Room', icon: 'mdi:sofa' },
    { text: 'Kitchen', icon: 'mdi:stove' },
    { text: 'Bedroom', icon: 'mdi:bed-empty' },
    { text: 'Office', icon: 'mdi:desk' },
    { text: 'Bathroom', icon: 'mdi:shower' },
    { text: 'Garage', icon: 'mdi:garage' },
    { text: 'Lights', icon: 'mdi:lightbulb' },
    { text: 'Thermostat', icon: 'mdi:thermostat' },
    { text: 'AC', icon: 'mdi:air-conditioner' },
    { text: 'Heater', icon: 'mdi:radiator' },
    { text: 'Fan', icon: 'mdi:fan' },
    { text: 'TV', icon: 'mdi:television' },
    { text: 'Music', icon: 'mdi:music' },
    { text: 'Speakers', icon: 'mdi:speaker' },
    { text: 'Vacuum', icon: 'mdi:robot-vacuum' },
    { text: 'Blinds', icon: 'mdi:blinds' },
    { text: 'Curtains', icon: 'mdi:curtains' },
    { text: 'Lock', icon: 'mdi:lock' },
    { text: 'Unlock', icon: 'mdi:lock-open' },
    { text: 'Camera', icon: 'mdi:cctv' },
    { text: 'Alarm', icon: 'mdi:alarm-bell' },
    { text: 'Motion', icon: 'mdi:motion-sensor' },
    { text: 'Night Mode', icon: 'mdi:weather-night' },
    { text: 'Away Mode', icon: 'mdi:car' },
    { text: 'All Off', icon: 'mdi:power' }
  ]

  const getRandomDefault = () => {
    const template = homeAutomationDefaults[Math.floor(Math.random() * homeAutomationDefaults.length)]
    return { ...template }
  }

  const generateId = () => Math.random().toString(36).substr(2, 9)

  const STORAGE_KEY = 'localdeck-labels'
  const STATE_VERSION = 1

  // Persisted settings, keyed by their name in the saved JSON. This map drives
  // save, load, export/import and autosave, so new settings only need adding here.
  const persistedSettings = {
    width: labelWidth,
    height: labelHeight,
    material: labelMaterial,
    globalLightColor,
    globalLightBrightness,
    globalLightEffect,
    globalTextSize,
    globalTextColor,
    globalIconSize,
    globalIconColor,
    globalIconFlatten,
    globalBackgroundColor,
    caseColor,
    switchBodyColor,
    switchStemColor,
    zoomLevel,
    darkRoom,
    previewLedIntensity,
    previewCapTranslucency,
    previewCapAttenuation,
    previewRoomLight,
    preview2dLedIntensity,
    preview2dTranslucency,
    preview2dFalloff,
    selectedId,
    printFormat,
    printOffsetY,
    selectedPrintIds,
    printGrid
  }

  const createDefaultDecks = () => [{ id: 'default', name: 'Main Deck', width: 6, height: 4, slots: {} }]

  // migrations[n] upgrades saved data from version n to n + 1, in place
  const migrations = [
    (data) => {
      // Labels used to store their own deckSlot, and stored the old global
      // defaults (10 / 24, black) as explicit overrides.
      if (!data.decks) data.decks = createDefaultDecks()
      const deck = data.decks.find(d => d.id === (data.activeDeckId || data.decks[0].id))
      ;(data.labels || []).forEach(l => {
        if (l.textSize === 10 && l.textColor === '#000000') { l.textSize = null; l.textColor = null }
        if (l.iconSize === 24 && l.iconColor === '#000000') { l.iconSize = null; l.iconColor = null }
        if (l.deckSlot !== undefined && l.deckSlot !== null && deck) {
          if (!deck.slots) deck.slots = {}
          deck.slots[l.deckSlot] = l.id
        }
        delete l.deckSlot
        delete l.print
      })
    }
  ]

  const migrateState = (data) => {
    for (let v = data.version || 0; v < STATE_VERSION; v++) migrations[v](data)
    data.version = STATE_VERSION
    return data
  }

  const loadStateFromObject = (data) => {
    migrateState(data)
    for (const [key, setting] of Object.entries(persistedSettings)) {
      if (data[key] !== undefined && data[key] !== null) setting.value = data[key]
    }
    decks.value = data.decks || createDefaultDecks()
    activeDeckId.value = data.activeDeckId || decks.value[0].id
    if (data.labels && data.labels.length > 0) {
      labels.value = data.labels
      return true
    }
    return false
  }

  const loadState = () => {
    const saved = storage.getItem(STORAGE_KEY)
    if (!saved) return false
    try {
      return loadStateFromObject(JSON.parse(saved))
    } catch (e) {
      console.error('Failed to load saved labels', e)
      return false
    }
  }

  const getStateObject = () => ({
    version: STATE_VERSION,
    decks: decks.value,
    activeDeckId: activeDeckId.value,
    ...Object.fromEntries(Object.entries(persistedSettings).map(([key, setting]) => [key, setting.value])),
    labels: labels.value
  })

  const saveState = () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(getStateObject()))
  }

  const addLabel = (overrides = {}, slot = null) => {
    const newProps = Object.keys(overrides).length > 0 ? overrides : { text: 'New Label', icon: 'mdi:home' }
    const newId = generateId()
    labels.value.push({
      id: newId,
      text: newProps.text,
      textSize: null,
      textColor: null,
      icon: newProps.icon,
      iconSize: null,
      iconColor: null,
      image: null,
      lightColor: null,
      lightBrightness: null,
      lightEffect: null
    })

    if (slot !== null) {
      if (!activeDeck.value.slots) activeDeck.value.slots = {}
      activeDeck.value.slots[slot] = newId
    }
    return newId
  }

  // Apply changes to a label in place, keeping its identity for everything that references it
  const updateLabel = (id, patch) => {
    const label = labels.value.find(l => l.id === id)
    if (label) Object.assign(label, patch)
  }

  const fillMatrix = () => {
    const deck = activeDeck.value
    if (!deck.slots) deck.slots = {}

    const usedLabelIds = new Set(Object.values(deck.slots))
    const availableLabels = labels.value.filter(l => !usedLabelIds.has(l.id))

    let availableIdx = 0

    for (let i = 0; i < totalMatrixSlots.value; i++) {
      if (!deck.slots[i]) {
        if (availableIdx < availableLabels.length) {
          deck.slots[i] = availableLabels[availableIdx].id
          availableIdx++
        } else {
          break
        }
      }
    }
  }

  // Populate every empty slot of the active deck with a new starter label (first run)
  const seedDefaultLabels = () => {
    for (let i = 0; i < totalMatrixSlots.value; i++) {
      if (!getLabelAtSlot(i)) addLabel(getRandomDefault(), i)
    }
  }

  const duplicateSelected = () => {
    if (selectedItemIndex.value === null) return
    const toDuplicate = labels.value[selectedItemIndex.value]
    const newId = generateId()
    const newIndex = selectedItemIndex.value + 1
    labels.value.splice(newIndex, 0, {
      ...toDuplicate,
      id: newId,
      // Duplicates go to library
    })
    selectedId.value = newId
  }

  const removeSelected = () => {
    const idx = selectedItemIndex.value
    if (idx === null) return
    const removedId = labels.value[idx].id
    labels.value.splice(idx, 1)
    decks.value.forEach(d => {
      if (d.slots) {
        Object.keys(d.slots).forEach(key => {
          if (d.slots[key] === removedId) delete d.slots[key]
        })
      }
    })

    if (labels.value.length === 0) {
      selectedId.value = null
    } else if (idx >= labels.value.length) {
      selectedId.value = labels.value[labels.value.length - 1].id
    } else {
      selectedId.value = labels.value[idx].id
    }
  }

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(getStateObject(), null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", "localdeck_labels.json")
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  const triggerImport = () => {
    if (fileInput.value) {
      fileInput.value.click()
    }
  }

  const importData = (event) => {
    const file = event.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        loadStateFromObject(data)
      } catch (err) {
        console.error("Failed to parse imported JSON", err)
        alert("Invalid JSON file")
      }
      event.target.value = ''
    }
    reader.readAsText(file)
  }

  // Drag and Drop Logic
  const onDragStart = (e, label, source = 'library') => {
    isDragging.value = true
    e.dataTransfer.setData('text/plain', label.id)
    e.dataTransfer.setData('source', source)
    e.dataTransfer.effectAllowed = 'move'

    const ghost = document.getElementById('drag-ghost')
    const ghostText = document.getElementById('drag-ghost-text')
    if (ghost && ghostText) {
      ghostText.textContent = label.text || 'Label'
      e.dataTransfer.setDragImage(ghost, 15, 15)
    }
  }

  const onDragEnd = () => {
    isDragging.value = false
    dragOverTarget.value = null
  }

  // Library labels are stamped onto the slot (they can be on several slots);
  // labels from another slot (fromSlot = its index) move there, swapping with any occupant
  const placeLabelInSlot = (labelId, targetSlotIndex, fromSlot = null) => {
    if (!labels.value.some(l => l.id === labelId)) return
    const deck = activeDeck.value
    if (!deck.slots) deck.slots = {}
    const targetLabel = getLabelAtSlot(targetSlotIndex)

    if (fromSlot === null) {
      deck.slots[targetSlotIndex] = labelId
    } else if (targetLabel && targetLabel.id !== labelId) {
      deck.slots[fromSlot] = targetLabel.id
      deck.slots[targetSlotIndex] = labelId
    } else if (!targetLabel) {
      delete deck.slots[fromSlot]
      deck.slots[targetSlotIndex] = labelId
    }
  }

  // Reorder the library: move a label to another label's position
  const moveLibraryLabel = (labelId, targetLabelId) => {
    const draggedIndex = labels.value.findIndex(l => l.id === labelId)
    const targetIndex = labels.value.findIndex(l => l.id === targetLabelId)
    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return
    const [draggedLabel] = labels.value.splice(draggedIndex, 1)
    labels.value.splice(targetIndex, 0, draggedLabel)
  }

  const onDropDeckSlot = (e, targetSlotIndex) => {
    dragOverTarget.value = null
    const draggedId = e.dataTransfer.getData('text/plain')
    if (!draggedId) return
    const source = e.dataTransfer.getData('source')
    placeLabelInSlot(draggedId, targetSlotIndex, source === 'library' ? null : parseInt(source))
  }

  const onDropLibrary = (e, targetLabel) => {
    dragOverTarget.value = null
    const draggedId = e.dataTransfer.getData('text/plain')
    if (draggedId) moveLibraryLabel(draggedId, targetLabel.id)
  }

  const addDeck = (name) => {
    const id = generateId()
    decks.value.push({ id, name, width: 6, height: 4, slots: {} })
    activeDeckId.value = id
    return id
  }

  const renameDeck = (id, name) => {
    const deck = decks.value.find(d => d.id === id)
    if (deck && name) deck.name = name
  }

  // The last deck cannot be removed; switches to the first remaining deck
  const removeDeck = (id) => {
    if (decks.value.length <= 1) return false
    const idx = decks.value.findIndex(d => d.id === id)
    if (idx === -1) return false
    decks.value.splice(idx, 1)
    if (activeDeckId.value === id) activeDeckId.value = decks.value[0].id
    return true
  }

  const getLabelById = (id) => labels.value.find(l => l.id === id)
  const getLabelByOccurrenceId = (id) => {
    const item = printChecklistItems.value.find(i => i.id === id)
    return item ? item.label : null
  }

  const printLabels = async () => {
    selectedId.value = null
    await nextTick()
    window.print()
  }

  watch([decks, activeDeckId, labels, ...Object.values(persistedSettings)], saveState, { deep: true })

  return {
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
    globalStyle,
    caseColor,
    switchBodyColor,
    switchStemColor,
    previewLedIntensity,
    previewCapTranslucency,
    previewCapAttenuation,
    previewRoomLight,
    preview2dLedIntensity,
    preview2dTranslucency,
    preview2dFalloff,
    zoomLevel,
    darkRoom, highQualityRender,
    labels,
    isDragging,
    dragOverTarget,
    selectedId,
    previewMode,
    printFormat,
    printZoom,
    printOffsetY,
    selectedPrintIds,
    printGrid,

    paperDimensions,
    cols,
    rows,
    totalPrintSlots,
    selectedItemIndex,

    getLabelAtSlot,
    printChecklistItems,
    explicitlyPrintedLabels,
    syncPrintGrid,
    loadState,
    saveState,
    loadStateFromObject,
    getStateObject,
    addLabel,
    updateLabel,
    fillMatrix,
    seedDefaultLabels,
    matrixWidth,
    decks,
    activeDeckId,
    activeDeck,
    matrixHeight,
    totalMatrixSlots,
    duplicateSelected,
    removeSelected,
    exportData,
    importData,
    onDragStart,
    onDragEnd,
    onDropDeckSlot,
    onDropLibrary,
    placeLabelInSlot,
    moveLibraryLabel,
    addDeck,
    renameDeck,
    removeDeck,
    getLabelById,
    getLabelByOccurrenceId,
    fileInput,
    triggerImport,
    printLabels
  }
}

let appStore = null

/** The app-wide store instance, created on first use. */
export function useStore() {
  if (!appStore) appStore = createStore()
  return appStore
}
