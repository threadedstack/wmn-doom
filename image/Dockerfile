# DOOM for the browser machine (linux/arm64): crispy-doom with the shareware doom1.wad, shown by a VNC server and a
# one-file noVNC page on port 8080. It follows the recipe of B0nam/DOCKER-DOOM (https://github.com/B0nam/DOCKER-DOOM,
# image b0nam/docker-doom): crispy-doom -nosound in a VNC desktop, noVNC in front of it. The differences: Debian's own
# crispy-doom package (nothing is compiled), arm64, a slim base, and noVNC bundled into one HTML file so a page
# preview (which cannot load JavaScript modules) can show it.

# 1. noVNC as one HTML file: its RFB client and our small page, bundled with esbuild.
FROM node:22-bookworm-slim AS novnc
WORKDIR /b
RUN npm init -y >/dev/null && npm install --no-audit --no-fund esbuild@0.25.10
ADD https://github.com/novnc/noVNC/archive/refs/tags/v1.6.0.tar.gz /b/novnc.tgz
RUN echo "5066103959ef4e9b10f37e5a148627360dd8414e4cf8a7db92bdbd022e728aaa  novnc.tgz" | sha256sum -c - && tar -xzf novnc.tgz && mv noVNC-1.6.0 novnc
COPY client.js page.html ./
RUN npx esbuild client.js --bundle --minify --format=esm --target=es2022 --outfile=client.min.js \
 && node -e 'const f=require("fs");const js=f.readFileSync("client.min.js","utf8").replace(/<\/script/gi,"<\\/script");f.writeFileSync("index.html",f.readFileSync("page.html","utf8").replace("/*CLIENT*/",()=>js))'

# 2. The shareware WAD (freely redistributable), from Debian's archive, checked by its sha256.
FROM debian:trixie-slim AS wad
ADD http://ftp.debian.org/debian/pool/non-free/d/doom-wad-shareware/doom-wad-shareware_1.9.fixed.orig.tar.gz /w.tgz
RUN echo "e02c8b5e01be7373d4c53f82556118e2aaaf8f83fa2af5eee1efadf9c55c4eb1  /w.tgz" | sha256sum -c - && mkdir /w && tar -xzf /w.tgz -C /w && find /w -name doom1.wad -exec cp {} /doom1.wad \;

# 3. The machine: Xvnc (X server and VNC server in one), crispy-doom, websockify (serves the page and carries VNC over a WebSocket).
FROM debian:trixie-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends crispy-doom tigervnc-standalone-server websockify \
 && apt-get clean && rm -rf /var/lib/apt/lists/* /usr/share/doc/* /usr/share/man/* /usr/share/locale/*
COPY --from=wad /doom1.wad /opt/doom/doom1.wad
COPY --from=novnc /b/index.html /opt/doom/web/index.html
COPY start-doom /usr/local/bin/start-doom
COPY crispy-doom.cfg default.cfg /opt/doom/cfg/
RUN chmod 755 /usr/local/bin/start-doom
EXPOSE 8080
CMD ["start-doom"]
