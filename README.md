# image2char

Image-only vision-to-story generator. Upload an image with no caption or context and the configured vision model creates a fictional character profile, backstory, personality, motivations, visual-cue summary, and/or narrative scene.

## Setup

1. Install Node.js 18+.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and add an API key.
4. Start the API: `npm run api`
5. In another terminal start Vite: `npm run dev`
6. Open the displayed Vite URL.

For production, run `npm run build` followed by `npm start`.

## Configuration

`.env.example`:

```env
OPENAI_API_KEY=your_key_here
VISION_MODEL=gpt-4o-mini
PORT=8787
```

The server sends the image to the configured OpenAI-compatible vision endpoint and keeps the API key off the browser. Change the endpoint/model adapter in `server.mjs` if you use another provider.

## Perchance

Generate a result and click **Perchance**. Paste the copied JavaScript into a Perchance JavaScript section. The exported object provides `character.title`, `character.appearance`, `character.personality`, `character.backstory`, `character.motivations`, and `character.narrative`.

## Safety and accuracy

Backstories and personalities are creative fabrications, not claims about the pictured person. The app avoids identity recognition and unsupported sensitive inferences. It does not provide explicit sexual content, sexualized minors, non-consensual sexual content, or sexualized real-person profiles. Use fictional or consented source material, and avoid uploading private images without permission.
