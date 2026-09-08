import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../composables/useStore.js'

describe('useStore', () => {
  let store

  beforeEach(() => {
    localStorage.clear()
    store = useStore()
    
    // Reset singleton state
    store.labels.value = []
    store.decks.value = [{
      id: 'default',
      name: 'Main Deck',
      width: 6,
      height: 4,
      slots: {}
    }]
    store.activeDeckId.value = 'default'
    store.printOffsetY.value = 0
    store.printZoom.value = 1
  })

  it('adds a new label correctly', () => {
    const newId = store.addLabel({ text: 'Test Label' })
    expect(newId).toBeDefined()
    expect(store.labels.value.length).toBe(1)
    expect(store.labels.value[0].text).toBe('Test Label')
  })

  it('adds a new label to a specific slot', () => {
    const newId = store.addLabel({ text: 'Slot Label' }, 5)
    expect(store.labels.value.length).toBe(1)
    expect(store.activeDeck.value.slots[5]).toBe(newId)
  })

  it('deletes a label and removes it from slots', () => {
    const newId = store.addLabel({ text: 'Delete Me' }, 2)
    expect(store.activeDeck.value.slots[2]).toBe(newId)
    
    store.selectedId.value = newId
    store.removeSelected()
    
    expect(store.labels.value.length).toBe(0)
    expect(store.activeDeck.value.slots[2]).toBeUndefined()
  })

  it('saves and loads state persistence accurately', () => {
    store.printOffsetY.value = 18
    store.printZoom.value = 1.5
    store.labelWidth.value = 15
    
    store.saveState()
    
    store.printOffsetY.value = 0
    store.printZoom.value = 1
    store.labelWidth.value = 10
    
    store.loadState()
    
    expect(store.printOffsetY.value).toBe(18)
    expect(store.printZoom.value).toBe(1.5)
    expect(store.labelWidth.value).toBe(15)
  })

  it('handles label duplication correctly', () => {
    const id1 = store.addLabel({ text: 'First' })
    store.selectedId.value = id1
    
    store.duplicateSelected()
    expect(store.labels.value.length).toBe(2)
    expect(store.labels.value[1].text).toBe('First')
    expect(store.labels.value[1].id).not.toBe(id1)
  })

  it('handles print selection logic', () => {
    store.labels.value = [] // Reset
    const id1 = store.addLabel({ text: 'One' }, 0)
    const id2 = store.addLabel({ text: 'Two' }, 1)
    const id3 = store.addLabel({ text: 'Three' }) // Not in deck
    
    // Select all
    store.selectAllPrint()
    expect(store.selectedPrintIds.value.length).toBe(3)
    
    // Select none
    store.selectNonePrint()
    expect(store.selectedPrintIds.value.length).toBe(0)
    
    // Select deck
    store.selectDeckPrint()
    expect(store.selectedPrintIds.value.length).toBe(2)
    expect(store.selectedPrintIds.value).toContain(id1)
    expect(store.selectedPrintIds.value).toContain(id2)
  })

  it('handles drag and drop logic for labels', () => {
    store.labels.value = []
    store.decks.value[0].slots = {}
    const id1 = store.addLabel({ text: 'Drag Me' })
    const id2 = store.addLabel({ text: 'Deck Label' }, 0)
    
    // Test drop on deck slot
    store.onDragStart({ dataTransfer: { setData: () => {}, effectAllowed: '' } }, { id: id1 }, 'library')
    store.onDropDeckSlot({ dataTransfer: { getData: (k) => k === 'text/plain' ? id1 : 'library' } }, 1)
    
    // A library label dropped onto a deck slot should duplicate/stamp it
    expect(store.labels.value.length).toBe(2)
    expect(store.activeDeck.value.slots[1]).toBe(id1)
    
    // Test moving a deck label to another deck slot
    store.onDragStart({ dataTransfer: { setData: () => {}, effectAllowed: '' } }, { id: id2 }, '0')
    store.onDropDeckSlot({ dataTransfer: { getData: (k) => k === 'text/plain' ? id2 : '0' } }, 3)
    
    // It should move, not stamp
    expect(store.labels.value.length).toBe(2)
    expect(store.activeDeck.value.slots[0]).toBeUndefined()
    expect(store.activeDeck.value.slots[3]).toBe(id2)
  })
})
