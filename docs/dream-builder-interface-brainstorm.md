# Dream Builder — Interface Brainstorm
## "Make every person feel like an architect who suddenly has all the skills"

**Date:** March 29, 2026
**Context:** The current Browse & Discover has misaligned photos and lacks wow factor. We need growth-edge, innovative interfaces that make people feel like they have superpowers. Multiple interface modes for different kinds of dreamers.

---

## THE CORE INSIGHT

The orchid orrery works because it takes something complex (taxonomy) and makes it *spatial, navigable, and beautiful*. The equivalent for construction isn't a grid of photos — it's making the act of *imagining a building* feel like a superpower. Every interface below should pass this test: **"Does this make a homeowner feel like they just became an architect?"**

---

## CATEGORY A: SPATIAL / IMMERSIVE INTERFACES

### 1. The Worldwalker (World Labs Marble Integration)
**Wow factor: 🔥🔥🔥🔥🔥**

Take any image — a photo of a house you admire, an AI render, even a napkin sketch — and Marble's World API generates a full navigable 3D world you can walk through in your browser. You're *inside your dream* in 30 seconds.

- User uploads a photo or describes a scene → World Labs API → Gaussian splat → Three.js/SparkJS renders it in-browser
- Walk through rooms, look out windows, feel the space
- Edit by voice: "Make the ceiling higher" / "Add a fireplace here" / "Change this wall to exposed brick"
- Export as VR experience for Apple Vision Pro / Quest
- **Tech:** World Labs API ($20-95/mo), SparkJS (their open-source Three.js integration), already compatible with our stack
- **Why it's special:** Nobody in contech is doing this. You go from "I want a Spanish villa" to *standing inside one* in under a minute.

### 2. The Architect's Table (Spatial Design Canvas)
**Wow factor: 🔥🔥🔥🔥**

A giant infinite canvas (like Figma/Miro) but for building design. Drag in photos, sketches, materials, floor plans — and the AI connects them into a coherent design vision. Think of it as a mood board that *becomes the building*.

- Infinite zoom: city scale → neighborhood → house → room → material detail
- Drag a photo of a kitchen you love onto the canvas → AI extracts the style DNA (color palette, materials, proportions, lighting)
- Connect multiple inspirations → AI synthesizes them into a unified concept
- Click any point on the canvas → AI generates what that room/space looks like
- **Tech:** React Flow or tldraw for canvas, Claude Vision for image analysis, FLUX for renders
- **Reference:** Fenestra (already integrating Marble for exactly this workflow)

### 3. The Time Machine (4D Construction Visualization)
**Wow factor: 🔥🔥🔥🔥**

See your dream building rise from bare ground through every construction phase. A timeline scrubber lets you watch the building get built — foundation, framing, envelope, interior, landscaping — in photorealistic 3D.

- Scrub forward: watch the foundation pour, walls rise, roof go on, interior finish
- Scrub backward: understand what's behind the walls (structure, plumbing, electrical)
- Pause at any phase → get cost breakdown, timeline, code requirements
- **Tech:** Procedural Three.js generation (already have BuildingDesigner), AI-generated textures per phase
- **Why it's special:** Demystifies construction. Shows the journey, not just the destination. Gamified progress tracking built in.

### 4. The Holodeck (WebXR Walk-Through)
**Wow factor: 🔥🔥🔥🔥🔥**

Full VR/AR building exploration. Generate a dream → put on a headset → walk through it at 1:1 scale. Place furniture. Stand on the balcony. Feel the ceiling height.

- Works on Apple Vision Pro, Quest, and as a web fallback (360° panorama viewer)
- Voice commands while immersed: "Open up this wall" / "Make the windows floor-to-ceiling"
- Multiplayer: walk through the design with your architect, contractor, or partner
- **Tech:** WebXR API + Three.js (already in stack), Marble for environment generation
- **Timeline:** Longer build, but highest ceiling for wow factor

---

## CATEGORY B: GAME-LIKE INTERFACES

### 5. The Sim (SimCity Meets Your Dream Home)
**Wow factor: 🔥🔥🔥🔥🔥**

A full isometric/3D building game. Place your lot, choose terrain, drag-and-drop rooms, watch the AI auto-generate architecture that connects everything. Unreal Engine quality graphics, but it's *your actual building project*.

- Start by placing a property on a real map (Google Maps integration)
- Game UI: resource bars for budget, timeline, code compliance, energy efficiency
- Drag rooms onto the lot → AI auto-generates walls, roof, structure
- "Build Mode": choose materials, finishes, fixtures from the Knowledge Garden
- Achievement system: "Code Compliant!" / "Under Budget!" / "Net Zero!"
- Side quests: "Add a rainwater system for +50 Sustainability XP"
- **Tech:** Could use Unreal via Pixel Streaming, or Three.js for lighter version
- **Why it's special:** Makes construction as addictive as a video game. The gamification hooks are already in our architecture.

### 6. The Quest (Guided Adventure to Your Dream)
**Wow factor: 🔥🔥🔥🔥**

An RPG-style guided journey. You're the hero. AI is your mentor. Every decision branches the story toward your unique building.

- Opening: "You stand on an empty lot. The sun is setting. What do you see?" → voice/text input
- Each choice reveals a new scene: "You chose a courtyard. The AI shows three courtyard styles. Which speaks to you?"
- Collect "design tokens" — materials, styles, features — that accumulate into your vision
- Boss battles: "The zoning board says you can't build that high. How do you respond?" → AI suggests compliant alternatives
- End: your accumulated choices synthesize into a complete design concept
- **Tech:** State machine + Claude for narrative, FLUX/Marble for scene generation
- **Why it's special:** Makes design feel like a story, not a form. People who'd never fill out a design brief will play through this.

### 7. The Sandbox (Minecraft for Real Buildings)
**Wow factor: 🔥🔥🔥🔥**

A voxel-based builder where you place blocks at room scale, then AI "upscales" your crude block model into photorealistic architecture.

- Place blocks: each color = a room type (blue = bedroom, green = kitchen, etc.)
- AI interprets your block layout → generates real architectural plans
- Toggle between "block mode" and "reality mode" to see the actual building
- Multiplayer: build with family members, each placing their rooms
- **Tech:** Three.js voxel engine, Claude for spatial interpretation, FLUX for rendering
- **Why it's special:** Zero learning curve. If you can play Minecraft, you can design a building.

---

## CATEGORY C: ALCHEMICAL / COMBINATORIAL INTERFACES

### 8. The Alchemist (Symbol + Symbol = Building)
**Wow factor: 🔥🔥🔥🔥🔥**

Drag symbols, images, words, textures, and 3D models onto a mystical workbench. The combination "reacts" — sparks fly, elements merge — and a unique building concept materializes that's unlike anything that existed before.

- A floating table of ingredients: "Mediterranean" + "Brutalist" + "Garden roof" + *photo of a cliff* + "for a family of 5" + 🌅
- Drop them into the crucible → watch them swirl and react → a building emerges
- Every combination produces something unique — never the same building twice
- Save your "recipes" and share them: "Try my Cliff Villa recipe!"
- **Tech:** Drag-and-drop UI, Claude for combinatorial reasoning, FLUX/Marble for output
- **Why it's special:** Makes design feel like magic, not work. The "recipe" sharing creates virality. This is the Surprise Me on steroids.

### 9. The Genome (DNA of Your Dream)
**Wow factor: 🔥🔥🔥🔥**

Every building has a "genetic code" — a set of traits. You manipulate sliders and switches on a helix visualization to evolve your design.

- Visual: a rotating double helix where each "gene" is a design parameter
- Genes: roof pitch, window-to-wall ratio, material palette, ceiling height, orientation, style era, indoor-outdoor ratio, symmetry, etc.
- Drag a gene to mutate it → the building live-updates
- "Breed" two designs: take your friend's genome + yours → AI produces offspring
- Evolution mode: AI generates 8 variants, you pick your favorites, it breeds the next generation
- **Tech:** Parametric Three.js (extends BuildingDesigner), genetic algorithm UI
- **Why it's special:** Makes design feel like evolution, not decision-making. Removes analysis paralysis by making it playful.

### 10. The Oracle (AI Vision Board That Dreams For You)
**Wow factor: 🔥🔥🔥🔥**

Answer 7 questions about *your life* (not about architecture) — and AI reverse-engineers the building that fits you.

- "What does your perfect morning look like?" / "How do you entertain?" / "What's your relationship with nature?" / "What makes you feel safe?" / "Describe your happiest memory of a place"
- Claude analyzes the answers → infers spatial needs, material preferences, light quality, scale
- Generates a "dream profile" — then renders 3 wildly different buildings that all embody those answers
- The buildings aren't what you'd pick from a catalog — they're what you *need* but couldn't articulate
- **Tech:** Claude for psychological → architectural mapping, FLUX for rendering
- **Why it's special:** Nobody asks these questions. Every other tool asks "how many bedrooms?" This asks "who are you?"

### 11. The Collider (Two Dreams Enter, One Building Leaves)
**Wow factor: 🔥🔥🔥**

For couples, families, or business partners who need to align on a design. Each person creates their dream independently. Then they "collide" their designs.

- Person A's dream: modern minimalist glass box
- Person B's dream: warm rustic farmhouse
- The Collider: AI finds the synthesis — warm modern, glass + timber, minimalist with organic textures
- Visualizes the tensions AND the harmonies between the two visions
- Conflict resolution built in: "You both want open kitchens. You disagree on ceiling height. Here are 3 compromises."
- **Tech:** Claude for analysis and mediation, FLUX for rendering blended concepts

---

## CATEGORY D: CAPTURE-FIRST INTERFACES

### 12. The Walk-Through Capture (Film Your Dream)
**Wow factor: 🔥🔥🔥🔥**

Walk through a building you love — a hotel lobby, a friend's kitchen, a house from a TV show — and film it with your phone. AI reconstructs the space and lets you modify it.

- Film 30 seconds of video walking through a space
- AI extracts: spatial dimensions, materials, lighting, style
- Presents a 3D model you can edit: "Keep the layout but change to Mediterranean style" / "Make this 20% larger" / "Add a second story"
- **Tech:** Video → point cloud (photogrammetry), Claude Vision for material/style identification, Marble for 3D generation
- **Reference:** World Labs already does single-image → world; video makes it more precise

### 13. The Drone Eye (Your Lot, Your View)
**Wow factor: 🔥🔥🔥🔥**

Upload a drone photo or satellite image of your actual lot. AI places your dream building on it — shows you what it'll look like from the street, from the air, from the neighbor's perspective.

- Google Maps / drone photo → AI identifies lot boundaries, topography, sun path
- Place building on lot → auto-orient for optimal sun/views
- See shadow studies throughout the day/year
- See from the inside looking out: "This is what your kitchen window will see at 8am in December"
- **Tech:** Google Maps API, Three.js for placement, AI for shadow/sun calculation
- **Why it's special:** Grounds the dream in reality. "This isn't hypothetical — this is *your view*."

### 14. The Pinterest Vacuum (Import Your Visual Brain)
**Wow factor: 🔥🔥🔥**

Connect your Pinterest, Instagram, or saved photos. AI scans everything you've ever saved and builds a design profile from your visual preferences — then generates a building that matches.

- OAuth connect → scan saved boards/posts
- AI identifies recurring themes: "You save lots of: warm wood, arched doorways, indoor plants, mountain views, open shelving"
- Generates a "taste fingerprint" — visual DNA of your aesthetic
- Renders a building that IS your Pinterest board made real
- **Tech:** Pinterest/Instagram APIs, Claude Vision for analysis, FLUX for rendering

---

## CATEGORY E: VOICE & CONVERSATIONAL

### 15. The Voice Architect (Talk Your Dream Into Existence)
**Wow factor: 🔥🔥🔥🔥**

Pure conversation. No UI. Just talk. The building appears and evolves as you speak.

- "I want a house where I can hear the ocean from every room"
- AI: renders a coastal home with open floor plan → streams the image as you watch
- "Actually, make it two stories. And I want a big covered patio for barbecues"
- AI: updates the render in real-time, explains the tradeoffs
- "What would that cost in Santa Barbara?"
- AI: pulls from Knowledge Garden, gives a range
- **Tech:** Real-time voice (Whisper/Deepgram), Claude for conversation, FLUX for progressive rendering
- **Why it's special:** Closest thing to talking to a genius architect at a cocktail party

### 16. The Narrator (Your Dream as a Story)
**Wow factor: 🔥🔥🔥**

AI generates a written narrative of a day in your future home — you wake up, make coffee, look out the window, walk to the garden — and renders each scene as you read.

- Choose: "A Monday morning" / "Hosting Thanksgiving" / "A rainy Saturday afternoon"
- AI writes the story in second person, generating images for each scene
- "You step onto the terrace. The morning fog is lifting over the valley. The concrete is warm under your feet."
- At the end: the scenes assemble into a floor plan and concept
- **Tech:** Claude for narrative, FLUX for scene-by-scene illustration
- **Why it's special:** Emotionally resonant. People cry. Then they call a contractor.

---

## CATEGORY F: THE ORRERY EQUIVALENT

### 17. The Construction Cosmos (Orrery for Buildings)
**Wow factor: 🔥🔥🔥🔥🔥**

A 3D orbital visualization of the entire building universe — like the orchid orrery but for construction. At the center: your dream. Orbiting it: architectural styles, materials, building codes, trades, costs — all interconnected, all navigable.

- Center: a glowing representation of your emerging dream
- Inner orbit: architectural styles (Mediterranean, Modern, Craftsman, etc.) — click one to influence your center
- Middle orbit: materials (timber, steel, concrete, glass, stone) — drag one to your center
- Outer orbit: constraints (codes, budget, climate, lot size) — they shape what's possible
- As you add elements, your center morphs and evolves in real-time
- Zoom into any orbiting element → deep Knowledge Garden content
- **Tech:** Three.js (same orbital mechanics as orchid orrery), parametric building generator
- **Why it's special:** The orchid orrery proved this works. Same magic, applied to the $17T construction universe.

### 18. The Periodic Table of Building (Element Picker)
**Wow factor: 🔥🔥🔥🔥**

A beautiful, interactive periodic table where each "element" is a building component. Combine elements to synthesize buildings, just like combining chemical elements creates compounds.

- Rows: Structural (foundation, frame, roof) / Envelope (walls, windows, doors) / Systems (HVAC, plumbing, electrical) / Finishes (flooring, paint, fixtures)
- Columns: Material families (wood, steel, concrete, masonry, composite)
- Click an element → see its properties, cost, code requirements, sustainability rating
- Combine elements: drag "CLT timber frame" + "floor-to-ceiling glass" + "green roof" → AI generates the building that uses that combination
- **Tech:** Interactive grid UI + Three.js rendering + Knowledge Garden data
- **Why it's special:** Educational AND creative. Makes construction science feel like discovery.

---

## RECOMMENDED PHASE 1 BUILD (Pick 3)

Based on wow factor, technical feasibility with our current stack, and alignment with the "architect superpower" vision:

| Priority | Interface | Why First |
|----------|-----------|-----------|
| **#1** | **The Alchemist** (#8) | Highest virality potential, achievable in 1-2 sprints, replaces current Browse & Discover, showcases AI magic |
| **#2** | **The Worldwalker** (#1) | World Labs API is production-ready NOW, integrates with Three.js we already have, creates an "oh my god" moment |
| **#3** | **The Construction Cosmos** (#17) | Reuses orchid orrery architecture, showcases Knowledge Garden depth, establishes BKG's unique visual identity |

**Honorable mention:** The Oracle (#10) could ship fastest since it's mostly Claude + FLUX with minimal new UI.

---

## AGENTS & RESEARCH NEEDED

To do this right, these interfaces need input from different specialists:

| Agent / Skill | What They'd Contribute |
|---------------|----------------------|
| **3D/WebGL specialist** | Three.js performance optimization, Gaussian splat rendering, WebXR |
| **Game design consultant** | The Sim and Quest interfaces need game-loop expertise |
| **World Labs integration dev** | Marble API integration, SparkJS, Gaussian splat pipeline |
| **UX researcher** | Test which interfaces resonate with homeowners vs. contractors vs. architects |
| **Parametric design expert** | The Genome and Construction Cosmos need solid parametric engines |
| **AI image pipeline engineer** | FLUX/Replicate optimization for real-time iterative rendering |

In this chat I can research and design; for parallel agent execution, Cowork/dispatch would let you run multiple specialists simultaneously (e.g., one agent prototyping the Alchemist UI while another integrates the World Labs API while a third redesigns Browse & Discover).

---

*"One's agency brings joy." Every interface above amplifies the user's own vision. The AI doesn't design FOR you — it makes YOUR imagination buildable.*
