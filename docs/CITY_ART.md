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

### Facade layout

Details are placed from each facade's own geometry, never from fixed offsets:

- **Bands:** every facade has a sign band under the eave and an openings band below it. Wall heights leave room for both.
- **Symmetric buildings:** civic, science and home buildings put the door on the centre line, centre the nameboard over it and pair windows at equal distances either side. A second floor adds a window over the door.
- **Shops:** the door sits at one end under a full-width awning, with the display window beside it and the nameboard centred above.
- **Works buildings:** a roller door, a side door and a row of works windows run from the left, with the nameboard over the roller door.
- **Clearances:** a window is dropped only where its frame would touch the nameboard. Door lanterns, porch posts and ivy keep clear of windows.
- **Houses:** the same rule applies, so each front door lines up with its path and windows.

### Upgrades change the building

| Type | Level 2 | Level 3 |
| --- | --- | --- |
| Clubhouse | Hipped side wing; the flag moves beside the noticeboard | Clock turret astride the ridge over the door, double portico, flowerbeds |
| Library | Side wing, more ivy | Reading garden, tree |
| Café | Second terrace table | Pergola with twinkling string lights |
| Kit shop | Merch rail in club colours | A giant club shirt mounted on the roof |
| Strength room | Equipment shed, rubber mats | Plyo boxes in club colours |
| Kit works | Lean-to, lumber | Second smoking chimney, workbench |
| Throws hall | More roof lights | Club banners, more roof lights |
| Testing centre | Annex, dish | A speed gun on a tripod aimed down a row of cones |
| Lab | Annex, gas cylinders | Observatory dome |
| Institute | Tower wing, second bike | Satellite dish, more skylights |
| Dorms | Dormers, second bike | Extra height, porch chair |
| Scout office | Radio antenna, watering can | Lookout tower |
| Coaching lodge | Porch chairs | Tree by the woodpile |
| Spa | Sun loungers by the pool | A timber sauna hut with a stovepipe and steam |

### Ambient animation

Movement is spread unevenly:

- Always moving: flags and the fountain.
- Some of the time: smoke, pool steam and sauna steam.
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

## The town (`src/render/neighbourhood.js`, `src/render/world.js`)

This section follows the project's *Modern Pixel-Art Town Design* guide. The street grid and plot layout are unchanged, because walking routes and the parcel tests depend on them. Everything drawn on and around the streets follows the guide.

### Road hierarchy

| Rank | Roads | Markings and treatment |
| --- | --- | --- |
| Main | Club Row, Stadium Boulevard, station approach | Double yellow centre line; traffic lights where the approach and Club Avenue meet them; a marked loading bay with a delivery van |
| Secondary | Club Avenue, North Lane, eastern road | Dashed white centre line; stop lines and stop signs where they meet a main road |
| Residential | Town Lane | No centre line; cars parked along the kerb, clear of driveways and the crossing; stop lines and stop signs at both ends |

### Junctions and kerbs

- **Junction control varies:** the three busiest junctions have signals on two corners, cycling red, amber and green, plus a signal cabinet. Elsewhere the lower-ranked road stops and gives way.
- **Stop lines:** each stop line spans the inbound lane (traffic keeps right) and sits outside any zebra on that arm.
- **Crossings:** every crossing ends in tactile paving at both kerbs. All crossings come from one list (`CROSSINGS`), so markings and stop lines always agree.
- **Road surface details:**
  - manhole covers in the lanes, at a steady interval and kept clear of junctions and crossings
  - gully grates against the kerb
  - fallen leaves along the kerbs in autumn

### Parking

The car parks are laid out like real ones:

- a two-way aisle from the entrance, marked with arrows
- bays on both sides with wheel stops
- an accessible bay by the entrance
- in the larger park, a kerbed planting island with a tree and a light

Cars face the aisle and are a mix of sedans, hatchbacks, SUVs, pickups and vans (`src/render/vehicles.js`), in varied colours, with some bays empty.

### Trees and planting

`tree()` in `buildings.js` is now a family of silhouettes:

| Kind | Shape | Where it's used |
| --- | --- | --- |
| round | Everyday park tree | Groves, gardens |
| wide | Spreading canopy | Groves |
| column | Tall and narrow | Screens the practice field from North Lane |
| flower | Small ornamental that blossoms in spring | Groves |
| street | Young tree in a grated pit with guards | A steady row along the boulevard's south verge, with gaps at the side roads |

Canopies are built in layers:

1. a cool ground shadow
2. a dark underside mass
3. overlapping foliage clusters
4. highlights on the upper left

Autumn mixes three palettes. Deciduous trees go bare in winter, with snow on their limbs. Groves mix kinds and sizes instead of repeating one blob.

### Parks and the practice field

- **Pocket park:** a recognisable entrance (brick gate piers, a name board, flowers), plus a drinking fountain and a bin on the loop.
- **Practice field:** an actual layout, with a throwing sector fanning from the circle and distance flags at three marks.

### Street furniture

Each piece stands where it would in a real town, and never in the carriageway:

- hydrants by the kerb along the main roads
- bins by the benches
- mailboxes on Town Lane and Club Row
- signals and their cabinets at the signalised corners

At night the car-park light and the signals glow as well as the street lamps.

## Reviewing

Run `npm run dev` and open `/scripts/city-study.html`. It renders the whole production map with every plot built at a chosen level, in any season and with two plot layouts. Open it on a high-density screen or zoom the browser to see individual pixels.

`tests/city-art.test.js` checks:

- that the ramps shift hue
- that every facility paints more at each level
- that no two types share a silhouette and material
- that most types grow a wing, tower or pavilion

`tests/neighbourhood.test.js` checks that every wing fits its parcel.

`tests/town.test.js` checks:

- that every road has a rank
- that every junction has a stop line, with signals only on main roads
- that no furniture stands in the carriageway
- that kerb parking stays in the residential lane, clear of driveways and the crossing

## Sources

- The project's *Pixel Art Buildings and Towns: Design Reference* and *Modern Pixel-Art Town Design* guide.
- [SLYNYRD Pixelblog 14: Cityscapes](https://www.slynyrd.com/blog/2019/2/23/pixelblog-14-cityscapes) and [Pixelblog 6: Light and Shadow](https://www.slynyrd.com/blog/2018/6/15/pixelblog-6-light-and-shadow).
- [Pedro Medeiros' tutorials on Lospec](https://lospec.com/pixel-art-tutorials/author/pedro-medeiros) and [Lospec, Pixel art outlines part 2: using color](https://lospec.com/articles/pixel-art-outlines-part-2-using-color).
- [Pixnote, Shading & Lighting](https://pixnote.net/en/learn/shading) and [Pixel Joint, A Wee Tutorial](https://pixeljoint.com/projects/wee/tutorial.asp).
