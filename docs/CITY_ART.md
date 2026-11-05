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

The town follows the project's *Modern Pixel-Art Town Design* guide, tuned to feel **cosy** rather than traffic-engineered. The street grid and plot layout are unchanged, because walking routes and the parcel tests depend on them.

### What makes it cosy

- **Warm palette:**
  - softer, yellower meadow greens instead of a saturated golf-course green
  - warm dark tarmac and warm stone footpaths
  - a gentle warm grade over the daytime scene
- **Town-centre brick:** the forecourt, the walk down to Club Row, both sides of Club Row and the plot gateways onto it are laid in brick, with a few weathered bricks and moss in the joints.
  - The forecourt is edged front and back with a soldier course in darker clay and crossed by a course of bricks in the club's colour.
  - Every footpath that crosses a road does so at a zebra; `tests/town.test.js` checks this, so a pavement can never run across a carriageway.
- **Heritage lanterns:** dark green posts with warm glass heads replace the modern poles, and bunting in the club's colours sags between them along Club Row, lifting now and then in a breeze.
- **Flowers everywhere it makes sense:**
  - half-barrel tubs along Club Row
  - climbing roses scrambling along most picket fences, in rose, red or autumn colours
  - wildflowers under the woodland clumps
- **Texture and foliage:**
  - Grass is textured with two- and three-blade tufts and clover patches rather than single specks.
  - Raised brick planters brim with flowers.
  - Shrubs and flowers soften the foot of the stadium wall.
  - Every open plot has shrubs, and sometimes a small tree, tucked into its back corners.
  - The woods are denser at the edges of the map.
- **Trees in groups:**
  - clumps of two to four trees from one family, with shrubs at their feet
  - an avenue of trees on both verges of Club Avenue
  - columnar trees screening the practice field
  - street trees along the boulevard
- **The stadium walk:** the path from Club Row to the stadium gate is the town's ceremonial route.
  - A brick gateway with stone caps and lanterns stands on Club Row, its beam carrying the club's name (or STADIUM when the name is too long).
  - The walk is wider than any footpath, laid in brick between stone kerbs, with a runner of the club's colour down the middle.
  - Low flower borders line both sides, under poles flying banners in the club's colours.
  - The club crest is set into the forecourt where the walk meets the gate.
- **Village car parks:** rolled gravel with bays marked in stone setts, and a tree in each.

### Road hierarchy

| Rank | Roads | Treatment |
| --- | --- | --- |
| Main | Club Row, Stadium Boulevard, station approach | A faded cream dashed centre line; a marked loading bay with a delivery van on the boulevard |
| Secondary | Club Avenue, North Lane, eastern road | A fainter, shorter dash |
| Residential | Town Lane | No markings; cars parked along the kerb, clear of driveways and the crossing |

Every road has cobbled gutters along both kerbs, so the tarmac reads narrower and warmer. There are no traffic lights or stop signs: at each junction the lower-ranked arm gives way at a dashed line across its inbound lane (traffic keeps right), placed outside any zebra on that arm.

### Kerbs and crossings

- **Crossings:** every crossing ends in soft tactile paving at both kerbs. All crossings come from one list (`CROSSINGS`), so markings always agree.
- **Road surface details:**
  - manhole covers in the lanes, at a steady interval and kept clear of junctions and crossings
  - gully grates against the kerb
  - fallen leaves along the kerbs in autumn

### Parking

The car parks are laid out like real ones:

- a two-way gravel aisle from the entrance
- bays on both sides, marked in setts, with timber-toned wheel stops
- an accessible bay by the entrance
- a kerbed planting island with a tree in each park, plus a light in the larger one

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

- **Pocket park:** designed as a place rather than a lawn with objects on it.
  - A gravel path, drawn with a soft darker edge, loops round the pond and joins the gate on Club Row to the boulevard.
  - The pond is a natural shape built from three lobes: a stone bank, an earth lip on the near side, a deep edge, open water and clustered reflections. It has lily pads (two in flower), reed clumps with cattails at either end and a pair of ducks paddling slowly about. In autumn leaves float on it; in winter it freezes and the ducks leave.
  - The play corner sits on a soft patch of bark mulch, flattened by depth like the pond, with a darker trodden rim and grass creeping over its edge. It sits clear of the path and holds a painted swing frame; its A-frames splay along the map's depth, and the seat moves gently.
  - Shrubs and flowers line the fence in groups of different sizes with gaps, never one bush repeated in a row.
  - Four different trees frame the park without crowding the water.
  - A bench and bin overlook the pond, and a drinking fountain stands by the gate path. Brick piers and a name board mark the entrance.
- **Practice field:** an actual layout, with a throwing sector fanning from the circle and distance flags at three marks.

### Street furniture

Each piece stands where it would in a real town, and never in the carriageway:

- hydrants by the kerb along the main roads
- bins by the benches
- mailboxes on Town Lane and Club Row
- flower tubs between the lanterns on Club Row

At night the lanterns and the car-park light glow warm, and the rest of the night stays dark.

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
- that every junction has a give-way line on its minor arm, with no signals
- that no furniture stands in the carriageway
- that kerb parking stays in the residential lane, clear of driveways and the crossing

## Sources

- The project's *Pixel Art Buildings and Towns: Design Reference* and *Modern Pixel-Art Town Design* guide.
- [SLYNYRD Pixelblog 14: Cityscapes](https://www.slynyrd.com/blog/2019/2/23/pixelblog-14-cityscapes) and [Pixelblog 6: Light and Shadow](https://www.slynyrd.com/blog/2018/6/15/pixelblog-6-light-and-shadow).
- [Pedro Medeiros' tutorials on Lospec](https://lospec.com/pixel-art-tutorials/author/pedro-medeiros) and [Lospec, Pixel art outlines part 2: using color](https://lospec.com/articles/pixel-art-outlines-part-2-using-color).
- [Pixnote, Shading & Lighting](https://pixnote.net/en/learn/shading) and [Pixel Joint, A Wee Tutorial](https://pixeljoint.com/projects/wee/tutorial.asp).
