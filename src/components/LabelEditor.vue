<template>
  <div class="label-editor">
    <div class="control-group">
      <label>Label Text (Multi-line supported)</label>
      <textarea v-model="modelValue.text" placeholder="e.g. Living Room" rows="2" class="text-input-area"></textarea>
    </div>
    
    <div class="control-row">
      <label class="checkbox-label" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; display: block;">
        <input type="checkbox" v-model="useCustomText" /> Override Global Text Style
      </label>
    </div>

    <div class="control-row mt-2" v-if="useCustomText">
      <div class="control-group half">
        <label>Text Size (px)</label>
        <input type="number" v-model.number="modelValue.textSize" min="6" max="32" />
      </div>
      <div class="control-group half">
        <label>Text Color</label>
        <input type="color" v-model="modelValue.textColor" class="color-picker" />
      </div>
    </div>
    
    <div class="divider"></div>

    <div class="control-group">
      <label>Icon / Image</label>
      <input type="text" v-model="modelValue.icon" placeholder="Iconify key (e.g. mdi:home)" />
      
      <div class="file-upload-wrapper mt-2">
        <input type="file" accept="image/*" @change="handleFileUpload" id="image-upload" class="file-input" />
        <label for="image-upload" class="file-label">
          <span class="iconify" data-icon="mdi:upload"></span> Or upload custom image
        </label>
      </div>
      <div v-if="modelValue.image" class="mt-2 text-sm text-center" style="color: var(--text-muted);">
        Custom image loaded. <a href="#" @click.prevent="clearImage" class="danger-text">Remove</a>
      </div>
    </div>
    
    <div class="control-row mt-2">
      <label class="checkbox-label" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; display: block;">
        <input type="checkbox" v-model="useCustomIcon" /> Override Global Icon Style
      </label>
    </div>

    <div class="control-row mt-2" v-if="useCustomIcon">
      <div class="control-group half">
        <label>Icon Size (px)</label>
        <input type="number" v-model.number="modelValue.iconSize" min="10" max="64" />
      </div>
      <div class="control-group half">
        <label>Icon Color</label>
        <input type="color" v-model="modelValue.iconColor" class="color-picker" />
      </div>
    </div>
    
    <div class="divider"></div>

    <div class="control-group">
      <label>Print Settings</label>
      <div class="light-override">
        <label class="checkbox-label">
          <input type="checkbox" v-model="modelValue.print" /> Include this label when printing
        </label>
      </div>
    </div>
    
    <div class="divider"></div>

    <div class="control-group">
      <label>LED Backlight Override</label>
      <div class="light-override">
        <label class="checkbox-label">
          <input type="checkbox" v-model="useCustomLight" /> Custom LED for this key
        </label>
        
        <div class="control-row mt-2" v-if="useCustomLight">
          <div class="control-group half">
            <label>Brightness</label>
            <input type="range" v-model.number="modelValue.lightBrightness" min="0" max="100" />
          </div>
          <div class="control-group half">
            <label>Color</label>
            <input type="color" v-model="modelValue.lightColor" class="color-picker" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const useCustomText = computed({
  get: () => props.modelValue.textSize !== null && props.modelValue.textSize !== undefined,
  set: (val) => {
    const updated = { ...props.modelValue }
    if (val) {
      updated.textSize = 10
      updated.textColor = '#000000'
    } else {
      updated.textSize = null
      updated.textColor = null
    }
    emit('update:modelValue', updated)
  }
})

const useCustomIcon = computed({
  get: () => props.modelValue.iconSize !== null && props.modelValue.iconSize !== undefined,
  set: (val) => {
    const updated = { ...props.modelValue }
    if (val) {
      updated.iconSize = 24
      updated.iconColor = '#000000'
    } else {
      updated.iconSize = null
      updated.iconColor = null
    }
    emit('update:modelValue', updated)
  }
})

const useCustomLight = computed({
  get: () => props.modelValue.lightColor !== null && props.modelValue.lightColor !== undefined,
  set: (val) => {
    const updated = { ...props.modelValue }
    if (val) {
      updated.lightColor = '#10b981'
      updated.lightBrightness = 80
    } else {
      updated.lightColor = null
      updated.lightBrightness = null
    }
    emit('update:modelValue', updated)
  }
})

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

.text-input-area {
  resize: vertical;
  min-height: 40px;
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
  background: rgba(16, 185, 129, 0.1);
}
</style>
