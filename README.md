# DIGSITE — GitHub and Vercel export

This package contains the latest DIGSITE website and 3D excavation game. Every file is at the top level: there are no nested directories, dependency installs, or build steps.

## Deploy

1. Extract the ZIP on your computer.
2. Upload all extracted files directly to the root of your GitHub repository. Upload the files themselves, not the ZIP or a folder containing the files. You should see index.html, play.html, and vercel.json immediately when you open the repository.
3. In Vercel, choose Add New → Project and import that GitHub repository.
4. Keep the Root Directory at the repository root. The included vercel.json selects Framework Preset Other, leaves the build and install commands empty, and serves the root directory (.).
5. Deploy. The homepage is / and the game is /play. The configuration also redirects /play.html to /play.

Configuration reference: https://vercel.com/docs/project-configuration/vercel-json

Keep all files together. The HTML, CSS, JavaScript, fonts, pictures, and GLB character models use relative paths in this flat layout. Do not set the output directory to dist, build, or public.

## Included

- Gold-themed website with the X.com button linked to https://x.com/DigsiteDotFun.
- Detailed animated Pikachu and Eevee, plus animated Diglett and Dugtrio.
- Pokémon conversations, clues, greetings, and companion behavior.
- Running, jumping, two-axis click-and-drag camera control, scroll-wheel zoom, and camera reset.
- Expanded quarry, collectible gold, landmarks, fast travel, and day/night lighting.
- All fonts, images, models, and the Three.js runtime bundled locally.

## Controls

- WASD / arrows: run; Shift: sprint; Space: jump.
- Hold the left or right mouse button and drag: rotate and tilt the view.
- Mouse wheel: zoom. Reset camera button: restore the default view.
- E: collect nearby gold or dig. F: talk to a nearby Pokémon. I: collection. M: map.

## Current functionality

Exploration and discoveries are stored in each visitor's browser. Multiplayer synchronization, on-chain treasury accounting, wallet verification, and physical collectible redemption are not connected. Moving from the existing site to a Vercel domain starts a separate browser save for that domain.

## Credits

See CREDITS.txt and the included font and Three.js license files.
