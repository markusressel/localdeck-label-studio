import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import LabelEditor from '../LabelEditor.vue'
import { useStore } from '../../composables/useStore.js'

describe('LabelEditor.vue', () => {
  let store
  let label

  beforeEach(() => {
    store = useStore()
    store.labels.value = []
    const id = store.addLabel({ text: 'Old Text', icon: 'mdi:home' })
    label = store.labels.value.find(l => l.id === id)
  })

  const mountEditor = () => mount(LabelEditor, { props: { label } })

  it('writes text edits to the store label in place', async () => {
    const wrapper = mountEditor()
    await wrapper.find('textarea').setValue('New Text')
    expect(store.labels.value[0]).toBe(label)
    expect(label.text).toBe('New Text')
  })

  it('applies the black label preset through the store', async () => {
    store.globalTextSize.value = 12
    store.updateLabel(label.id, { backgroundColor: '#ffffff' }) // presets show with the override on
    const wrapper = mountEditor()
    const button = wrapper.findAll('button').find(b => /black/i.test(b.text()))
    expect(button).toBeDefined()
    await button.trigger('click')
    expect(label.backgroundColor).toBe('#000000')
    expect(label.textColor).toBe('#ffffff')
    expect(label.iconColor).toBe('#ffffff')
    expect(label.textSize).toBe(12)
  })
})
