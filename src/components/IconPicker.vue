<template>
  <div class="icon-picker-container" ref="pickerRef">
    <div class="input-wrapper">
      <input 
        type="text" 
        v-model="searchQuery" 
        @focus="isOpen = true"
        placeholder="e.g. mdi:home or 🚀" 
        class="icon-search-input"
      />
      <div class="icon-preview-box" v-if="modelValue">
        <span v-if="isEmoji(modelValue)" class="emoji-preview">{{ modelValue }}</span>
        <span v-else class="iconify" :data-icon="modelValue"></span>
      </div>
    </div>

    <div class="picker-dropdown" v-if="isOpen">
      <div class="dropdown-header">
        <span class="tab" :class="{ active: activeTab === 'iconify' }" @click="activeTab = 'iconify'; searchIconify()">Icons</span>
        <span class="tab" :class="{ active: activeTab === 'emoji' }" @click="activeTab = 'emoji'">Emojis</span>
      </div>
      
      <div class="dropdown-content" v-if="activeTab === 'iconify'">
        <div v-if="isSearching" class="loading">Searching...</div>
        <div v-else-if="iconifyResults.length === 0" class="empty-state">
          Type to search icons (e.g. 'home', 'arrow', 'user')...
        </div>
        <div v-else class="icon-grid">
          <div 
            v-for="icon in iconifyResults" 
            :key="icon" 
            class="icon-cell" 
            :title="icon"
            @click="selectIcon(icon)"
          >
            <span class="iconify" :data-icon="icon"></span>
          </div>
        </div>
      </div>
      
      <div class="dropdown-content" v-if="activeTab === 'emoji'">
        <div class="icon-grid emoji-grid">
          <div 
            v-for="emoji in popularEmojis" 
            :key="emoji" 
            class="icon-cell emoji-cell" 
            @click="selectIcon(emoji)"
          >
            {{ emoji }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const pickerRef = ref(null)
const isOpen = ref(false)
const searchQuery = ref(props.modelValue)
const activeTab = ref('iconify')
const isSearching = ref(false)
const iconifyResults = ref([])

const popularEmojis = [
  '😀','😂','😊','😍','😎','😭','😡','🤔','👍','👎','👏','🙌','🤝','🔥','✨','🌟',
  '❤️','💔','💯','✅','❌','🛑','⚠️','🚀','🛸','🚗','🏠','💻','📱','⌨️','🖱️','🎧',
  '🎮','🎵','🍔','🍕','☕','🍺','🎉','🎁','📅','⏰','💡','🔋','⚙️','🔧','🔒','🔓'
]

// Simple check if string contains an emoji (non-ascii roughly)
const isEmoji = (str) => {
  return /[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}]/u.test(str)
}

watch(() => props.modelValue, (newVal) => {
  if (newVal !== searchQuery.value) {
    searchQuery.value = newVal
  }
})

let searchTimeout = null
watch(searchQuery, (newVal) => {
  // If user types, we emit it directly so they can manually type an icon
  emit('update:modelValue', newVal)
  
  if (activeTab.value === 'iconify') {
    clearTimeout(searchTimeout)
    if (newVal && newVal.length > 2 && !isEmoji(newVal)) {
      searchTimeout = setTimeout(() => {
        searchIconify(newVal)
      }, 500)
    } else if (!newVal) {
      iconifyResults.value = []
    }
  }
})

const searchIconify = async (query = searchQuery.value) => {
  if (!query || query.length < 3 || isEmoji(query)) return
  
  isSearching.value = true
  try {
    const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=100`)
    const data = await res.json()
    iconifyResults.value = data.icons || []
    
    // Force Iconify to render new results
    nextTick(() => {
      if (window.Iconify) window.Iconify.scan(pickerRef.value)
    })
  } catch (e) {
    console.error('Failed to search icons', e)
  } finally {
    isSearching.value = false
  }
}

const selectIcon = (iconStr) => {
  searchQuery.value = iconStr
  emit('update:modelValue', iconStr)
  isOpen.value = false
}

// Close on outside click
const handleClickOutside = (e) => {
  if (pickerRef.value && !pickerRef.value.contains(e.target)) {
    isOpen.value = false
  }
}
onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<style scoped>
.icon-picker-container {
  position: relative;
  width: 100%;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.icon-search-input {
  width: 100%;
  padding-right: 40px !important;
}

.icon-preview-box {
  position: absolute;
  right: 6px;
  width: 26px;
  height: 26px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.1rem;
  pointer-events: none;
}

.picker-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 250px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.dropdown-header {
  display: flex;
  border-bottom: 1px solid var(--card-border);
}

.tab {
  flex: 1;
  text-align: center;
  padding: 0.5rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
.tab:hover {
  background: rgba(255,255,255,0.05);
}
.tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.dropdown-content {
  padding: 0.75rem;
  max-height: 250px;
  overflow-y: auto;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
  gap: 4px;
}

.icon-cell {
  height: 36px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.1s;
}

.icon-cell:hover {
  background: rgba(16, 185, 129, 0.2);
  color: var(--primary);
}

.emoji-cell {
  font-size: 1.25rem;
}

.loading, .empty-state {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
  padding: 1rem 0;
}
</style>
