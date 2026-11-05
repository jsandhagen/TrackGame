# City and facility pixel art

The club map is drawn procedurally at its logical resolution and scaled up with smoothing off. This document records the visual rules for its buildings, plots and streets. It follows the project's *Pixel Art Buildings and Towns* design reference, whose priorities run: silhouette, roof construction, windows and entrances, materials, decoration, lighting, vegetation, imperfections and ambient animation.

## Visual rules

| Rule | Value |
| --- | --- |
| Projection | Oblique: depth runs up and to the right (`DX` 0.4, `DY` 0.5 per unit of depth) |
| Light | Upper left; cast shadows fall down and to the right |
| Ramps | `tone(c, f)` in `pixel.js`: shadows cool toward blue-violet, highlights warm toward cream |
| Outlines | `selOut(c)`: a dark from the neighbouring colour. Darkest on the shadow side, soft on the lit left, never flat black |
| Shadows | One cool translucent cast-shadow colour (`CAST`), contact lines at every wall foot, eave shadows under every overhang |
| Texture | Connected clusters that follow construction. No random single pixels |

## The architecture kit (`src/render/architecture.js`)

- **Roof forms:** gable, hip, flat with a parapet, north-light sawtooth and curved metal barrel.
- **Roof materials:**
  - clay tile: scalloped rows with rhythmic highlights
  - slate: cool, restrained bands
  - wood shingle: offset rows with worn patches
  - metal: standing seams
  - membrane with ballast, on flat roofs
- **Roof details:** a ridge cap, a fascia and the shadow the eave throws on the wall.
- **Walls:**
  - brick: staggered courses
  - stone: irregular blocks of varied size, with the odd crack
  - plaster: smooth, with a few hairline cracks and a weathered foot
  - timber: vertical boards with knots
  - clapboard: lapped boards, each casting a line of shadow
  - metal: ribs and rivets
  - glass: a curtain wall with a dark interior, mullions and clustered reflections
- **Windows:** sash, shuttered, tall arched, small high industrial lights and shop displays with goods.
  - Every window has a frame, a recessed head, reflections, a sill and a sill shadow.
  - Only some windows are lit. A lit window glows warm with curtains, and flower boxes are optional.
- **Doors and steps:** panelled timber, glazed doubles and roller doors.
- **Storytelling props:** crates, barrels, a woodpile, washing on a line, bikes, an A-board, a noticeboard, lumber, a merch rail, kettlebells, chairs, a watering can, gas cylinders, a dish, an antenna, vines, flowerbeds, chimneys and smoke.

## Building families (`src/render/facility-scene.js`)

Each type belongs to a family, so it reads before its sign does.

| Family | Types | Vocabulary | Ground |
| --- | --- | --- | --- |
| Civic | Clubhouse, library | Symmetry, portico with steps and columns, tall arched windows, stone plaque | Formal kerbed forecourt |
| Commercial | Café, kit shop | Awnings, display windows, menu board, terrace, crates | Paving and terrace |
| Industrial | Strength room, kit works, throws hall, testing | Sawtooth, shingle, barrel or metal roofs; roller doors; high windows; yard materials | Gravel yard |
| Science | Lab, institute | Plaster or curtain glass, flat roofs with vents, skylights and dishes | Paving with a lawn edge |
| Home | Dorms, scout office, lodge, spa | Porches, shutters, hoods, chimneys, gardens, washing | Path and doorstep only |

No two types share a silhouette and material. Nameboards take the family's form and upgrade from plain, to framed, to club colours. Planting differs per type instead of the same two bushes on every plot.

### Upgrades change the building

| Type | Level 2 | Level 3 |
| --- | --- | --- |
| Clubhouse | Hipped side wing | Clock in the gable, second wing, double portico, flowerbeds |
| Library | Side wing, more ivy | Reading garden, tree |
| Café | Second terrace table | Pergola with twinkling string lights |
| Kit shop | Merch rail in club colours | Rooftop sign |
| Strength room | Equipment shed, rubber mats | Pull-up rig, antenna |
| Kit works | Lean-to, lumber | Second smoking chimney, workbench |
| Throws hall | More roof lights | Club banners, more roof lights |
| Testing centre | Annex, dish | Red-and-white launch-measuring rig |
| Lab | Annex, gas cylinders | Observatory dome |
| Institute | Tower wing, second bike | Satellite dish, more skylights |
| Dorms | Dormers, second bike | Extra height, porch chair |
| Scout office | Radio antenna, watering can | Lookout tower |
| Coaching lodge | Porch chairs | Tree by the woodpile |
| Spa | Towels on the line | Glass pool pavilion |

Every level-3 building also gets a lamp at its gate.

### Ambient animation

Movement is spread unevenly:

- Always moving: flags and the fountain.
- Some of the time: smoke and pool steam.
- Now and then: washing in a gust.
- Occasional twinkles: string lights and an antenna beacon.

Baked background scenery draws no smoke rather than a frozen puff.

## Houses (`src/render/neighbourhood.js`)

The residential lots use nine designs, so neighbours never repeat:

- a cottage
- a clapboard two-storey
- the bakery
- a hipped bungalow with a porch
- a brick house with a hipped roof
- a timber house with a porch
- a plaster villa
- a brick house with garage
- a clapboard bungalow

Each design has its own lived-in details: washing, a woodpile, a porch chair, bikes, a rain barrel, a watering can, smoking chimneys or flower boxes.

## Streets and plots

- **Roads:** clustered cracks and patches instead of speckle, and a shadow strip along the north kerb.
- **Plots:** a clipped hedge closes the back of each plot, and its edges are lit on the left and shaded on the right.

## Reviewing

Run `npm run dev` and open `/scripts/city-study.html`. It renders the whole production map with every plot built at a chosen level, in any season and with two plot layouts. Open it on a high-density screen or zoom the browser to see individual pixels.

`tests/city-art.test.js` checks:

- that the ramps shift hue
- that every facility paints more at each level
- that no two types share a silhouette and material
- that most types grow a wing, tower or pavilion

`tests/neighbourhood.test.js` checks that every wing fits its parcel.

## Sources

- The project's *Pixel Art Buildings and Towns: Design Reference*.
- [SLYNYRD Pixelblog 14: Cityscapes](https://www.slynyrd.com/blog/2019/2/23/pixelblog-14-cityscapes) and [Pixelblog 6: Light and Shadow](https://www.slynyrd.com/blog/2018/6/15/pixelblog-6-light-and-shadow).
- [Pedro Medeiros' tutorials on Lospec](https://lospec.com/pixel-art-tutorials/author/pedro-medeiros) and [Lospec, Pixel art outlines part 2: using color](https://lospec.com/articles/pixel-art-outlines-part-2-using-color).
- [Pixnote, Shading & Lighting](https://pixnote.net/en/learn/shading) and [Pixel Joint, A Wee Tutorial](https://pixeljoint.com/projects/wee/tutorial.asp).
