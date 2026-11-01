# Pixel icons

The interface and inventory use original, hand-placed 16×16 bitmaps in
`src/render/glyphs.js`. The 66 interface glyphs and 23 item glyphs share a grid,
palette, warm dark outline, and upper-left light direction. The interface star,
MVP star, and inventory star use the same five-point silhouette. A four-point
sparkle has its own distinct shape.

Run `npm run dev` and open `/scripts/icon-gallery.html` to review every glyph at
1×, 2×, and 4× on cream and dark green. The proof also includes the bitmap font's
small symbols. The gallery is a development tool, outside the production entry.

## Drawing rules

- Start with the silhouette. Distinguish five-point stars, sparkles, bolts, and
  snowflakes through shape before colour. Preserve the star's four notches.
- Fit the coloured art inside 14×14 pixels, centred in the 16×16 cell. Leave room
  for the one-pixel outline; avoid cropped points and handles.
- Place whole pixels and use deliberate stair steps. No fractional canvas
  paths, gradients, automatic smoothing, or downscaled vector art.
- Group highlights and shadows into readable clusters. Use a base, a highlight,
  and a shadow for each material; add only the secondary colours that identify it.
- Keep negative space around handles, arrowheads, and separate objects. Remove
  details that turn into noise at actual size.
- Display at whole multiples of 16 pixels. Interface glyphs use 16, 32, or 64;
  inventory glyphs use 16 or 32. Keep the canvas buffer and CSS sizes aligned.
- Keep accessible text on the containing control. Decorative glyphs are hidden
  from screen readers; star counts and specialist markers have named wrappers.

## Research applied

- [Derek Yu: Pixel Art Tutorial](https://www.derekyu.com/makegames/pixelart.html):
  controlled pixel steps, removal of stray pixels, and coherent clusters of
  light and shade informed the redraw.
- [Cure: The Pixel Art Tutorial, Pixel Joint](https://pixeljoint.com/forum/forum_posts.asp?TID=11299):
  deliberate pixel placement, limited palettes, cluster relationships, and
  avoiding noise guided the small silhouettes and restrained detail.
- [Unity Editor Design System: Iconography](https://unityeditordesignsystem.unity.com/fundamentals/iconography):
  a consistent 16-pixel artboard, internal padding, actual-size review, and whole
  scale steps informed the sizing and proof sheet.

These are technique references. The icon drawings are original to this project.
