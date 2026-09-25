# image2char

A polished, local-first image-to-character workbench. Upload an image, add context, choose a genre and tone, then export a fictional character profile as JSON or a Perchance-ready JavaScript object.

## Run locally

```bash
npm install
npm run dev
```

Then open the Vite URL shown in the terminal. Production builds use `npm run build`.

## Perchance import

Click **Perchance** after generating a profile. Paste the copied JavaScript into a Perchance generator's JavaScript section, then reference values such as `{{character.name}}`, `{{character.personality}}`, and `{{character.backstory}}` in the generator output. The app also has an **Export** button for JSON if your generator uses imported data.

## Privacy and content boundaries

Images are previewed locally and are not uploaded by this static app. Profiles are stored in browser local storage. The mature toggle is intended for adult, non-graphic fictional themes only; it does not enable explicit sexual content, sexualized minors, non-consensual sexual content, or sexualized real-person profiles. The current browser-only generator uses image metadata and user-provided notes rather than claiming to infer private facts or identity from pixels.

To add a vision model later, use a server-side provider adapter rather than exposing an API key in the browser. Keep uploaded images private, validate file size/type on the server, and preserve the same content safeguards.
