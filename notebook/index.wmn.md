---
title: DOOM in your browser
image: ghcr.io/threadedstack/wmn-doom:0.3@sha256:fc06936e541dda629920ffb89579b38ed160fe101a6382fa6a3e1d32c933682a
memory: 1024
cpus: 4
---

# DOOM in your browser

This page runs DOOM in a Linux machine inside your browser tab. The machine is compiled to WebAssembly (wmd-web) and starts from the Docker image `wmn-doom`: Debian with crispy-doom, the DOOM shareware episode, a VNC server and noVNC. Nothing runs on a server. The game draws into the VNC server in the machine. noVNC, framed on this page, shows it and sends it your keys.

## 1. Start the game

Press **Run**. The first run starts the machine, then the game, the VNC server and noVNC (on port 8080 in the machine). The block waits until noVNC answers. The game then shows in the **port 8080** card under the block.

```sh {#doom}
start-doom
ready=no
for i in $(seq 1 240); do
  if python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/', timeout=2)" 2>/dev/null; then ready=yes; break; fi
  sleep 0.5
done
if [ "$ready" = yes ]; then echo "DOOM is ready: click the game below to play"; else echo "noVNC did not answer; the logs:"; tail -n 20 /tmp/doom-*.log; false; fi
```

## 2. Play

Click the game to give it your keys.

- **Arrow keys:** move and turn
- **Ctrl:** fire
- **Space:** open doors and press switches
- **Enter** and **Esc:** the menus (Esc opens the menu, Enter picks)
- **1** to **7:** change weapon

Sound is off: the machine has no sound card. The VNC server has no password: it listens only inside the machine, and nothing outside your tab can reach it. When you close the tab, the machine and the game are gone.
