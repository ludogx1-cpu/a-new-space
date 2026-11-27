# Golden Paw Animate

Turn any video into game-ready animation, just by asking Claude. Golden Paw Animate is the [Golden Paw Animation Creation Tool](https://goldenpaw.dog/studios/animation/) as a Claude plugin. It makes sprite sheets with JSON atlases (for Phaser, PixiJS, Godot, Unity and other engines), transparent animated GIFs and single frames. It also removes green-screen backgrounds for free, and removes any background with AI if you have Pro.

Everything runs **on your own computer**. Your videos and images are never uploaded.

## Example prompts

1. "Turn `~/Videos/shiba-run.mp4` into a sprite sheet at 12 fps with a JSON atlas. It has a green screen, so remove it."
2. "Make a transparent GIF from `~/Desktop/jump.mov`, from 0.5 to 2 seconds, at half size."
3. "Cut `~/game/hero-sheet.png` into separate frames using `hero-sheet.json`."
4. "Make a GIF from my sprite sheet `walk.png`. It has 6 columns and 2 rows."
5. "(Pro) Remove the background from `~/Pictures/my-dog.jpg`."

## Tools

| Tool | What it does | Needs |
|---|---|---|
| `convert_video` | Turns a video or animated GIF into a sprite sheet PNG and a TexturePacker JSON atlas. It can also make a GIF and single frame PNGs. Options: trim, scale, columns, ping-pong loop and pixel-art mode. | Free |
| `make_gif` | Makes a transparent animated GIF from a video or a sprite sheet. | Free |
| `slice_spritesheet` | Cuts a sprite sheet into frame PNGs, using its atlas or a grid. | Free |
| `remove_background` | Removes the background from images with AI, with no green screen needed. | Pro |
| `activate_pro` | Turns Pro on with your licence key, shows whether Pro is on, or frees this computer's activation. | Free |

Free green-screen and solid-colour removal uses the `chroma_key` option. AI removal (`remove_background`, or `remove_background_ai` on a video) needs [Golden Paw Animation Pro](https://goldenpaw.dog/studios/animation/pro.html). It's one payment of £11.99, with no subscription. The same key works on the website, the desktop app and this plugin, on up to 3 devices.

The tools save new files on your computer. By default they go in a new folder next to your file, such as `shiba-run-sprites/`. Your original files are never changed or deleted.

## Requirements

You need [Node.js](https://nodejs.org/) 20 or newer. It works on Windows, macOS and Linux.

## Install in Claude Code

```
/plugin marketplace add ludogx1-cpu/a-new-space
/plugin install golden-paw-animate@golden-paw
```

## What the plugin runs, downloads and sends

- **Starting the server:** `start.js` runs the npm package [`golden-paw-animate-mcp`](https://www.npmjs.com/package/golden-paw-animate-mcp), pinned to an exact version, with `npx`. npx downloads it from the npm registry once. The download includes a bundled ffmpeg, the video tool behind it, and is about 30 MB. The source code is public in [`mcp/`](https://github.com/ludogx1-cpu/a-new-space/tree/main/mcp).
- **Your files:** Videos and images are read and processed on your computer only. They're never uploaded. The results are saved on your computer.
- **AI (Pro only, first use only):**
  - The AI engine ([`onnxruntime-web`](https://www.npmjs.com/package/onnxruntime-web), pinned) is installed from the npm registry.
  - The background-removal model (about 46 MB) is downloaded from `goldenpaw.dog`, and its SHA-256 checksum is checked.
  - Both are kept in `~/.golden-paw-animate`.
- **Licence check (Pro only):** Your licence key is checked with Polar, our payment provider (`api.polar.sh`). This happens when you activate it, and then about once a week. Polar receives:
  - the key
  - an activation ID
  - a label with your computer's name, so you can recognise the device later
- **Nothing else:** There are no analytics, tracking or ads.

## Privacy Policy

Golden Paw Animate doesn't collect, store or share your videos, images or prompts. Everything is processed on your computer. The only data sent anywhere is the Pro licence check described above, which goes to Polar. For Pro customers, Polar keeps your order email and your licence-key activations so it can run the licence. Read the full policy at https://goldenpaw.dog/studios/animation/privacy.html.

## Troubleshooting

- **"Could not start":**
  1. Install Node.js 20 or newer.
  2. Restart Claude.
  3. Run `npx --yes golden-paw-animate-mcp@1.0.1` in a terminal to see the full error.
- **"Can't find the video":** Give Claude the full path to the file.
- **Background left behind, or holes in the subject:**
  - Ask Claude to raise the `chroma_key` tolerance (background left behind) or lower it (holes).
  - For backdrops with shadows, ask Claude to use `match: colour_only`.
- **"This key is already active on the maximum number of devices":** Ask Claude to run `activate_pro` with `deactivate: true` on a computer you no longer use. Or contact us.
- **Settings:** Set these environment variables if you need them.
  - `GOLDEN_PAW_PRO_KEY`: your licence key.
  - `FFMPEG_PATH`: use your own ffmpeg instead of the bundled one.
  - `GOLDEN_PAW_HOME`: where the licence and AI files are kept.

## Support

Email goldenpaw.dogeadmin@gmail.com, or visit https://goldenpaw.dog/support/.

See [LICENSE](LICENSE) for the terms and third-party components. The plugin is free to use. Anything you make with it is yours.
