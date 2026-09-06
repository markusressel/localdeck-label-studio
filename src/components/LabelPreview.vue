<template>
  <div class="scale-wrapper" :style="wrapperStyle" ref="previewRef">
    <div 
      class="keycap-outer" 
      :style="innerStyle" 
      :class="[
        'material-' + material,
        'effect-' + effectiveLightEffect,
        { 'is-print-mode': printMode, 'is-dark-room': darkRoom && !printMode }
      ]"
    >
      <!-- Physical Keycap Layers (Hidden in print mode) -->
      <template v-if="!printMode">
        <div class="keycap-led-glow"></div>
        <div class="plastic-cap"></div>
      </template>

      <!-- The Label Insert -->
      <div class="label-insert">
        <div class="material-layer" v-if="!printMode"></div>
        <div class="diffused-led-glow" v-if="!printMode"></div>
        
        <div class="label-content">
          <div v-if="label.image" class="label-image-container">
            <img :src="label.image" alt="Custom icon" class="custom-image" />
          </div>
          <div v-else-if="label.icon" class="label-icon-container" :key="label.icon">
            <span 
              class="iconify" 
              :data-icon="label.icon"
              :style="{ fontSize: effectiveIconSize + 'px', color: effectiveIconColor }"
            ></span>
          </div>
          <div 
            v-if="label.text" 
            class="label-text"
            :style="{ fontSize: effectiveTextSize + 'px', color: effectiveTextColor }"
            v-html="formattedLabelText"
          >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUpdated } from 'vue'

const props = defineProps({
  label: { type: Object, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  scale: { type: Number, default: 1 },
  material: { type: String, default: 'transparent' },
  globalLightColor: { type: String, default: '#10b981' },
  globalLightBrightness: { type: Number, default: 80 },
  globalLightEffect: { type: String, default: 'static' },
  globalTextSize: { type: Number, default: 10 },
  globalTextColor: { type: String, default: '#000000' },
  globalIconSize: { type: Number, default: 24 },
  globalIconColor: { type: String, default: '#000000' },
  printMode: { type: Boolean, default: false },
  darkRoom: { type: Boolean, default: false }
})

const effectiveLightColor = computed(() => {
  return props.label.lightColor !== null && props.label.lightColor !== undefined 
    ? props.label.lightColor : props.globalLightColor
})

const effectiveLightBrightness = computed(() => {
  const b = props.label.lightBrightness !== null && props.label.lightBrightness !== undefined
    ? props.label.lightBrightness : props.globalLightBrightness
  return b / 100 
})

const effectiveLightEffect = computed(() => {
  return props.label.lightEffect !== null && props.label.lightEffect !== undefined
    ? props.label.lightEffect : props.globalLightEffect
})

const effectiveTextSize = computed(() => props.label.textSize ?? props.globalTextSize)
const effectiveTextColor = computed(() => props.label.textColor ?? props.globalTextColor)
const effectiveIconSize = computed(() => props.label.iconSize ?? props.globalIconSize)
const effectiveIconColor = computed(() => props.label.iconColor ?? props.globalIconColor)

const formattedLabelText = computed(() => {
  if (!props.label.text) return ''
  let text = props.label.text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  return text.replace(/:([a-zA-Z0-9\-:]+):/g, '<span class="iconify" data-icon="$1"></span>')
})

const previewRef = ref(null)
const scanIcons = () => {
  if (window.Iconify && previewRef.value) {
    window.Iconify.scan(previewRef.value)
  }
}
onMounted(scanIcons)
onUpdated(scanIcons)

const wrapperStyle = computed(() => {
  if (props.printMode) {
    return {
      width: props.width + 'mm',
      height: props.height + 'mm'
    }
  }
  return {
    width: `calc((${props.width + 4}mm) * ${props.scale})`,
    height: `calc((${props.height + 4}mm) * ${props.scale})`
  }
})

const innerStyle = computed(() => {
  return {
    '--label-width': props.width + 'mm',
    '--label-height': props.height + 'mm',
    '--led-color': effectiveLightColor.value,
    '--led-brightness': effectiveLightBrightness.value,
    'transform': `scale(${props.scale})`,
    'transform-origin': 'top left'
  }
})
</script>

<style scoped>
.scale-wrapper {
  position: relative;
  transition: width 0.2s ease, height 0.2s ease;
}

.keycap-outer {
  position: absolute;
  top: 0; left: 0;
  width: calc(var(--label-width) + 4mm);
  height: calc(var(--label-height) + 4mm);
  padding: 2mm;
  background-color: #e2e2e4; 
  border-radius: 6px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden; 
  box-shadow: 0 6px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2);
  transition: transform 0.2s ease, background-color 0.3s ease, box-shadow 0.3s ease;
}

.keycap-outer.is-dark-room {
  background-color: #1a1a1c;
  box-shadow: 0 4px 15px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6);
}

.keycap-led-glow {
  position: absolute;
  bottom: -15%;
  left: 50%;
  transform: translateX(-50%);
  width: 150%;
  height: 120%;
  background: radial-gradient(circle at 50% 100%, #ffffff 0%, var(--led-color) 20%, transparent 75%);
  opacity: var(--led-brightness);
  pointer-events: none;
  z-index: 1;
  mix-blend-mode: screen;
}

.plastic-cap {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  border-radius: 5px;
  
  border-style: solid;
  border-width: 2mm;
  border-top-color: rgba(255, 255, 255, 0.5);   
  border-bottom-color: rgba(0, 0, 0, 0.4);      
  border-left-color: rgba(255, 255, 255, 0.15);   
  border-right-color: rgba(0, 0, 0, 0.15);
  
  background: linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 40%);
  background-clip: padding-box;
}

.plastic-cap::before {
  content: '';
  position: absolute;
  inset: -2mm;
  border-radius: 5px;
  border: 2mm solid transparent;
  border-bottom-color: var(--led-color);
  border-left-color: var(--led-color);
  border-right-color: var(--led-color);
  -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%);
  mask-image: linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%);
  opacity: calc(var(--led-brightness) * 1.2);
  mix-blend-mode: screen;
  filter: drop-shadow(0 0 4px var(--led-color));
}

.plastic-cap::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.3) inset, 0 1px 2px rgba(255,255,255,0.5) inset;
}

.label-insert {
  position: relative;
  width: var(--label-width);
  height: var(--label-height);
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 2px;
}

.material-layer {
  position: absolute;
  inset: 0;
  border-radius: 2px;
  z-index: 1;
  transition: background 0.3s, box-shadow 0.3s;
}

/* Light Room Materials */
.material-transparent .material-layer {
  background: transparent;
}
.material-thin-paper .material-layer {
  background: rgba(255, 255, 255, 0.85); 
  box-shadow: 0 1px 3px rgba(0,0,0,0.15); 
}
.material-thick-paper .material-layer {
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 1px 4px rgba(0,0,0,0.25);
}

/* Dark Room Materials - No ambient light, pitch black */
.keycap-outer.is-dark-room {
  background-color: #000000;
  box-shadow: 0 4px 15px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8);
}

.keycap-outer.is-dark-room.material-thin-paper .material-layer {
  background: #000000;
  box-shadow: none;
}
.keycap-outer.is-dark-room.material-thick-paper .material-layer {
  background: #000000;
  box-shadow: none;
}

/* Diffused LED glowing THROUGH the paper */
.diffused-led-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 90%, var(--led-color) 0%, transparent 85%);
  z-index: 1;
  pointer-events: none;
  transition: opacity 0.3s, filter 0.3s;
}

/* Transparent film doesn't diffuse, it just lets the base LED through */
.material-transparent .diffused-led-glow {
  opacity: 0;
}

.material-thin-paper .diffused-led-glow {
  opacity: calc(var(--led-brightness) * 0.9);
  filter: blur(5px);
}

.material-thick-paper .diffused-led-glow {
  opacity: calc(var(--led-brightness) * 0.65);
  filter: blur(10px);
}

.label-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 1mm;
  box-sizing: border-box;
  mix-blend-mode: multiply; 
}

.label-icon-container, .label-image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  min-height: 0;
}

.custom-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.label-text {
  text-align: center;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  overflow: hidden;
  width: 100%;
  line-height: 1.15;
}

/* Print Mode overrides - used both in CSS @media print AND on-screen previewMode */
.keycap-outer.is-print-mode {
  padding: 0 !important;
  width: var(--label-width) !important;
  height: var(--label-height) !important;
  background: transparent !important;
  box-shadow: none !important;
  border: 1px dashed #ccc !important;
  border-radius: 0 !important;
  transform: none !important; /* Printing doesn't use scale */
}

.keycap-outer.is-print-mode .label-insert {
  border-radius: 0 !important;
}

.keycap-outer.is-print-mode .label-content {
  mix-blend-mode: normal !important;
}

@media print {
  /* Failsafe to ensure normal UI elements are hidden */
  .no-print {
    display: none !important;
  }
}

/* RGB Light Effects */
@keyframes breathing-glow {
  0%, 100% { opacity: calc(var(--led-brightness) * 0.2); }
  50% { opacity: var(--led-brightness); }
}
@keyframes breathing-plastic {
  0%, 100% { opacity: calc(var(--led-brightness) * 1.2 * 0.2); }
  50% { opacity: calc(var(--led-brightness) * 1.2); }
}
@keyframes breathing-diffused-thin {
  0%, 100% { opacity: calc(var(--led-brightness) * 0.9 * 0.2); }
  50% { opacity: calc(var(--led-brightness) * 0.9); }
}
@keyframes breathing-diffused-thick {
  0%, 100% { opacity: calc(var(--led-brightness) * 0.65 * 0.2); }
  50% { opacity: calc(var(--led-brightness) * 0.65); }
}

.effect-breathing .keycap-led-glow {
  animation: breathing-glow 3s infinite ease-in-out;
}
.effect-breathing .plastic-cap::before {
  animation: breathing-plastic 3s infinite ease-in-out;
}
.effect-breathing.material-thin-paper .diffused-led-glow,
.effect-breathing .material-thin-paper .diffused-led-glow {
  animation: breathing-diffused-thin 3s infinite ease-in-out;
}
.effect-breathing.material-thick-paper .diffused-led-glow,
.effect-breathing .material-thick-paper .diffused-led-glow {
  animation: breathing-diffused-thick 3s infinite ease-in-out;
}

@keyframes rainbow-glow {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}
@keyframes rainbow-plastic {
  0% { filter: drop-shadow(0 0 4px var(--led-color)) hue-rotate(0deg); }
  100% { filter: drop-shadow(0 0 4px var(--led-color)) hue-rotate(360deg); }
}
@keyframes rainbow-diffused-thin {
  0% { filter: blur(5px) hue-rotate(0deg); }
  100% { filter: blur(5px) hue-rotate(360deg); }
}
@keyframes rainbow-diffused-thick {
  0% { filter: blur(10px) hue-rotate(0deg); }
  100% { filter: blur(10px) hue-rotate(360deg); }
}

.effect-rainbow .keycap-led-glow {
  animation: rainbow-glow 3s infinite linear;
}
.effect-rainbow .plastic-cap::before {
  animation: rainbow-plastic 3s infinite linear;
}
.effect-rainbow.material-thin-paper .diffused-led-glow,
.effect-rainbow .material-thin-paper .diffused-led-glow {
  animation: rainbow-diffused-thin 3s infinite linear;
}
.effect-rainbow.material-thick-paper .diffused-led-glow,
.effect-rainbow .material-thick-paper .diffused-led-glow {
  animation: rainbow-diffused-thick 3s infinite linear;
}
</style>

