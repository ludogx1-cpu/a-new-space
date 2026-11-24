// Animated GIF with 1-bit transparency.
import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;

/** frames: equally sized RGBA frames. Returns a Buffer. */
export function encodeGif(frames, fps) {
    const gif = GIFEncoder();
    // GIF stores delays in hundredths of a second; round once so the speed stays even.
    const delay = Math.max(2, Math.round(100 / fps)) * 10;
    for (const f of frames) {
        // GIF alpha is all-or-nothing: snap soft edges at 50% so they don't pick up a halo.
        const d = new Uint8Array(f.data);
        let hasClear = false;
        for (let i = 3; i < d.length; i += 4) {
            if (d[i] < 128) { d[i] = 0; d[i - 1] = d[i - 2] = d[i - 3] = 0; hasClear = true; } else d[i] = 255;
        }
        const palette = quantize(d, 256, { format: 'rgba4444', oneBitAlpha: true, clearAlpha: true, clearAlphaThreshold: 0 });
        const index = applyPalette(d, palette, 'rgba4444');
        const ti = palette.findIndex(p => p[3] === 0);
        gif.writeFrame(index, f.width, f.height, {
            palette: palette.map(p => [p[0], p[1], p[2]]),
            delay,
            repeat: 0,
            transparent: hasClear && ti >= 0,
            transparentIndex: ti >= 0 ? ti : 0,
            dispose: 2 // clear each frame, so earlier frames don't show through transparent areas
        });
    }
    gif.finish();
    return Buffer.from(gif.bytes());
}
