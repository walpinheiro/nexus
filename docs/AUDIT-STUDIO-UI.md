# Studio stage and toolbar audit

## Changes

- Replaced the text-heavy toolbar with a Nova floating toolbar built from 32px icon controls, grouped by selection, zoom/arrangement, editing/preview, and export. Every icon button has an accessible name and hover/focus title.
- Anchored the toolbar to the stage's upper-left corner and constrained it to the available width; groups wrap cleanly on narrow stages instead of adding a horizontal-scroll strip over the preview.
- Fit the active frame into the stage on first display and when its viewport changes, reserving the measured toolbar height above the frame. This adjusts only in-memory view zoom/pan; frame and component data are untouched. User pan/zoom disables automatic refitting, while the Fit action restores it.
- Replaced custom raw stage border colors with semantic theme tokens and improved the frame header contrast.
- Reworked the Tap-through panel into a responsive summary, destination field, and scrollable transition choices with readable labels and token-based colors.
- Preserved select, pan, zoom, fit, organize, undo, redo, preview, prompt, share-link, PNG export, and JSON export actions. PNG export uses the native image constructor without shadowing it with the icon import.

## Validation

- `npm run build` passes after the toolbar, stage, and Tap-through changes.
- Root visual QA at a 1280px viewport confirmed the desktop frame remains visible and does not overlap the toolbar. At the narrow ~463px stage width it fits to approximately 430px wide; the reduced size is the available viewport constraint.
- The automatic viewport fit only changes the in-memory pan/zoom view and leaves Studio document/frame data untouched.
