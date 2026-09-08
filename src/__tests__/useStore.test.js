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
    
    store.deleteLabel(newId)
    expect(store.labels.value.length).toBe(0)
    expect(store.activeDeck.value.slots[2]).toBeUndefined()
  })

  it('saves and loads state persistence accurately', () => {
    store.printOffsetY.value = 18
    store.printZoom.value = 1.5
    store.labelWidth.value = 15
    
    store.saveState()
    
    // Reset local values to simulate a refresh
    store.printOffsetY.value = 0
    store.printZoom.value = 1
    store.labelWidth.value = 10
    
    store.loadState()
    
    expect(store.printOffsetY.value).toBe(18)
    expect(store.printZoom.value).toBe(1.5)
    expect(store.labelWidth.value).toBe(15)
  })
})
