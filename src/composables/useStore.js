import { ref, computed, watch, nextTick } from 'vue'

const labelWidth = ref(14)
const labelHeight = ref(14)
const matrixWidth = ref(6)
const matrixHeight = ref(4)
const totalMatrixSlots = computed(() => matrixWidth.value * matrixHeight.value)
const labelMaterial = ref('transparent')
const globalLightColor = ref('#10b981')
const globalLightBrightness = ref(80)
const globalLightEffect = ref('static')
const globalTextSize = ref(10)
const globalTextColor = ref('#000000')
const globalIconSize = ref(24)
const globalIconColor = ref('#000000')
const zoomLevel = ref(2)
const darkRoom = ref(true)
const labels = ref([])
const isDragging = ref(false)
const dragOverTarget = ref(null)
const selectedId = ref(null)
const previewMode = ref(false)

const printFormat = ref('A4')
const printZoom = ref(1)
const selectedPrintIds = ref([])
const printGrid = ref([])
const printDragTarget = ref(null)
const selectedPrintSlots = ref(new Set())
const spacePressed = ref(false)

const fileInput = ref(null)
const printDraggedSlot = ref(null)
const previewContentRef = ref(null)
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })
const scrollStart = ref({ x: 0, y: 0 })
const isBoxSelecting = ref(false)
const boxSelectStart = ref({ x: 0, y: 0 })
const printSelectionBox = ref(null)
const paperSheetRef = ref(null)


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

const printedLabels = computed(() => {
  return labels.value.filter(l => l.deckSlot !== null).sort((a, b) => a.deckSlot - b.deckSlot)
})

const explicitlyPrintedLabels = computed(() => {
  return labels.value.filter(l => selectedPrintIds.value.includes(l.id))
})

const syncPrintGrid = () => {
  if (printGrid.value.length !== totalPrintSlots.value) {
    const newGrid = new Array(totalPrintSlots.value).fill(null)
    for (let i = 0; i < Math.min(printGrid.value.length, totalPrintSlots.value); i++) newGrid[i] = printGrid.value[i]
    printGrid.value = newGrid
  }
  
  const validIds = new Set(explicitlyPrintedLabels.value.map(l => l.id))
  for (let i = 0; i < printGrid.value.length; i++) {
    if (printGrid.value[i] && !validIds.has(printGrid.value[i])) printGrid.value[i] = null
  }
  
  const existingIds = new Set(printGrid.value.filter(Boolean))
  let pointer = 0
  explicitlyPrintedLabels.value.forEach(label => {
    if (!existingIds.has(label.id)) {
       while (pointer < printGrid.value.length && printGrid.value[pointer] !== null) pointer++
       if (pointer < printGrid.value.length) printGrid.value[pointer] = label.id
    }
  })
}

watch(explicitlyPrintedLabels, syncPrintGrid, { deep: true })
watch([printFormat, labelWidth, labelHeight], syncPrintGrid)

watch(printFormat, (format) => {
  let sizeStr = 'A4 portrait'
  if (format === 'A4-L') sizeStr = 'A4 landscape'
  if (format === 'Letter') sizeStr = 'letter portrait'
  
  let styleEl = document.getElementById('dynamic-print-style')
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'dynamic-print-style'
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = `@media print { @page { size: ${sizeStr} !important; margin: 0 !important; } }`
}, { immediate: true })

watch(previewMode, async (newVal) => {
  if (newVal && selectedPrintIds.value.length === 0) {
    selectedPrintIds.value = printedLabels.value.map(l => l.id)
  }
  if (newVal) {
    syncPrintGrid()
    await nextTick()
    if (previewContentRef.value) {
       const cw = previewContentRef.value.clientWidth
       const ch = previewContentRef.value.clientHeight
       const sw = previewContentRef.value.scrollWidth
       const sh = previewContentRef.value.scrollHeight
       previewContentRef.value.scrollLeft = (sw - cw) / 2
       previewContentRef.value.scrollTop = (sh - ch) / 2
    }
  }
})

const selectAllPrint = () => { selectedPrintIds.value = labels.value.map(l => l.id) }
const selectNonePrint = () => { selectedPrintIds.value = [] }
const selectDeckPrint = () => { selectedPrintIds.value = printedLabels.value.map(l => l.id) }

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

const loadState = () => {
  const saved = localStorage.getItem('localdeck-labels')
  let loaded = false
  if (saved) {
    try {
      const data = JSON.parse(saved)
      if (data.width) labelWidth.value = data.width
      if (data.height) labelHeight.value = data.height
      if (data.material) labelMaterial.value = data.material
      if (data.globalLightColor) globalLightColor.value = data.globalLightColor
      if (data.globalLightBrightness !== undefined) globalLightBrightness.value = data.globalLightBrightness
      if (data.globalLightEffect) globalLightEffect.value = data.globalLightEffect
      if (data.globalTextSize !== undefined) globalTextSize.value = data.globalTextSize
      if (data.globalTextColor) globalTextColor.value = data.globalTextColor
      if (data.globalIconSize !== undefined) globalIconSize.value = data.globalIconSize
      if (data.globalIconColor) globalIconColor.value = data.globalIconColor
      if (data.zoomLevel) zoomLevel.value = data.zoomLevel
      if (data.selectedId) selectedId.value = data.selectedId
      if (data.printFormat) printFormat.value = data.printFormat
      if (data.printZoom) printZoom.value = data.printZoom
      if (data.selectedPrintIds) selectedPrintIds.value = data.selectedPrintIds
      if (data.printGrid) printGrid.value = data.printGrid
      if (data.labels && data.labels.length > 0) {
        let nextDeckSlot = 0;
        labels.value = data.labels.map((l, index) => {
          if (l.textSize === 10 && l.textColor === '#000000') { l.textSize = null; l.textColor = null; }
          if (l.iconSize === 24 && l.iconColor === '#000000') { l.iconSize = null; l.iconColor = null; }
          
          if (l.deckSlot === undefined) {
             if (l.print !== false && nextDeckSlot < totalMatrixSlots.value) {
               l.deckSlot = nextDeckSlot;
               nextDeckSlot++;
             } else {
               l.deckSlot = null;
             }
             delete l.print;
          }
          return l;
        })
        loaded = true
      }
    } catch (e) {
      console.error('Failed to load saved labels', e)
    }
  }
  return loaded
}

const saveState = () => {
  localStorage.setItem('localdeck-labels', JSON.stringify({
    decks: decks.value,
    activeDeckId: activeDeckId.value,
    width: labelWidth.value,
    height: labelHeight.value,
    material: labelMaterial.value,
    globalLightColor: globalLightColor.value,
    globalLightBrightness: globalLightBrightness.value,
    globalLightEffect: globalLightEffect.value,
    globalTextSize: globalTextSize.value,
    globalTextColor: globalTextColor.value,
    globalIconSize: globalIconSize.value,
    globalIconColor: globalIconColor.value,
    zoomLevel: zoomLevel.value,
    selectedId: selectedId.value,
    printFormat: printFormat.value,
    printZoom: printZoom.value,
    selectedPrintIds: selectedPrintIds.value,
    printGrid: printGrid.value,
    labels: labels.value
  }))
}

const addLabel = (overrides = {}, slot = null) => {
  const newProps = Object.keys(overrides).length > 0 ? overrides : { text: 'New Label', icon: 'mdi:home' }
  const newId = generateId()
  labels.value.push({
    id: newId,
    deckSlot: slot,
    text: newProps.text,
    textSize: null,
    textColor: null,
    icon: newProps.icon,
    iconSize: null,
    iconColor: null,
    image: null,
    lightColor: null,
    lightBrightness: null
  })
  return newId
}

const fillMatrix = () => {
  for (let i = 0; i < totalMatrixSlots.value; i++) {
    if (!getLabelAtSlot(i)) {
      addLabel(getRandomDefault(), i)
    }
  }
}

watch([matrixWidth, matrixHeight], () => {
  fillMatrix()
})

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
  const dataToExport = {
    width: labelWidth.value,
    height: labelHeight.value,
    material: labelMaterial.value,
    globalLightColor: globalLightColor.value,
    globalLightBrightness: globalLightBrightness.value,
    globalTextSize: globalTextSize.value,
    globalTextColor: globalTextColor.value,
    globalIconSize: globalIconSize.value,
    globalIconColor: globalIconColor.value,
    zoomLevel: zoomLevel.value,
    labels: labels.value
  }
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2))
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
      if (data.width !== undefined) labelWidth.value = data.width
      if (data.height !== undefined) labelHeight.value = data.height
      if (data.material !== undefined) labelMaterial.value = data.material
      if (data.globalLightColor !== undefined) globalLightColor.value = data.globalLightColor
      if (data.globalLightBrightness !== undefined) globalLightBrightness.value = data.globalLightBrightness
      if (data.globalTextSize !== undefined) globalTextSize.value = data.globalTextSize
      if (data.globalTextColor !== undefined) globalTextColor.value = data.globalTextColor
      if (data.globalIconSize !== undefined) globalIconSize.value = data.globalIconSize
      if (data.globalIconColor !== undefined) globalIconColor.value = data.globalIconColor
      if (data.zoomLevel !== undefined) zoomLevel.value = data.zoomLevel
      if (data.labels) labels.value = data.labels
    } catch (err) {
      console.error("Failed to parse imported JSON", err)
      alert("Invalid JSON file")
    }
    event.target.value = ''
  }
  reader.readAsText(file)
}

// Drag and Drop Logic
const onDragStart = (e, label) => {
  isDragging.value = true
  e.dataTransfer.setData('text/plain', label.id)
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

const onDropDeckSlot = (e, targetSlotIndex) => {
  dragOverTarget.value = null
  const draggedId = e.dataTransfer.getData('text/plain')
  if (!draggedId) return
  
  const draggedLabel = labels.value.find(l => l.id === draggedId)
  if (!draggedLabel) return
  
  const targetLabel = getLabelAtSlot(targetSlotIndex)
  
  const deck = activeDeck.value
  if (!deck.slots) deck.slots = {}
  
  // Find where draggedId currently is on this deck
  const currentSlotStr = Object.keys(deck.slots).find(key => deck.slots[key] === draggedId)
  
  if (targetLabel && targetLabel.id !== draggedId) {
    if (currentSlotStr !== undefined) {
      const currentSlot = parseInt(currentSlotStr)
      deck.slots[currentSlot] = targetLabel.id
    }
    deck.slots[targetSlotIndex] = draggedId
  } else if (!targetLabel) {
    if (currentSlotStr !== undefined) {
      delete deck.slots[parseInt(currentSlotStr)]
    }
    deck.slots[targetSlotIndex] = draggedId
  }
}

const onDropLibrary = (e, targetLabel) => {
  dragOverTarget.value = null
  const draggedId = e.dataTransfer.getData('text/plain')
  if (!draggedId) return
  
  const draggedIndex = labels.value.findIndex(l => l.id === draggedId)
  const targetIndex = labels.value.findIndex(l => l.id === targetLabel.id)
  
  if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return
  
  const draggedLabel = labels.value[draggedIndex]
  
  // Library: Fluid list insertion
  labels.value.splice(draggedIndex, 1)
  labels.value.splice(targetIndex, 0, draggedLabel)
}

const onPrintDragStart = (e, labelId, slotIndex) => {
  if (!selectedPrintSlots.value.has(slotIndex)) {
    selectedPrintSlots.value.clear()
    selectedPrintSlots.value.add(slotIndex)
  }
  
  const anchorCol = slotIndex % cols.value
  const anchorRow = Math.floor(slotIndex / cols.value)
  
  const payload = []
  selectedPrintSlots.value.forEach(idx => {
    payload.push({
      id: printGrid.value[idx],
      sourceIdx: idx,
      dc: (idx % cols.value) - anchorCol,
      dr: Math.floor(idx / cols.value) - anchorRow
    })
  })
  e.dataTransfer.setData('application/json', JSON.stringify(payload))
}

const onPrintDrop = (e, targetIndex) => {
  printDragTarget.value = null
  const data = e.dataTransfer.getData('application/json')
  if (!data) return
  const payload = JSON.parse(data)
  
  const targetCol = targetIndex % cols.value
  const targetRow = Math.floor(targetIndex / cols.value)
  
  const newGrid = [...printGrid.value]
  payload.forEach(item => newGrid[item.sourceIdx] = null)
  
  const newSelection = new Set()
  payload.forEach(item => {
    const c = targetCol + item.dc
    const r = targetRow + item.dr
    if (c >= 0 && c < cols.value && r >= 0 && r < rows.value) {
      const idx = r * cols.value + c
      if (payload.length === 1) {
        newGrid[item.sourceIdx] = printGrid.value[idx] // swap
      }
      newGrid[idx] = item.id
    } else {
      newGrid[item.sourceIdx] = item.id // bounce back
    }
  })
  printGrid.value = newGrid
  selectedPrintSlots.value.clear()
}

const getLabelById = (id) => labels.value.find(l => l.id === id)


const startPanOrSelect = (e) => {
  if (e.button === 1 || (e.button === 0 && spacePressed.value)) {
    isPanning.value = true
    panStart.value = { x: e.clientX, y: e.clientY }
    if (previewContentRef.value) {
      scrollStart.value = { x: previewContentRef.value.scrollLeft, y: previewContentRef.value.scrollTop }
    }
    return
  }
  
  const isLabel = e.target.closest('.label-insert') || e.target.closest('.scale-wrapper')
  
  if (e.button === 0) {
    if (isLabel && !e.shiftKey) return // Let native drag handle this
    
    e.preventDefault() // prevent native drag and text selection
    isBoxSelecting.value = true
    const rect = paperSheetRef.value.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / printZoom.value
    const relY = (e.clientY - rect.top) / printZoom.value
    boxSelectStart.value = { x: relX, y: relY }
    printSelectionBox.value = { x: relX, y: relY, w: 0, h: 0 }
    if (!e.shiftKey) selectedPrintSlots.value.clear()
  }
}

const doPanOrSelect = (e) => {
  if (isPanning.value && previewContentRef.value) {
    const dx = e.clientX - panStart.value.x
    const dy = e.clientY - panStart.value.y
    previewContentRef.value.scrollLeft = scrollStart.value.x - dx
    previewContentRef.value.scrollTop = scrollStart.value.y - dy
  } else if (isBoxSelecting.value && paperSheetRef.value) {
    const rect = paperSheetRef.value.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / printZoom.value
    const relY = (e.clientY - rect.top) / printZoom.value
    const minX = Math.min(boxSelectStart.value.x, relX)
    const maxX = Math.max(boxSelectStart.value.x, relX)
    const minY = Math.min(boxSelectStart.value.y, relY)
    const maxY = Math.max(boxSelectStart.value.y, relY)
    printSelectionBox.value = { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
    
    const mmToPx = 96 / 25.4
    const newSelection = new Set()
    for (let i = 0; i < totalPrintSlots.value; i++) {
       if (!printGrid.value[i]) continue
       const c = i % cols.value
       const r = Math.floor(i / cols.value)
       const slotX = 5 * mmToPx + c * labelWidth.value * mmToPx
       const slotY = 5 * mmToPx + r * labelHeight.value * mmToPx
       const slotW = labelWidth.value * mmToPx
       const slotH = labelHeight.value * mmToPx
       if (minX < slotX + slotW && maxX > slotX && minY < slotY + slotH && maxY > slotY) {
         newSelection.add(i)
       }
    }
    selectedPrintSlots.value = newSelection
  }
}

const endPanOrSelect = () => {
  isPanning.value = false
  isBoxSelecting.value = false
  printSelectionBox.value = null
}

const handleZoom = (e) => {
  e.preventDefault()
  if (!previewContentRef.value || !paperSheetRef.value) return
  
  const oldZoom = printZoom.value
  const zoomStep = 0.1
  const delta = e.deltaY < 0 ? zoomStep : -zoomStep
  const newZoom = Math.min(4, Math.max(0.3, oldZoom + delta))
  if (newZoom === oldZoom) return

  const paperRect = paperSheetRef.value.getBoundingClientRect()
  const paperX = (e.clientX - paperRect.left) / oldZoom
  const paperY = (e.clientY - paperRect.top) / oldZoom

  printZoom.value = newZoom
  nextTick(() => {
     const newPaperRect = paperSheetRef.value.getBoundingClientRect()
     const currentPointScreenX = newPaperRect.left + (paperX * newZoom)
     const currentPointScreenY = newPaperRect.top + (paperY * newZoom)
     
     const deltaX = currentPointScreenX - e.clientX
     const deltaY = currentPointScreenY - e.clientY
     
     previewContentRef.value.scrollLeft += deltaX
     previewContentRef.value.scrollTop += deltaY
  })
}

const printLabels = async () => {
  selectedId.value = null
  await nextTick()
  window.print()
}

watch([decks, activeDeckId, labelWidth, labelHeight, labelMaterial, globalLightColor, globalLightBrightness, globalLightEffect, globalTextSize, globalTextColor, globalIconSize, globalIconColor, zoomLevel, labels, selectedId, printFormat, printZoom, selectedPrintIds, printGrid], saveState, { deep: true })

export function useStore() {
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
    zoomLevel,
    darkRoom,
    labels,
    isDragging,
    dragOverTarget,
    selectedId,
    previewMode,
    printFormat,
    printZoom,
    selectedPrintIds,
    printGrid,
    printDragTarget,
    selectedPrintSlots,
    spacePressed,
    
    paperDimensions,
    cols,
    rows,
    totalPrintSlots,
    selectedItemIndex,
    
    getLabelAtSlot,
    printedLabels,
    explicitlyPrintedLabels,
    syncPrintGrid,
    selectAllPrint,
    selectNonePrint,
    selectDeckPrint,
    loadState,
    saveState,
    addLabel,
    fillMatrix,
    matrixWidth,
    decks,
    activeDeckId,
    activeDeck,
    matrixWidth,
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
    onPrintDragStart,
    onPrintDrop,
    getLabelById,
    fileInput,
    printDraggedSlot,
    previewContentRef,
    isPanning,
    panStart,
    scrollStart,
    isBoxSelecting,
    boxSelectStart,
    printSelectionBox,
    paperSheetRef,
    triggerImport,
    startPanOrSelect,
    doPanOrSelect,
    endPanOrSelect,
    handleZoom,
    printLabels
  }
}
