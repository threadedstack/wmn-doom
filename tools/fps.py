# Counts screen updates from the VNC server in this machine for N seconds (python3 standard library only).
# Prints updates per second and the share of the screen each update changed. Usage: python3 fps.py [seconds]
import socket, struct, sys, time

secs = float(sys.argv[1]) if len(sys.argv) > 1 else 10
s = socket.socket(socket.AF_UNIX); s.connect("/tmp/doom-vnc.sock")
def rd(n):
    b = b""
    while len(b) < n:
        c = s.recv(n - len(b))
        if not c: raise EOFError
        b += c
    return b
rd(12); s.sendall(b"RFB 003.008\n")
n = rd(1)[0]; types = rd(n)
s.sendall(b"\x01"); assert struct.unpack(">I", rd(4))[0] == 0
s.sendall(b"\x01")
w, h = struct.unpack(">HH", rd(4)); rd(16); rd(struct.unpack(">I", rd(4))[0])
s.sendall(struct.pack(">BxHi", 2, 1, 0))  # raw encoding only
t0 = time.time(); ups = 0; px = 0; first = True
while time.time() - t0 < secs:
    s.sendall(struct.pack(">BBHHHH", 3, 0 if first else 1, 0, 0, w, h)); first = False
    t = rd(1)[0]
    if t != 0:
        continue
    rd(1); nr = struct.unpack(">H", rd(2))[0]
    for _ in range(nr):
        x, y, rw, rh, enc = struct.unpack(">HHHHi", rd(12)); rd(rw * rh * 4); px += rw * rh
    ups += 1
dt = time.time() - t0
print(f"{w}x{h}: {ups/dt:.1f} updates/s over {dt:.0f} s, {px/max(ups,1)/(w*h)*100:.0f}% of the screen each")
