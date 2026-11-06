// The page's VNC client: noVNC's RFB, connected to websockify on the same address as this page (path "websockify").
import RFB from "./novnc/core/rfb.js";

const status = document.getElementById("status");
const say = (t) => { status.textContent = t; };
const url = new URL("websockify", location.href);
url.protocol = url.protocol === "https:" ? "wss:" : "ws:";

let tries = 0;
function connect() {
  say("Connecting to the game...");
  const rfb = new RFB(document.getElementById("screen"), url.href, { shared: true });
  rfb.scaleViewport = true;
  rfb.focusOnClick = true;
  rfb.addEventListener("connect", () => { tries = 0; say("Click the game, then play. Arrows move, Ctrl fires, Space opens doors, Enter and Esc work the menus."); rfb.focus(); });
  rfb.addEventListener("disconnect", (e) => {
    say(e.detail.clean ? "The game closed." : "Lost the game. Trying again...");
    if (!e.detail.clean && tries++ < 20) setTimeout(connect, 1500);
  });
}
connect();
