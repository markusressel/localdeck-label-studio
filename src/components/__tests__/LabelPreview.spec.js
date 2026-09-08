import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LabelPreview from '../LabelPreview.vue'
import { Icon } from '@iconify/vue'

describe('LabelPreview.vue', () => {
  const defaultLabel = {
    id: 'test-1',
    text: 'Test Label',
    icon: 'mdi:home',
    textSize: null,
    textColor: null,
    iconSize: null,
    iconColor: null
  }

  it('renders correctly with default props', () => {
    const wrapper = mount(LabelPreview, {
      props: {
        label: defaultLabel,
        width: 14,
        height: 14,
        scale: 1,
        material: 'transparent',
        globalLightColor: '#ff0000',
        globalLightBrightness: 80,
        globalTextSize: 10,
        globalTextColor: '#000000',
        globalIconSize: 24,
        globalIconColor: '#000000',
        printMode: false,
        darkRoom: false
      }
    })
    
    // Should render the text
    expect(wrapper.text()).toContain('Test Label')
    // Should render an iconify span
    const icon = wrapper.findComponent(Icon)
    expect(icon.exists()).toBe(true)
    expect(icon.props('icon')).toBe('mdi:home')
  })

  it('applies dark mode classes when darkRoom is true and not in print mode', () => {
    const wrapper = mount(LabelPreview, {
      props: {
        label: defaultLabel,
        width: 14,
        height: 14,
        scale: 1,
        material: 'transparent',
        globalLightColor: '#ff0000',
        globalLightBrightness: 80,
        globalTextSize: 10,
        globalTextColor: '#000000',
        globalIconSize: 24,
        globalIconColor: '#000000',
        printMode: false,
        darkRoom: true
      }
    })
    
    const keycapOuter = wrapper.find('.keycap-outer')
    expect(keycapOuter.classes()).toContain('is-dark-room')
    expect(keycapOuter.classes()).not.toContain('is-print-mode')
  })

  it('removes dark mode classes when in print mode regardless of darkRoom setting', () => {
    const wrapper = mount(LabelPreview, {
      props: {
        label: defaultLabel,
        width: 14,
        height: 14,
        scale: 1,
        material: 'transparent',
        globalLightColor: '#ff0000',
        globalLightBrightness: 80,
        globalTextSize: 10,
        globalTextColor: '#000000',
        globalIconSize: 24,
        globalIconColor: '#000000',
        printMode: true,
        darkRoom: true // Even if true, printMode should override
      }
    })
    
    const keycapOuter = wrapper.find('.keycap-outer')
    expect(keycapOuter.classes()).not.toContain('is-dark-room')
    expect(keycapOuter.classes()).toContain('is-print-mode')
  })

  it('respects label overrides over global settings', () => {
    const overrideLabel = {
      ...defaultLabel,
      textSize: 16,
      textColor: '#ffffff',
      iconSize: 32,
      iconColor: '#bbbbbb'
    }

    const wrapper = mount(LabelPreview, {
      props: {
        label: overrideLabel,
        width: 14,
        height: 14,
        scale: 1,
        material: 'transparent',
        globalLightColor: '#ff0000',
        globalLightBrightness: 80,
        globalTextSize: 10,
        globalTextColor: '#000000',
        globalIconSize: 24,
        globalIconColor: '#000000',
        printMode: false,
        darkRoom: false
      }
    })

    const textElement = wrapper.find('.label-text')
    expect(textElement.attributes('style')).toContain('font-size: 16px')
    expect(textElement.attributes('style')).toContain('color: rgb(255, 255, 255)') // #ffffff is often converted to rgb
  })
})
