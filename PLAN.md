# DOOM in the browser: plan

## Goal

Open a web page, press **Run**, and play DOOM in the page. The game runs in a Linux machine inside the tab (wmd-web, WebAssembly), started from a Docker image, and is shown through VNC (noVNC). The page is one wmn document published as a runnable page, built the same way as the Claude Code demo (`../wmn-claude-code`).

## Phase 0: can a published page show a port of its machine? (2026-11-06)

Tested with released wmn 0.1.66 on a tiny page (`python:3.12-slim`, `python3 -m http.server 8080` in a block):

- The server answers inside the machine.
- A published page had no way to show it. There was no port card, and an HTML output that frames `http://127.0.0.1:8080/` stays blank: page outputs may not open frames or make network calls (packages/publish/src/output-frame.ts). The page itself may talk only to its own site and the relay. Every preview, even the editor's, refused WebSockets, and noVNC needs one.
- The browser machine runs linux/arm64 only (`--arch a64`, and the bake pulls `linux/arm64`). The published `b0nam/docker-doom` is linux/amd64 only, so it cannot run here.

Reported as [threadedstack/wmn#51](https://github.com/threadedstack/wmn/issues/51). The user then approved machine B fixing it in wmn. That is package **P525** (item N482 S1 and S2). It reuses the hosted editor's page-only port preview from P509: no new server, nothing sent through the relay.

- **S1:** a published runnable page shows the port card (`port 8080`, Hide preview, Reload, Open) under the block whose run opened the port. The site's own service worker (`wmn-pv-sw.js`) answers `/_pv/<label>/` with the response of the machine in the tab.
- **S2:** a WebSocket that the previewed page opens to its own address is carried through the tab to the same port in the machine. It uses the agent's existing port connection (`connectPort`); the tab speaks the upgrade and the WebSocket frames.

## The path chosen

| Piece | Choice | Why |
|---|---|---|
| Image | `image/Dockerfile` (credits B0nam/DOCKER-DOOM), linux/arm64 | The browser machine is arm64; the published image is amd64 only. |
| Game | Debian trixie's own `crispy-doom` package, `-nosound`, a 320x200 window (DOOM's own size; noVNC scales it up in the page) | Nothing to compile; no build tools in the final layer. 320x200 is twice as fast as 640x400 here (PERFORMANCE.md). |
| WAD | `doom1.wad` (shareware, freely redistributable) from Debian's archive, checked by sha256 | The same file B0nam's image uses. |
| Display | `Xvnc` (TigerVNC: X server and VNC server in one process) on a socket file, no TCP port, no password | One process; only port 8080 shows on the page; nothing outside the machine can reach it. |
| Web | `websockify --web` on port 8080: the noVNC page and the VNC WebSocket on one port | One port for the port card. |
| noVNC | v1.6.0 `core/rfb.js` bundled with esbuild into one HTML file (inline module script) | A page preview has no network of its own, so it cannot load noVNC's many module files. |
| Page | `notebook/index.wmn.md`, published with `wmn publish --runnable`, `memory: 1024`, `cpus: 4` | The same as the Claude Code demo. 4 CPUs double the speed (WebKit is capped at 2). |
| Image home | `ghcr.io/threadedstack/wmn-doom:0.3` (public package; the repo stays private) | `wmn publish` pulls it to bake the site, on this Mac and on machine A. |

The image is pinned by tag and digest in the notebook's `image:` line: `ghcr.io/threadedstack/wmn-doom:0.3@sha256:fc06936e541dda629920ffb89579b38ed160fe101a6382fa6a3e1d32c933682a`.

## Sizes

- Image: 175 MB compressed (linux/arm64). `wmn publish` bakes it as 493 MB of packs. The site is about 600 MB with the engine and the 48 MB base snapshot.

## What the player sees

1. The page explains what runs where, and has one **Run** block.
2. Run starts the machine, then the game, the VNC server and noVNC. The block waits until noVNC answers and says "DOOM is ready".
3. A **port 8080** card opens under the block with DOOM's title and attract demo running in it (16 s after Run in Chromium, 18 s in Firefox, 26 s in WebKit).
4. Click the game, then play with the keyboard: arrows move, Ctrl fires, Space opens doors, Enter and Esc work the menus. Sound is off.

## Not in scope

- A deploy from this Mac. Machine A deploys (README.md, "Deploy (machine A)").
