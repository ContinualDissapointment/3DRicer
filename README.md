# 3DRicer

A single-page Three.js app for placing custom image decals on a 3D PS5 DualSense controller model. No build step required — just open in a browser.

<img width="1699" height="955" alt="{10309AA3-9C97-4D28-82B2-86146E0049C1}" src="https://github.com/user-attachments/assets/ab1f098b-6192-46a9-a314-9ee6b3045a62" />


## Setup

1. Clone the repo
2. Download a DualSense controller model in glTF format (e.g. from [Sketchfab](https://sketchfab.com/tags/dualsense)) and place it in a `models/` directory (I personally reccomend and test using Jayakrishnan Marath's (https://sketchfab.com/jayhystic22) model, using 3dripper or improper models will result in different sectioning and potential mesh issues.
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
| Move selected decal up in layer order | Keyboard up|
| Move selected decal down in layer order | Keyboard down |


## Features

- GLTF model loading with OrbitControls
- Image import via drag-and-drop, clipboard paste, or file browser
- Crop UI with draggable selection before applying
- Decal projection onto 3D surface using Three.js DecalGeometry
- Multiple decals with move, resize, rotate, flip, and delete
- Preserves image aspect ratio
- Toggleable lighting
- Dark theme UI
- Layer order and visibility panel
- Modify the color of each section of the controllers model imported
- Transparency support

## Tech

Vanilla JS + [Three.js](https://threejs.org/) loaded from CDN. No dependencies, no build step.
