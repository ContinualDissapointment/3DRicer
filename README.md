# 3DRicer

A single-page Three.js app for placing custom image decals on a 3D PS5 DualSense controller model. No build step required — just open in a browser.

## Setup

1. Clone the repo
2. Download a DualSense controller model in glTF format (e.g. from [Sketchfab](https://sketchfab.com/tags/dualsense)) and place it in a `models/` directory
3. Update the `modelPath` variable in `app.js` to point to your `.gltf` file
4. Serve locally:
   ```
   python3 -m http.server
   ```
5. Open `http://localhost:8000`

## Controls

| Action | Input |
|--------|-------|
| Rotate view | Left-click drag |
| Zoom | Scroll wheel |
| Pan | Right-click drag |
| Import image | Drag & drop, Ctrl+V, or double-click |
| Place decal | Click on controller (after importing) |
| Select decal | Click on it |
| Move decal | Drag selected decal |
| Resize decal | Ctrl + Scroll |
| Rotate decal | R / E (opposite direction) |
| Flip decal | H (horizontal) / V (vertical) |
| Delete decal | Delete / Backspace |

## Features

- GLTF model loading with OrbitControls
- Image import via drag-and-drop, clipboard paste, or file browser
- Crop UI with draggable selection before applying
- Decal projection onto 3D surface using Three.js DecalGeometry
- Multiple decals with move, resize, rotate, flip, and delete
- Preserves image aspect ratio
- Toggleable lighting
- Dark theme UI

## Tech

Vanilla JS + [Three.js](https://threejs.org/) loaded from CDN. No dependencies, no build step.
