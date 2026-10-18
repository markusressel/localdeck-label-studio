import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { createStore } from '../composables/useStore.js'

const createMemoryStorage = () => {
  const data = new Map()
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key)
  }
}

describe('useStore', () => {
  let store

  beforeEach(() => {
    store = createStore({ storage: createMemoryStorage() })
  })

  it('creates independent instances', () => {
    const other = createStore({ storage: createMemoryStorage() })
    store.addLabel({ text: 'Only here' })
    expect(store.labels.value.length).toBe(1)
    expect(other.labels.value.length).toBe(0)
  })

  it('autosaves to its own storage', async () => {
    const storage = createMemoryStorage()
    const saving = createStore({ storage })
    saving.addLabel({ text: 'Saved' })
    await nextTick()
    const saved = JSON.parse(storage.getItem('localdeck-labels'))
    expect(saved.labels.map(l => l.text)).toEqual(['Saved'])
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
    store.labelWidth.value = 15
    store.darkRoom.value = false
    
    store.saveState()
    
    store.printOffsetY.value = 0
    store.labelWidth.value = 10
    store.darkRoom.value = true
    
    store.loadState()
    
    expect(store.printOffsetY.value).toBe(18)
    expect(store.labelWidth.value).toBe(15)
    expect(store.darkRoom.value).toBe(false)
  })

  it('does not save the print zoom, which is fitted on every open', () => {
    expect(store.getStateObject()).not.toHaveProperty('printZoom')
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
    expect(exported.version).toBe(3)

    store.globalTextSize.value = 99
    store.globalTextColor.value = '#123456'
    store.preview2dFalloff.value = 7
    store.labels.value = []

    expect(store.loadStateFromObject(exported)).toBe(true)
    expect(JSON.parse(JSON.stringify(store.getStateObject()))).toEqual(exported)
  })

  it('resets 2D render values from older saves to the current presets', () => {
    store.loadStateFromObject({ version: 1, material: 'transparent', preview2dLedIntensity: 0, preview2dTranslucency: 1, preview2dFalloff: 0, labels: [{ id: 'a' }] })
    expect(store.preview2dLedIntensity.value).toBe(1)

    store.loadStateFromObject({ version: 2, material: 'thick-paper', preview2dLedIntensity: 0.3, preview2dTranslucency: 0.02, labels: [{ id: 'a' }] })
    expect(store.preview2dLedIntensity.value).toBe(1)
    expect(store.preview2dTranslucency.value).toBe(0.25)
    expect(store.preview2dFalloff.value).toBe(8)
  })

  it('lets film through more light than paper in the 2D preview', async () => {
    const translucencyFor = async (material) => {
      store.labelMaterial.value = material
      await nextTick()
      return store.preview2dTranslucency.value
    }
    store.preview2dLedIntensity.value = 1.5
    const thick = await translucencyFor('thick-paper')
    const thin = await translucencyFor('thin-paper')
    const film = await translucencyFor('transparent')
    // The material does not change the LED output itself
    expect(store.preview2dLedIntensity.value).toBe(1.5)
    expect(film).toBeGreaterThan(thin)
    expect(thin).toBeGreaterThan(thick)
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

  it('swaps two deck labels when dropping onto an occupied slot', () => {
    const a = store.addLabel({ text: 'A' }, 0)
    const b = store.addLabel({ text: 'B' }, 1)
    store.onDropDeckSlot({ dataTransfer: { getData: (k) => k === 'text/plain' ? a : '0' } }, 1)
    expect(store.activeDeck.value.slots[0]).toBe(b)
    expect(store.activeDeck.value.slots[1]).toBe(a)
  })

  it('removes a deleted label from every deck', () => {
    const id = store.addLabel({ text: 'Shared' }, 0)
    store.decks.value.push({ id: 'second', name: 'Second', width: 6, height: 4, slots: { 3: id } })
    store.selectedId.value = id
    store.removeSelected()
    expect(store.decks.value[0].slots[0]).toBeUndefined()
    expect(store.decks.value[1].slots[3]).toBeUndefined()
  })

  it('fills empty deck slots with unused library labels only', () => {
    const placed = store.addLabel({ text: 'Placed' }, 0)
    const free1 = store.addLabel({ text: 'Free 1' })
    const free2 = store.addLabel({ text: 'Free 2' })
    store.fillMatrix()
    expect(store.activeDeck.value.slots).toEqual({ 0: placed, 1: free1, 2: free2 })
  })

  it('syncs the print grid with the selected print items', () => {
    store.addLabel({ text: 'One' }, 0)
    store.addLabel({ text: 'Two' }, 1)
    store.selectedPrintIds.value = ['deck-default-slot-0', 'deck-default-slot-1']
    store.printGrid.value = []
    store.syncPrintGrid()
    expect(store.printGrid.value.length).toBe(store.totalPrintSlots.value)
    expect(store.printGrid.value.slice(0, 2)).toEqual(['deck-default-slot-0', 'deck-default-slot-1'])

    // Deselected items are cleared, keeping the others in place
    store.selectedPrintIds.value = ['deck-default-slot-1']
    store.syncPrintGrid()
    expect(store.printGrid.value.slice(0, 2)).toEqual([null, 'deck-default-slot-1'])
  })

  it('reorders the library', () => {
    const a = store.addLabel({ text: 'A' })
    const b = store.addLabel({ text: 'B' })
    const c = store.addLabel({ text: 'C' })
    store.moveLibraryLabel(c, a)
    expect(store.labels.value.map(l => l.id)).toEqual([c, a, b])
  })

  it('stamps library labels and moves slot labels', () => {
    const a = store.addLabel({ text: 'A' }, 0)
    store.placeLabelInSlot(a, 1) // from the library
    expect(store.activeDeck.value.slots).toEqual({ 0: a, 1: a })
    store.placeLabelInSlot(a, 5, 1) // from slot 1
    expect(store.activeDeck.value.slots).toEqual({ 0: a, 5: a })
  })

  it('adds, renames and removes decks', () => {
    const first = store.addDeck('First')
    const second = store.addDeck('Second')
    expect(first).not.toBe(second)
    expect(store.activeDeckId.value).toBe(second)

    store.renameDeck(first, 'Renamed')
    store.renameDeck(first, '') // ignored
    expect(store.decks.value.find(d => d.id === first).name).toBe('Renamed')

    expect(store.removeDeck(second)).toBe(true)
    expect(store.activeDeckId.value).toBe('default')
    expect(store.removeDeck('default')).toBe(true)
    expect(store.removeDeck(first)).toBe(false) // the last deck stays
    expect(store.decks.value.map(d => d.id)).toEqual([first])
  })
})
