# image2char

A no-API-key, browser-only image-to-story generator. Upload one image and it creates a fictional character profile, personality, backstory, motivations, visual-cue summary, and/or narrative scene.

## Use it on an 8 GB Android phone

1. Install Node.js on a computer, or use any static hosting service.
2. Run `npm install`, then `npm run build`.
3. Publish the generated `dist` folder to a static host (GitHub Pages, Netlify, Cloudflare Pages, or similar).
4. Open the site in Chrome on Android.
5. The first generation downloads the small SmolVLM browser model and caches it. Keep Chrome open and use an image under about 4 MB. Later runs reuse the cache.

For local desktop testing, run `npm run dev` and open the displayed URL. No `.env` file, server, or API key is needed.

## Perchance

After generation, click **Perchance** and paste the copied JavaScript into a Perchance JavaScript section. The exported object contains `character.name`, `character.appearance`, `character.personality`, `character.backstory`, `character.motivations`, and `character.narrative`.

## Device notes

The app prefers WebGPU and falls back to WebAssembly. Chrome/Android with hardware acceleration is recommended. An 8 GB phone should have enough memory, but the model download and generation can be slow. If Android kills the tab, close other tabs, reduce the image size, and retry. Browser storage is used for the model cache and generated profile history.

Images are processed in the browser and are not sent to a server by this app. The model reports visible cues separately from fictional inventions and does not identify people or infer private sensitive traits.
