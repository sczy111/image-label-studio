# Image Label Studio

Image Label Studio is a small local web app for placing styled captions and a `DAY XX` badge onto screenshots. It runs entirely on your machine and exports PNG files directly from the browser.

## Run

On Windows, double-click:

```text
start_editor.bat
```

Or run the server manually:

```powershell
python .\server.py
```

Then open:

```text
http://127.0.0.1:8765
```

## Main Workflow

1. Open an image or drag an image file onto the canvas.
2. Add and select text layers from the left sidebar.
3. Drag captions directly on the preview.
4. Adjust text, auto-fit, badge avoidance, background alpha, and padding in the right inspector.
5. Export the final PNG.

The `Create demo` button provides a quick editable sample without requiring an image file.

The app automatically remembers the most recent editor settings in the browser, including light or dark mode, text layers, positions, colors, alpha values, padding, canvas size, and day-label styling. The day label also has a badge-wide scale control that resizes the text and background padding together. Image files are not stored, so reopen or drop the source image when returning to the app.

## Structure

- `index.html`: app layout and controls.
- `styles.css`: visual design.
- `app.js`: UI state, canvas rendering, drag interactions, image loading, and PNG export.
- `editor-core.js`: reusable layout and measurement helpers.
- `editor-storage.js`: browser-side settings persistence.
- `tests/test-core.mjs`: focused checks for layout math and padding behavior.
- `server.py`: tiny local static-file server.

## Test

With Node.js installed:

```powershell
node .\tests\test-core.mjs
```
