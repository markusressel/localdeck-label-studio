import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LabelEditor from '../LabelEditor.vue'

describe('LabelEditor.vue', () => {
  it('updates the modelValue when input changes', async () => {
    const label = {
      id: '1',
      text: 'Old Text',
      icon: 'mdi:home',
      textSize: null,
      textColor: null,
      iconSize: null,
      iconColor: null,
      lightColor: null,
      lightBrightness: null
    }

    const wrapper = mount(LabelEditor, {
      props: {
        modelValue: label,
        'onUpdate:modelValue': (e) => wrapper.setProps({ modelValue: e })
      }
    })

    // Find the textarea for text content (updated to textarea earlier)
    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    
    // Simulate user typing
    await textarea.setValue('New Text')

    // Since we mutate the object directly in v-model for complex nested objects in our app,
    // we just check if the passed object was mutated
    expect(label.text).toBe('New Text')
  })
})
