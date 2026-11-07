# Performance

Measured on machine B (Mac, Apple silicon, 16 GB) on 2026-11-06, with Playwright's Chromium, Firefox and WebKit, against a local copy of the site served by `serve.ts`. Each number comes from `tools/drive.mjs`. "Ready" is the time from pressing Run until the block says DOOM is ready. "New pictures a second" counts the pictures noVNC draws while the player turns in the game for 10 s: the driver samples the game's canvas inside the frame every 20 ms and counts each change. DOOM itself runs at most 35 a second.

## Download size

| What | Size |
|---|---|
| Image `ghcr.io/threadedstack/wmn-doom:0.3` (linux/arm64, compressed) | 175 MB |
| The image as baked into the site by `wmn publish` (packs) | 493 MB |
| Base snapshot of the machine | 48 MB |
| Whole site (image, engine, snapshot, page) | about 600 MB |

The Claude Code demo's site is about the same size (its image is 420 MB).

## Final check: the Firebase build from wmn main (2026-11-06)

wmn main at `b8ffee400` (P525 landed), built with `./build.sh <out> --host firebase --base /` (what `deploy.sh` runs), served by `serve.ts`, driven by `tools/drive.mjs ... play` one browser at a time. Screenshots are in `shots/`.

| Browser | Ready after Run | First game frame after Run | New pictures a second in game | Keys work | Memory of the whole browser |
|---|---|---|---|---|---|
| Chromium | 14.1 s | 14.1 s | 33.6 | yes | 5.3 GB |
| Firefox | 17.1 s | 17.1 s | 25.4 | yes | 5.8 GB |
| WebKit | 24.1 s | 24.1 s | 15.3 | yes | not readable (119 MB counted, see below) |

"Keys work" means the picture changed after the driver walked, turned and fired. The memory numbers are higher than in the earlier runs below; both are the driver's count of every process it started.

## The setting kept: 320x200, 4 CPUs

| Browser | Ready after Run | First game frame after Run | New pictures a second in game | Memory of the whole browser |
|---|---|---|---|---|
| Chromium | 16 s | 16 s | 31 to 33 | 1.3 GB |
| Firefox | 18 s | 18 s | 15 to 23 | 1.7 GB |
| WebKit | 26 s | 26 s | 15 | not readable (see below) |

- The first visit also downloads the site's files. These times are for a site on this Mac, where the download takes no time.
- WebKit runs a machine with at most 2 CPUs (wmn caps it), so `cpus: 4` gives it 2.
- Memory is the resident memory of every process the driver started, as the system counts it. On macOS, WebKit's page process is started by the system, not by the driver, so its number (107 MB) leaves the page out.

## What was tried

Each row changes one thing from the row above. Chromium, the same drive each time.

| Change | Ready after Run | New pictures a second in game | Kept? |
|---|---|---|---|
| Start: 640x400 picture, 1 CPU (`b0nam`'s layout: one process each for the X server and VNC, then noVNC) | 25 s | about 2.5 (from screenshots; the canvas count was not built yet) | no |
| 640x400, `cpus: 4` | 16 s | 16.5 | no |
| 320x200 (DOOM's own size; noVNC scales it up in the page), 1 CPU | 27 s | 14.6 | no |
| 320x200, `cpus: 2` | 19 s | 25.7 | no |
| **320x200, `cpus: 4`** | **15 to 16 s** | **31 to 33** | **yes** |

Also done, for size or clarity rather than speed:
- Debian's own `crispy-doom` package instead of building it, and a slim base with no build tools in the last layer: 175 MB compressed, against about 470 MB for `b0nam/docker-doom`.
- Xvnc on a socket file with no TCP port: before this, the page showed a second card for the VNC port (5900) that could not be previewed.
- noVNC bundled into one HTML file, because a page preview cannot load noVNC's many module files.

## Not tried yet

- noVNC's encodings: the defaults are kept (the picture crosses the tab, not a network, so bandwidth is not the limit; CPU in the machine is).
- 16-bit colour in Xvnc.
