import { isColorTransparent } from './colorUtils.js'

// null/undefined on a label means "inherit the global setting"
const inherit = (value, fallback) => (value === null || value === undefined ? fallback : value)

/**
 * Resolve the effective style of a label by applying its per-label overrides
 * on top of the global settings. Single source of truth for the label
 * preview and the label editor.
 *
 * @param {object} label
 * @param {object} globals - { textSize, textColor, iconSize, iconColor, iconFlatten,
 *                             backgroundColor, lightColor, lightBrightness, lightEffect }
 */
export function resolveLabelStyle(label, globals) {
  const lightEnabled = label.lightEnabled !== false
  const iconColor = inherit(label.iconColor, globals.iconColor)
  return {
    textSize: inherit(label.textSize, globals.textSize),
    textColor: inherit(label.textColor, globals.textColor),
    iconSize: inherit(label.iconSize, globals.iconSize),
    iconColor,
    // A transparent icon color can only be achieved by rendering the icon as a flat mask
    iconFlatten: isColorTransparent(iconColor) || !!inherit(label.iconFlatten, globals.iconFlatten),
    backgroundColor: inherit(label.backgroundColor, globals.backgroundColor),
    lightEnabled,
    lightEffect: lightEnabled ? inherit(label.lightEffect, globals.lightEffect) : 'static',
    lightColor: inherit(label.lightColor, globals.lightColor),
    // 0-100
    lightBrightness: lightEnabled ? inherit(label.lightBrightness, globals.lightBrightness) : 0
  }
}
