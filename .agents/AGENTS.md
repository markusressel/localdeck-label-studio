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
- `src/App.vue`: Main application logic, state management (saving labels to `localStorage`), and layout.
- `src/components/LabelEditor.vue`: UI component for editing the properties of a single label (text, icon, image, dimensions).
- `src/components/LabelPreview.vue`: UI component for rendering the label itself, both in the editor and on the print grid.
- `src/assets/print.css`: Essential CSS that executes during printing to hide UI elements and remove margins.
