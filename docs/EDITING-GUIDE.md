# Editing the profile

This repository contains Jordan Dominguez’s current GitHub profile and the source used to build its terminal animation.

## File map

<!-- file-map:start -->

| Path | Purpose |
| --- | --- |
| `README.md` | Public profile; generated from the configuration |
| `profile-content.json` | Profile copy, links, colors, project details and animation timing |
| `assets/terminal-intro.gif` | 30-second looping animation; 1600 × 906; 20 fps |
| `assets/terminal-intro.mp4` | 30-second H.264 video; 2400 × 1360; 30 fps |
| `assets/terminal-poster.png` | Full-resolution static alternative |
| `assets/terminal-poster.svg` | Self-contained editable vector composition |
| `assets/links/` | Small portfolio, LinkedIn and project-status graphics |
| `tools/terminal/` | Layout, animation, README generator, documentation sync, renderer and validation |
| `tools/terminal/fonts/` | Bundled DejaVu fonts and their license |
| `tools/terminal/data-landscape.png` | Globe and wireframe art layer |

<!-- file-map:end -->

Generated HTML previews, temporary video frames and installed dependencies stay local and are ignored by Git. Keep verification reports and review images in the local `verification/` folder; they provide evidence for checking changes without adding development artifacts to the public profile.

## Update the content or links

Edit `profile-content.json`. For README text or link changes, run `npm run build`. For terminal copy, colors or animation timing, run `npm run render` so the GIF, MP4, PNG and SVG all reflect the change.

- `readme.bio` and `readme.featuredDescription` control the text beneath the animation.
- `readme.links.portfolio` and `readme.links.linkedin` control the contact buttons.
- `readme.links.caseStudy` controls the **Project README** button, which opens the AI Decision Trust Lab write-up on GitHub. `readme.links.liveDemo` controls the **Live Demo** button, which opens the Streamlit app. Set either value to `null` to show an unlinked **Coming soon** label, or supply a public HTTPS URL to activate it.
- `stackSeparator` controls the dots between tools.
- `quote` controls the two-line statement beside the globe. After editing it, run `npm run render` to update the PNG, GIF and MP4 along with the SVG and preview.
- `render.introReveal` controls the quick fade and slight upward motion of both introductory comments together. They remain complete text; typing starts at `$ whoami` as they arrive.
- `render.typing` sets typing speeds and pauses. The schedule follows the actual text, so longer copy may require a longer video to preserve the reading hold.
- `render.boot` sets the startup, loading messages, progress milestones, digit speed and transition timing.

Keep the five project IDs unless also updating their illustration code. Only add tools or achievements that are supported by the profile owner’s work.

The README buttons and GitHub’s account website field are separate. Update **Edit profile → Website** on GitHub when changing the main portfolio address. A linked GitHub README must be in a public repository for visitors without access to open it.

## Build and preview

Requirements: Node.js 20 or later, Playwright, Chromium, FFmpeg and FFprobe. Install dependencies with `npm ci`. The dependency versions are pinned in `package-lock.json`.

```sh
npm run build         # README, link graphics, SVG and local HTML preview
npm run poster        # Update the PNG for static review; videos require render
npm run render        # Render PNG, MP4 and GIF
npm run verify        # Verify both media files decode, dimensions and loop timing
npm run format:check  # Check source formatting
npm run format        # Format source after editing
```

The renderer uses `/usr/bin/chromium` by default. Set `CHROMIUM_PATH` to another installed Chromium executable if needed. Put `ffmpeg` and `ffprobe` on `PATH`.

After building, open `preview/terminal.html`. It is self-contained and opens on the completed design. Use **Replay intro** to play or **Hold full composition** to pause. Fonts and artwork are bundled; playback does not need a server or network connection.

The README, link graphics, preview HTML and poster SVG are generated files. Make lasting copy changes in the configuration and layout changes in `tools/terminal/build.mjs` or `tools/terminal/readme.mjs`.

## Animation timing

The renderer refreshes the marked file map and timing table from the configuration and validated typing schedule. Run `npm run render` after changing timing to update the guide and both animations together. Keep manual notes outside the generated blocks.

<!-- animation-timing:start -->

| Time | Sequence |
| --- | --- |
| 0.00–3.60 seconds | Terminal power-on, hexadecimal rain, typed loading messages, staged progress and gentle zoom |
| 2.95–3.35 seconds | Both introductory comments fade and slide in together |
| 3.20–19.29 seconds | 23 terminal lines type in, starting at `$ whoami`, with a moving cyan cursor |
| 6.85–8.95 seconds | The five project cards reveal |
| 8.55–9.55 seconds | Impact cards and quote reveal |
| 19.29–29.20 seconds | Completed composition holds for reading (9.91 seconds) |
| 29.20–30.00 seconds | Screen closes into the opening scanline for the loop |

<!-- animation-timing:end -->

The renderer checks all six terminal sections and five project cards, text bounds, complete content, the simultaneous intro fade, typing that starts at `$ whoami`, partial typed prefixes, cursor alignment, hidden future lines, replay reset, loading progress and the minimum eight-second reading hold. Reports and sample frames are written to the ignored `verification/` folder.

## Development, artwork and claims

Code, documentation and visual design were developed with AI assistance. The profile owner supplied the portfolio content and reviewed the design. The build and verification commands above document how to reproduce and check the outputs.

The terminal reference supplied by the profile owner guided the composition. The AI Decision Trust Lab reference guided its blue/teal hero, signal curves and two workbench panels. Project miniatures are original illustrative vectors, not client screenshots or reported results.

The two impact metrics and listed tools were supplied by the profile owner. The globe and wave backdrop was AI-generated for this composition. Font license: [DejaVu license](../tools/terminal/fonts/LICENSE.txt).

Build and render commands update local files only. Publication happens through a separate Git commit and push.
