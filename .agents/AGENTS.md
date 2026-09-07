# LocalDeck Label Studio

## Goal
A local, web-based tool for designing and printing LocalDeck keycap labels. The tool enables users to create a grid of custom labels using text, Material Design Icons, and local image uploads. When printed, it outputs a clean grid of labels perfectly sized for Cherry MX relegendable keycaps (typically ~14x14mm), complete with cut lines, without any browser UI or margins.

## Tech Stack
- **Frontend Framework:** Vue.js 3
- **Build Tool:** Vite
- **Language:** JavaScript / HTML / CSS
- **Styling:** Vanilla CSS (with `@media print` for print optimization)
- **Icons:** Iconify (for Material Design Icons)
- **Hosting:** GitHub Pages (fully client-side, no backend)

## Project Structure
- `index.html`: Main entry point.
- `src/App.vue`: Main application wrapper. Includes the Header, Sidebar (LabelEditor), DeckWorkspace, and PrintWorkspace.
- `src/composables/useStore.js`: Core reactive state management, legacy `localStorage` migrations, and label data models.
- `src/components/DeckWorkspace.vue`: The 3D/Interactive macro-pad layout preview and Deck Manager.
- `src/components/PrintWorkspace.vue`: The printable layout view where users drag labels onto a virtual sheet of paper.
- `src/components/LabelEditor.vue`: UI component for editing the properties of a single label (text, icon, overrides).
- `src/components/LabelPreview.vue`: Pure UI component for rendering the label itself across the library, workspace, and print grids.

## Strict Project Guidelines (AI Instructions)

### 1. UI Component Library
NEVER use native HTML form elements for complex inputs. We have custom Vue 3 components designed specifically to fit the application's dark-mode/glassmorphism aesthetic.
Always import and utilize these instead:

- **Dropdowns / Selects:** Use `<CustomSelect v-model="..." :options="[{value: '...', label: '...'}]" />`. Do NOT use native `<select>`.
- **Checkboxes / Booleans:** Use `<CustomCheckbox v-model="...">Text Label</CustomCheckbox>`. Do NOT use native `<input type="checkbox">`.
- **Colors:** Use `<ColorPicker v-model="..." />`. Do NOT use native `<input type="color">`.
- **Numeric Inputs (with Up/Down Steppers):** Use `<NumberStepper v-model="..." :min="0" :max="100" />`.
- **Icons:** Use the official `@iconify/vue` component: `<Icon icon="mdi:name" />`. Do NOT use the legacy vanilla `<span class="iconify">` tags, as they mutate the VDOM and cause silent Vue crash loops.

### 2. Global State Management
The application's core reactive state is centralized in `src/composables/useStore.js`.
- Always pull reactive state by destructuring the store hook: `const { activeDeckId, labels, etc } = useStore()`.
- Do not build complex local reactive state in components if it needs to be accessed globally (like printing layouts or deck configurations).

### 3. Multiple Decks Architecture
- Labels no longer contain hardcoded `deckSlot` coordinates.
- Spatial layout is handled exclusively by the `decks` array in `useStore.js`, where each deck has a `slots: { [slotIndex]: labelId }` map.
