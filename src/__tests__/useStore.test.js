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
    store.darkRoom.value = false
    
    store.saveState()
    
    store.printOffsetY.value = 0
    store.printZoom.value = 1
    store.labelWidth.value = 10
    store.darkRoom.value = true
    
    store.loadState()
    
    expect(store.printOffsetY.value).toBe(18)
    expect(store.printZoom.value).toBe(1.5)
    expect(store.labelWidth.value).toBe(15)
    expect(store.darkRoom.value).toBe(false)
  })

  it('seeds every empty deck slot with a starter label', () => {
    store.seedDefaultLabels()
    const total = store.totalMatrixSlots.value
    expect(store.labels.value.length).toBe(total)
    for (let i = 0; i < total; i++) expect(store.getLabelAtSlot(i)).not.toBeNull()
  })

  it('handles label duplication correctly', () => {
    const id1 = store.addLabel({ text: 'First' })
    store.selectedId.value = id1
    
    store.duplicateSelected()
    expect(store.labels.value.length).toBe(2)
    expect(store.labels.value[1].text).toBe('First')
    expect(store.labels.value[1].id).not.toBe(id1)
  })

  it('groups print checklist items by deck, then unused library labels', () => {
    const id1 = store.addLabel({ text: 'One' }, 0)
    const id2 = store.addLabel({ text: 'Two' }, 1)
    const id3 = store.addLabel({ text: 'Three' }) // Not in deck

    const items = store.printChecklistItems.value
    expect(items.map(i => i.labelId)).toEqual([id1, id2, id3])
    expect(items[0].id).toBe('deck-default-slot-0')
    expect(items[0].category).toBe('Main Deck')
    expect(items[2].id).toBe(`unused-${id3}`)
    expect(items[2].category).toBe('Library (Unused)')
  })

  it('round-trips every persisted setting through export and import', () => {
    store.addLabel({ text: 'Keep' }, 0)
    const exported = JSON.parse(JSON.stringify(store.getStateObject()))
    expect(exported.version).toBe(1)

    store.globalTextSize.value = 99
    store.caseColor.value = '#123456'
    store.preview2dFalloff.value = 7
    store.labels.value = []

    expect(store.loadStateFromObject(exported)).toBe(true)
    expect(JSON.parse(JSON.stringify(store.getStateObject()))).toEqual(exported)
  })

  it('migrates unversioned saves once', () => {
    const legacy = {
      labels: [
        { id: 'a', text: 'A', deckSlot: 2, print: true, textSize: 10, textColor: '#000000', iconSize: 24, iconColor: '#000000' }
      ]
    }
    store.loadStateFromObject(legacy)
    expect(store.decks.value[0].slots[2]).toBe('a')
    const label = store.labels.value[0]
    expect(label.deckSlot).toBeUndefined()
    expect(label.print).toBeUndefined()
    expect(label.textSize).toBeNull()
    expect(label.iconSize).toBeNull()

    // An explicit 10 / black override saved by the current version must survive a reload
    label.textSize = 10
    label.textColor = '#000000'
    store.saveState()
    store.loadState()
    expect(store.labels.value[0].textSize).toBe(10)
    expect(store.labels.value[0].textColor).toBe('#000000')
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
