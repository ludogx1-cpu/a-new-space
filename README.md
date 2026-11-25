# Golden Paw Animation Creation Tool

Free in-browser tool by [Golden Paw](https://goldenpaw.dog/): turn video clips into sprite sheets, animated GIFs, frame ZIPs and TexturePacker JSON atlases, with chroma-key background removal, and clean them up in the built-in Sprite Sheet Editor.

Lives at **https://goldenpaw.dog/studios/animation/** (built from `public/` by `scripts/build-subpath.py` and copied into the Golden Paw site, ludogx1-cpu/gp-vault `web/studios/animation/`). The old address animate.goldenpaw.dog redirects there.

Free with ads; **Pro** (£11.99 one-off, sold through Polar with licence keys) adds AI background removal, batch processing, saved presets and no ads.

**Going live? Follow [LAUNCH.md](LAUNCH.md).**

Preview locally:

```bash
cd public && python3 -m http.server 8000
```

## AI plugin (Claude and other MCP apps)

`mcp/` is the same tool as an MCP server, so AI assistants can run it on the user's computer. Install in Claude Code:

```
/plugin install golden-paw-animate --marketplace ludogx1-cpu/a-new-space
```

Details, Claude Desktop set-up and settings: [mcp/README.md](mcp/README.md). Install page: https://goldenpaw.dog/studios/animation/ai-plugin.html
