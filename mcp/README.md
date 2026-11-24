# Golden Paw Animation Creation Tool: AI plugin

Use the [Golden Paw Animation Creation Tool](https://goldenpaw.dog/studios/animation/) from Claude and other AI assistants that support the Model Context Protocol (MCP).

Ask in plain English, for example:

> Turn `~/Videos/shiba-run.mp4` into a sprite sheet at 12 fps, remove the green screen, and make a GIF too.

Everything runs **on your own computer**. Your videos are never uploaded.

## What it can do

| Tool | What it does |
|---|---|
| `convert_video` | Video (or animated GIF) → sprite sheet PNG + TexturePacker JSON atlas (Phaser, PixiJS, Godot, Unity importers…), optional animated GIF and frame PNGs. Trim, scale, columns, ping-pong loops, pixel-art mode. |
| `make_gif` | Transparent animated GIF from a video or an existing sprite sheet. |
| `slice_spritesheet` | Cut a sprite sheet into frame PNGs, using its JSON atlas or a grid. |
| `remove_background` | **Pro:** AI background removal for images, with no green screen needed. |
| `activate_pro` | Unlock Pro with your licence key, check status, or free this computer's activation. |

Green-screen / solid-colour background removal is free (`chroma_key`). AI background removal (`remove_background`, or `remove_background_ai` on videos) needs [Golden Paw Animation Pro](https://goldenpaw.dog/studios/animation/pro.html): one payment of £11.99 unlocks it on the website, the desktop app and this plugin. The first AI use downloads the AI engine and model (about 70 MB, once).

## Install

You need [Node.js](https://nodejs.org/) 20 or newer.

**Claude Code**

```
/plugin marketplace add ludogx1-cpu/a-new-space
/plugin install golden-paw-animate@golden-paw
```

Or, on Claude Code 2.1.275 or later, in one step:

```
/plugin install golden-paw-animate --marketplace ludogx1-cpu/a-new-space
```

**Claude Desktop and other MCP apps**

Add this to the app's MCP settings (in Claude Desktop: Settings → Developer → Edit Config, `claude_desktop_config.json`), then restart the app:

```json
{
  "mcpServers": {
    "golden-paw-animate": {
      "command": "npx",
      "args": ["-y", "golden-paw-animate-mcp"]
    }
  }
}
```

## Settings (optional environment variables)

- `GOLDEN_PAW_PRO_KEY`: your Pro licence key, activated automatically on first Pro use.
- `FFMPEG_PATH`: use your own ffmpeg instead of the bundled one.
- `GOLDEN_PAW_HOME`: where the licence, AI engine and model are kept (default `~/.golden-paw-animate`).

## Help

Questions or problems: goldenpaw.dogeadmin@gmail.com, or see https://goldenpaw.dog/support/.

See [LICENSE](LICENSE) for terms and third-party components.
