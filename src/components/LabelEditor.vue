<template>
  <div class="label-editor">
    
    <div class="style-group">
      <div class="style-group-header" style="display: flex; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <Icon icon="mdi:star-outline" class="header-icon" />
          <span>Icon / Image</span>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <span v-if="hasIconPositioning" @click="resetIconPositioning" title="Reset icon position" style="cursor: pointer; display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; font-size: 0.65rem; font-weight: 600; text-transform: uppercase; color: var(--primary); background: var(--primary-transparent); border-radius: 4px;">
            <Icon icon="mdi:restore" /> Reset Pos
          </span>
        </div>
      </div>
      <div class="control-group">
        <div style="display: flex; gap: 0.75rem; align-items: stretch; margin-bottom: 0.5rem;">
          <div class="large-icon-preview" :style="{ color: isColorTransparent(effectiveIconColor) ? '#fff' : effectiveIconColor }">
            <template v-if="modelValue.icon">
              <span v-if="isEmoji(modelValue.icon)" class="emoji-large" :class="{ 'force-flat-icon': shouldForceFlatColor }">{{ modelValue.icon }}</span>
              <Icon :icon="modelValue.icon" v-else class="svg-large" :class="{ 'force-flat-icon': shouldForceFlatColor }" />
            </template>
            <div v-else class="placeholder-icon">
              <Icon icon="mdi:image-outline" />
            </div>
          </div>
          
          <div class="icon-overrides" v-if="useCustomIcon" style="display: flex; flex-direction: column; gap: 0.5rem; flex: 1; justify-content: center;">
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <NumberStepper v-model="modelValue.iconSize" :min="10" :max="64" :defaultVal="globalIconSize" title="Icon Size" />
              <ColorPicker v-model="modelValue.iconColor" style="flex: 1; border-radius: 8px;" title="Icon Color" />
              <button @click="useCustomIcon = false" class="icon-btn danger-text" title="Reset Overrides" style="align-self: flex-start; border: 1px dashed var(--card-border); border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.15);">
                 <Icon icon="mdi:close" style="font-size: 1.1rem;" />
              </button>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 0.25rem;">
              <span style="font-size: 0.75rem; color: var(--text-muted);">Flatten to solid silhouette</span>
              <CustomSwitch v-model="modelValue.iconFlatten" title="Forces complex/multi-colored icons into a flat shape" />
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 0.25rem;">
              <span style="font-size: 0.75rem; color: var(--text-muted);">Flip Horizontal</span>
              <CustomSwitch v-model="modelValue.iconFlipH" />
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 0.25rem;">
              <span style="font-size: 0.75rem; color: var(--text-muted);">Flip Vertical</span>
              <CustomSwitch v-model="modelValue.iconFlipV" />
            </div>
          </div>
          
          <div v-else class="icon-overrides-enable" @click="useCustomIcon = true" style="flex: 1; display: flex; align-items: center; justify-content: center; border: 1px dashed var(--card-border); border-radius: 8px; cursor: pointer; color: var(--text-muted); font-size: 0.8rem; background: rgba(255,255,255,0.02); transition: all 0.2s;">
            <div style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
              <Icon icon="mdi:pencil-outline" style="font-size: 1.25rem;" />
              Override Size/Color
            </div>
          </div>
        </div>

        <IconPicker v-model="modelValue.icon" />
        
        <div class="file-upload-wrapper mt-2">
          <input type="file" accept="image/*" @change="handleFileUpload" id="image-upload" class="file-input" />
          <label for="image-upload" class="file-label">
            <Icon icon="mdi:upload" /> Or upload custom image
          </label>
        </div>
        <div v-if="modelValue.image" class="mt-2 text-sm text-center" style="color: var(--text-muted);">
          Custom image loaded. <a href="#" @click.prevent="clearImage" class="danger-text">Remove</a>
        </div>
      </div>
    </div>

    <div class="style-group bordered-top">
      <div class="style-group-header" style="display: flex; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <Icon icon="mdi:format-text" class="header-icon" />
          <span>Label Text</span>
        </div>
        <span v-if="hasTextPositioning" @click="resetTextPositioning" title="Reset text position" style="cursor: pointer; display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; font-size: 0.65rem; font-weight: 600; text-transform: uppercase; color: var(--primary); background: var(--primary-transparent); border-radius: 4px;">
          <Icon icon="mdi:restore" /> Reset Pos
        </span>
      </div>
      <div class="control-group">
        <CustomInput v-model="modelValue.text" multiline placeholder="Press Enter for new lines..." rows="2" />
      </div>
      
      <div class="control-row">
        <CustomCheckbox v-model="useCustomText" style="margin-bottom: 0.5rem;  color: var(--text-muted);">Override Global Text Style</CustomCheckbox>
      </div>

      <Transition name="slide-down">
        <div class="control-row mt-2" v-if="useCustomText">
          <div class="control-group half">
            <label>Text Size (px)</label>
            <input type="number" v-model.number="modelValue.textSize" min="6" max="32" />
          </div>
          <div class="control-group half">
            <label>Text Color</label>
            <ColorPicker v-model="modelValue.textColor" />
          </div>
        </div>
      </Transition>
    </div>

    <div class="style-group bordered-top">
      <div class="style-group-header">
        <Icon icon="mdi:palette-outline" class="header-icon" />
        <span>Background</span>
      </div>
      <div class="control-row">
        <CustomCheckbox v-model="useCustomBg" style="margin-bottom: 0.5rem;  color: var(--text-muted);">Override Global Background</CustomCheckbox>
      </div>
      <Transition name="slide-down">
        <div class="control-row mt-2" v-if="useCustomBg">
          <div class="control-group">
            <label>Background Color</label>
            <ColorPicker v-model="modelValue.backgroundColor" />
          </div>
          <div class="control-group" style="flex: 1;">
            <label>Quick Presets</label>
            <div style="display: flex; gap: 0.5rem;">
               <button @click="setBlackLabel" class="icon-btn" style="flex: 1; border: 1px solid var(--card-border); border-radius: 6px; font-size: 0.75rem; background: var(--input-bg);">
                 Invert (Black)
               </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <div class="style-group bordered-top">
      <div class="style-group-header" style="justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <Icon icon="mdi:lightbulb-outline" class="header-icon" />
          <span>LED Backlight</span>
        </div>
        <CustomSwitch v-model="lightEnabled" title="Enable/Disable LED for this key" />
      </div>
      <div class="control-group" :style="{ opacity: lightEnabled ? 1 : 0.4, pointerEvents: lightEnabled ? 'auto' : 'none' }">
        <div class="light-override">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <CustomCheckbox v-model="useCustomLight">Custom Override LED</CustomCheckbox>
            <button v-if="useCustomLight" @click="resetLight" class="icon-btn danger-text" title="Reset to default LED" style="border: 1px dashed var(--card-border); border-radius: 8px; width: 32px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.15); height: 28px;">
              <Icon icon="mdi:restore" style="font-size: 1.1rem;" />
            </button>
          </div>
          
          <Transition name="slide-down">
            <div v-if="useCustomLight">
              <div class="control-row mt-2">
                <div class="control-group half">
                  <label>Brightness</label>
                  <CustomSlider v-model="modelValue.lightBrightness" :min="0" :max="100" showValue />
                </div>
                <div class="control-group half">
                  <label>Color</label>
                  <ColorPicker v-model="modelValue.lightColor" />
                </div>
              </div>
              <div class="control-row mt-2">
                <div class="control-group" style="width: 100%;">
                  <label>Effect</label>
                  <CustomSelect 
                    v-model="modelValue.lightEffect" 
                    :options="[
                      { value: null, label: 'Global Default' },
                      { value: 'static', label: 'Static' },
                      { value: 'breathing', label: 'Breathing' },
                      { value: 'rainbow', label: 'Rainbow' }
                    ]"
                  />
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
    
    <div class="style-group bordered-top">
      <div class="style-group-header">
        <Icon icon="mdi:auto-fix" class="header-icon" />
        <span>Image Adjustments</span>
      </div>
      <div class="control-row">
        <div class="control-group half">
          <label>Contrast (%)</label>
          <CustomSlider v-model="contrastProxy" :min="0" :max="200" showValue />
        </div>
        <div class="control-group half">
          <label>Saturation (%)</label>
          <CustomSlider v-model="saturationProxy" :min="0" :max="200" showValue />
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import ColorPicker from './ColorPicker.vue'
import CustomCheckbox from './CustomCheckbox.vue'
import CustomSwitch from './CustomSwitch.vue'
import CustomSelect from './CustomSelect.vue'
import IconPicker from './IconPicker.vue'
import NumberStepper from './NumberStepper.vue'
import CustomInput from './CustomInput.vue'
import CustomSlider from './CustomSlider.vue'
import * as emoji from 'node-emoji'
import { useStore } from '../composables/useStore'
import { isColorTransparent } from '../utils/colorUtils.js'
import { resolveLabelStyle } from '../utils/labelStyle.js'

const isEmoji = (str) => {
  if (!str) return false
  return /\p{Extended_Pictographic}/u.test(str) || emoji.has(str)
}

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])
const { 
  globalIconColor, 
  globalIconFlatten, 
  globalIconSize, 
  globalTextSize, 
  globalTextColor, 
  globalBackgroundColor,
  globalStyle
} = useStore()

const style = computed(() => resolveLabelStyle(props.modelValue, globalStyle.value))
const effectiveIconColor = computed(() => style.value.iconColor)
const shouldForceFlatColor = computed(() => style.value.iconFlatten)

const contrastProxy = computed({
  get: () => props.modelValue.contrast ?? 100,
  set: (val) => {
    emit('update:modelValue', { ...props.modelValue, contrast: val === 100 ? null : val })
  }
})

const saturationProxy = computed({
  get: () => props.modelValue.saturation ?? 100,
  set: (val) => {
    emit('update:modelValue', { ...props.modelValue, saturation: val === 100 ? null : val })
  }
})

const useCustomText = computed({
  get: () => props.modelValue.textSize !== null && props.modelValue.textSize !== undefined,
  set: (val) => {
    if (val) {
      props.modelValue.textSize = globalTextSize.value
      props.modelValue.textColor = globalTextColor.value
    } else {
      props.modelValue.textSize = null
      props.modelValue.textColor = null
    }
  }
})

const useCustomIcon = computed({
  get: () => props.modelValue.iconSize !== null && props.modelValue.iconSize !== undefined,
  set: (val) => {
    if (val) {
      props.modelValue.iconSize = globalIconSize.value
      props.modelValue.iconColor = globalIconColor.value
    } else {
      props.modelValue.iconSize = null
      props.modelValue.iconColor = null
    }
  }
})

const hasIconPositioning = computed(() => {
  const l = props.modelValue
  return (l.iconOffsetX && l.iconOffsetX !== 0) || (l.iconOffsetY && l.iconOffsetY !== 0)
})

const hasTextPositioning = computed(() => {
  const l = props.modelValue
  return (l.textOffsetX && l.textOffsetX !== 0) || (l.textOffsetY && l.textOffsetY !== 0)
})

const resetIconPositioning = () => {
  const updated = { ...props.modelValue }
  updated.iconOffsetX = 0
  updated.iconOffsetY = 0
  emit('update:modelValue', updated)
}

const resetTextPositioning = () => {
  const updated = { ...props.modelValue }
  updated.textOffsetX = 0
  updated.textOffsetY = 0
  emit('update:modelValue', updated)
}

const useCustomBg = computed({
  get: () => props.modelValue.backgroundColor !== null && props.modelValue.backgroundColor !== undefined,
  set: (val) => {
    if (val) {
      props.modelValue.backgroundColor = globalBackgroundColor.value || '#000000'
    } else {
      props.modelValue.backgroundColor = null
    }
  }
})

const setBlackLabel = () => {
  const updated = { ...props.modelValue }
  updated.backgroundColor = '#000000'
  updated.iconColor = '#ffffff'
  updated.iconSize = updated.iconSize ?? globalIconSize.value
  updated.textColor = '#ffffff'
  updated.textSize = updated.textSize ?? globalTextSize.value
  emit('update:modelValue', updated)
}

const cachedLightColor = ref('#10b981')
const cachedLightBrightness = ref(80)
const cachedLightEffect = ref('static')

const lightEnabled = computed({
  get: () => props.modelValue.lightEnabled !== false,
  set: (val) => { props.modelValue.lightEnabled = val }
})

const useCustomLight = computed({
  get: () => props.modelValue.lightColor !== null && props.modelValue.lightColor !== undefined,
  set: (val) => {
    if (val) {
      props.modelValue.lightColor = cachedLightColor.value
      props.modelValue.lightBrightness = cachedLightBrightness.value
      props.modelValue.lightEffect = cachedLightEffect.value
    } else {
      if (props.modelValue.lightColor !== null) {
        cachedLightColor.value = props.modelValue.lightColor
        cachedLightBrightness.value = props.modelValue.lightBrightness
        cachedLightEffect.value = props.modelValue.lightEffect
      }
      props.modelValue.lightColor = null
      props.modelValue.lightBrightness = null
      props.modelValue.lightEffect = null
    }
  }
})

const resetLight = () => {
  props.modelValue.lightColor = '#10b981'
  props.modelValue.lightBrightness = 80
  props.modelValue.lightEffect = 'static'
}

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const updated = { ...props.modelValue, image: e.target.result }
      emit('update:modelValue', updated)
    }
    reader.readAsDataURL(file)
  }
}

const clearImage = () => {
  const updated = { ...props.modelValue, image: null }
  emit('update:modelValue', updated)
}
</script>

<style scoped>
.label-editor {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-group label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted);
}

.control-group input[type="text"],
.text-input-area,
.control-group input[type="number"] {
  width: 100%;
}

.control-group input:focus,
.control-group textarea:focus,
.control-group select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-transparent);
  background: var(--overlay-bg);
}

.text-input-area {
  resize: vertical;
  min-height: 40px;
  line-height: 1.4;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}

.text-input-area::-webkit-scrollbar {
  width: 8px;
}
.text-input-area::-webkit-scrollbar-track {
  background: rgba(0,0,0,0.1);
  border-radius: 4px;
}
.text-input-area::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.2);
  border-radius: 4px;
}

.control-row {
  display: flex;
  gap: 1rem;
}

.half {
  flex: 1;
}

.divider {
  height: 1px;
  background-color: var(--card-border);
  margin: 0.5rem 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input {
  margin: 0;
  cursor: pointer;
}

.color-picker {
  height: 38px;
  padding: 0;
  border-radius: 6px;
  width: 100%;
  cursor: pointer;
}

.mt-2 {
  margin-top: 0.5rem;
}

.text-sm {
  font-size: 0.85rem;
}
.text-center {
  text-align: center;
}

.file-upload-wrapper {
  position: relative;
  overflow: hidden;
  display: inline-block;
  width: 100%;
}

.file-input {
  position: absolute;
  left: 0;
  top: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}

.file-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed var(--card-border);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  box-sizing: border-box;
}

.file-upload-wrapper:hover .file-label {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-transparent);
}
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.3s ease; overflow: hidden; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; margin-top: 0; }
.slide-down-enter-to, .slide-down-leave-from { opacity: 1; max-height: 200px; }
.large-icon-preview {
  width: 80px;
  height: 80px;
  background: rgba(0,0,0,0.15);
  border: 1px dashed var(--card-border);
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}
.emoji-large, .svg-large {
  font-size: 3.5rem;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
}
.placeholder-icon {
  font-size: 2.5rem;
  color: var(--text-muted);
  opacity: 0.5;
}
.icon-overrides-enable:hover {
  border-color: var(--primary);
  color: var(--primary) !important;
  background: rgba(16, 185, 129, 0.05) !important;
}
</style>