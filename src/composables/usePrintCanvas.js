import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useStore } from './useStore.js'

const MM_TO_PX = 96 / 25.4
const MIN_ZOOM = 0.3
const MAX_ZOOM = 4

/**
 * Interaction state of the print sheet: panning, wheel zoom, box selection and
 * dragging labels between print slots. Local to PrintWorkspace; only the
 * resulting layout (printGrid, printZoom) lives in the global store.
 */
export function usePrintCanvas() {
  const {
    previewMode,
    activeDeckId,
    selectedPrintIds,
    printChecklistItems,
    printGrid,
    printZoom,
    paperDimensions,
    cols,
    rows,
    totalPrintSlots,
    syncPrintGrid
  } = useStore()

  // Template refs
  const previewContentRef = ref(null)
  const paperSheetRef = ref(null)

  const printDragTarget = ref(null)
  const selectedPrintSlots = ref(new Set())
  const printSelectionBox = ref(null)

  const spacePressed = ref(false)
  const isPanning = ref(false)
  const panStart = ref({ x: 0, y: 0 })
  const scrollStart = ref({ x: 0, y: 0 })
  const isBoxSelecting = ref(false)
  const boxSelectStart = ref({ x: 0, y: 0 })

  const onKeyDown = (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault()
      spacePressed.value = true
    }
  }
  const onKeyUp = (e) => {
    if (e.code === 'Space') spacePressed.value = false
  }
  // Printing needs the sheet scrolled to the origin; restore the view afterwards
  let scrollBeforePrint = null
  const onBeforePrint = () => {
    const el = previewContentRef.value
    if (!el) return
    scrollBeforePrint = { left: el.scrollLeft, top: el.scrollTop }
    el.scrollTop = 0
    el.scrollLeft = 0
  }
  const onAfterPrint = () => {
    const el = previewContentRef.value
    if (!el || !scrollBeforePrint) return
    el.scrollLeft = scrollBeforePrint.left
    el.scrollTop = scrollBeforePrint.top
    scrollBeforePrint = null
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('beforeprint', onBeforePrint)
    window.addEventListener('afterprint', onAfterPrint)
  })
  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('beforeprint', onBeforePrint)
    window.removeEventListener('afterprint', onAfterPrint)
  })

  // Zoom so the whole sheet fits the visible area, then scroll it to the center
  const fitSheetToView = () => {
    const el = previewContentRef.value
    if (!el) return
    const margin = 96 // px around the sheet: container padding plus some breathing room
    const sheetW = paperDimensions.value.w * MM_TO_PX
    const sheetH = paperDimensions.value.h * MM_TO_PX
    const fit = Math.min((el.clientWidth - margin) / sheetW, (el.clientHeight - margin) / sheetH)
    printZoom.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(fit * 100) / 100))
  }

  const centerSheet = () => {
    const el = previewContentRef.value
    if (!el) return
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
    el.scrollTop = (el.scrollHeight - el.clientHeight) / 2
  }

  // Entering print preview: default to printing the active deck, then fit and center the sheet
  watch(previewMode, async (newVal) => {
    if (newVal && selectedPrintIds.value.length === 0) {
      selectedPrintIds.value = printChecklistItems.value.filter(item => item.id.startsWith(`deck-${activeDeckId.value}`)).map(item => item.id)
    }
    if (newVal) {
      syncPrintGrid()
      await nextTick() // sidebars rendered, so the visible area has its final size
      fitSheetToView()
      await nextTick() // sheet re-rendered at the new zoom
      // Wait for the browser to lay out the new sizes before measuring scroll extents
      requestAnimationFrame(centerSheet)
    }
  })

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

      // Hit-test against the rendered slots (in unscaled sheet coordinates), so
      // padding, print offset and layout changes can't drift from the box
      const newSelection = new Set()
      const slots = paperSheetRef.value.querySelectorAll('.print-grid-slot')
      slots.forEach((slot, i) => {
        if (i >= totalPrintSlots.value || !printGrid.value[i]) return
        const s = slot.getBoundingClientRect()
        const slotX = (s.left - rect.left) / printZoom.value
        const slotY = (s.top - rect.top) / printZoom.value
        const slotW = s.width / printZoom.value
        const slotH = s.height / printZoom.value
        if (minX < slotX + slotW && maxX > slotX && minY < slotY + slotH && maxY > slotY) {
          newSelection.add(i)
        }
      })
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
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom + delta))
    if (newZoom === oldZoom) return

    const paperRect = paperSheetRef.value.getBoundingClientRect()
    const paperX = (e.clientX - paperRect.left) / oldZoom
    const paperY = (e.clientY - paperRect.top) / oldZoom

    printZoom.value = newZoom
    nextTick(() => {
      // Keep the paper point under the cursor fixed while zooming
      const newPaperRect = paperSheetRef.value.getBoundingClientRect()
      previewContentRef.value.scrollLeft += newPaperRect.left + (paperX * newZoom) - e.clientX
      previewContentRef.value.scrollTop += newPaperRect.top + (paperY * newZoom) - e.clientY
    })
  }

  return {
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
  }
}
