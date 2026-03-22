# Model Icons

Drop your custom model icon files into this folder.

Current catalog keys are configured in `src/lib/modelIcons.tsx`.
Each key maps to `/model-icons/<file>`, for example:

- `openai` -> `/model-icons/gpt-logo.webp`
- `anthropic` -> `/model-icons/claude-logo.png`
- `google` -> `/model-icons/gemini-logo.png`
- `qwen` -> `/model-icons/qwen.jpeg`
- `kimi` -> `/model-icons/kimi.png`
- `minimax` -> `/model-icons/xiaomi.png`

To add a new icon option:

1. Add your image file here.
2. Add a new entry in `MODEL_ICON_DEFINITIONS` in `src/lib/modelIcons.tsx`.
3. Reload the app.

Supported image formats include SVG, PNG, and WEBP.
