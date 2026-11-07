# wmn-doom

DOOM played in your browser. One wmn document (`notebook/index.wmn.md`) is published as a runnable page. Pressing **Run** starts a Linux machine in the tab (wmd-web, WebAssembly) from the Docker image `ghcr.io/threadedstack/wmn-doom:0.3`. The machine runs crispy-doom with the shareware episode, a VNC server and noVNC on port 8080. The page shows port 8080 in a port card under the block, so you see the game through noVNC and play it with the keyboard. Nothing runs on a server.

It needs wmn with package P525 (threadedstack/wmn issue #51, on wmn main as commit `b8ffee400`): published pages show a port of their machine, and a previewed page's WebSocket reaches the machine through the tab.

## Run it locally

Needs wmn with P525: the first release after `b8ffee400`, or wmn main run from source (`WMN_BIN` pointing at it, or `wmn` on PATH). Also its engine folder (`WMN_ENGINE_DIR`, default the app's own) and Bun.

```
./build.sh                                   # writes ../wmn-doom-site (about 600 MB: the image is baked in)
bun serve.ts ../wmn-doom-site 31810          # serves it with the isolation headers the machine needs
```

Open http://127.0.0.1:31810/ in Chrome, Firefox or Safari, then:

1. Press **Run**. The machine starts, then the game. The block says "DOOM is ready" after about 14 s (Chromium), 17 s (Firefox) or 24 s (Safari).
2. The **port 8080** card under the block shows DOOM. Click the game to give it your keys.
3. Arrows move, Ctrl fires, Space opens doors, Enter and Esc work the menus, 1 to 7 change weapon. Sound is off.

Closing the tab ends the machine.

## Deploy (machine A)

Machine B (this repo's author) cannot deploy to Firebase or change DNS. Machine A runs these steps, in this order:

1. Clone the repo next to the wmn checkout, at the commit named in the hand-off issue:
   ```
   gh repo clone threadedstack/wmn-doom && cd wmn-doom && git checkout <commit>
   ```
2. Use the wmn release named in the hand-off issue (the first one after `b8ffee400`, which has P525). Point `WMN_BIN` at its standalone binary and `WMN_ENGINE_DIR` at the engine folder built for that release's wmd-web pin (machine A's `~/Library/Application Support/wmn/engine`):
   ```
   export WMN_BIN=<path to wmn-<version>-macos-arm64>
   export WMN_ENGINE_DIR="$HOME/Library/Application Support/wmn/engine"
   ```
   `wmn publish` pulls the image from ghcr.io (a public package, no login).
3. Make the Firebase Hosting site (once):
   ```
   firebase hosting:sites:create wmn-doom --project wmn-runbooks
   ```
4. Deploy:
   ```
   ./deploy.sh
   ```
   It builds with `--host firebase --base /`, aims `firebase.json` at site `wmn-doom`, stamps `wmn-doom-version.json` with the commit, copies the live site to the `previous` channel, deploys, checks that https://wmn-doom.web.app serves the new version, and puts `previous` back if anything fails.
5. Add the custom domain `doom.threadedstack.com` to site `wmn-doom` (Firebase console: Hosting, site wmn-doom, Add custom domain).
6. Add the DNS record at Porkbun that Firebase asks for. For `cc.threadedstack.com` it was a CNAME to the site's web.app name, so here expect:
   ```
   CNAME   doom   wmn-doom.web.app
   ```
   Use the exact record (and any TXT verification record) that the Firebase console shows.
7. Check the live site in all three browsers (`WMN_DIR` is the wmn checkout whose Playwright the driver uses, default `../wmn`):
   ```
   node tools/drive.mjs https://doom.threadedstack.com/ ./live-check chromium play
   node tools/drive.mjs https://doom.threadedstack.com/ ./live-check firefox play
   node tools/drive.mjs https://doom.threadedstack.com/ ./live-check webkit play
   ```
   Each prints the time to ready, the pictures a second in the game, and "keys: the picture changed after walking, turning and firing", and keeps its screenshots in `./live-check`. A run takes about 1 to 2 minutes once the site's files are in the browser's cache. The first visit also downloads about 600 MB.

## Files

- `notebook/index.wmn.md`: the page (the only folder published)
- `image/`: the image's Dockerfile and files (credits B0nam/DOCKER-DOOM)
- `build.sh`: publishes the site
- `deploy.sh`: deploys it to Firebase Hosting (machine A)
- `serve.ts`: a static server that sends Cross-Origin-Opener-Policy, Cross-Origin-Embedder-Policy and Cross-Origin-Resource-Policy
- `PLAN.md`: what was found, the path chosen, sizes, what the player sees
- `PERFORMANCE.md`: measurements and the speed settings tried, kept or dropped
- `tools/drive.mjs`: drives the page in Chromium, Firefox or WebKit with Playwright (`node tools/drive.mjs <url> <out dir> <browser> <stage>`, stage `show` or `play`)
- `tools/fps.py`, `tools/perf/`: a speed page that counts the VNC server's updates inside the machine
- `shots/`: screenshots of the local three-browser runs

## Rebuild the image

The image is built for linux/arm64 (the browser machine's only architecture):

```
cd image && docker build --platform linux/arm64 -t ghcr.io/threadedstack/wmn-doom:<tag> .
```

A rebuild gets a new digest (Debian packages move on): push it, then pin the new tag and digest in the notebook's `image:` line.
