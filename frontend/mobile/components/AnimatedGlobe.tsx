import React from "react"
import { View, StyleSheet } from "react-native"
import { WebView } from "react-native-webview"

const GLOBE_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: transparent; overflow: hidden; }
  canvas { width:100%;
    height:100%;
    margin:0;
    padding:0;
    overflow:hidden;
    background:transparent; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
const GRAD3 = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
];

const _perm = (() => {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
})();

function dot3(g, x, y, z) { return g[0]*x + g[1]*y + g[2]*z; }

function snoise(x, y, z) {
  const F3 = 1/3, G3 = 1/6;
  const s = (x+y+z)*F3;
  const i = Math.floor(x+s), j = Math.floor(y+s), k = Math.floor(z+s);
  const t = (i+j+k)*G3;
  const x0 = x-(i-t), y0 = y-(j-t), z0 = z-(k-t);
  let i1,j1,k1,i2,j2,k2;
  if (x0 >= y0) {
    if (y0 >= z0)      { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; }
    else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; }
    else               { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; }
  } else {
    if (y0 < z0)       { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; }
    else if (x0 < z0)  { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; }
    else               { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; }
  }
  const x1=x0-i1+G3, y1=y0-j1+G3, z1=z0-k1+G3;
  const x2=x0-i2+2*G3, y2=y0-j2+2*G3, z2=z0-k2+2*G3;
  const x3=x0-1+3*G3, y3=y0-1+3*G3, z3=z0-1+3*G3;
  const ii=i&255, jj=j&255, kk=k&255;
  const gi0=_perm[ii+_perm[jj+_perm[kk]]]%12;
  const gi1=_perm[ii+i1+_perm[jj+j1+_perm[kk+k1]]]%12;
  const gi2=_perm[ii+i2+_perm[jj+j2+_perm[kk+k2]]]%12;
  const gi3=_perm[ii+1+_perm[jj+1+_perm[kk+1]]]%12;
  let t0=0.6-x0*x0-y0*y0-z0*z0;
  const n0=t0<0?0:((t0*=t0),t0*t0*dot3(GRAD3[gi0],x0,y0,z0));
  let t1=0.6-x1*x1-y1*y1-z1*z1;
  const n1=t1<0?0:((t1*=t1),t1*t1*dot3(GRAD3[gi1],x1,y1,z1));
  let t2=0.6-x2*x2-y2*y2-z2*z2;
  const n2=t2<0?0:((t2*=t2),t2*t2*dot3(GRAD3[gi2],x2,y2,z2));
  let t3=0.6-x3*x3-y3*y3-z3*z3;
  const n3=t3<0?0:((t3*=t3),t3*t3*dot3(GRAD3[gi3],x3,y3,z3));
  return 32*(n0+n1+n2+n3);
}

const NUM_POINTS = 4500;
const SPHERE_RADIUS = 1.65;
const FOV_HALF_TAN = Math.tan((75 * Math.PI / 180) / 2);

function generateSpherePoints(n) {
  const pts = new Float32Array(n * 3);
  const phi = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < n; i++) {
    const theta = Math.acos(1 - 2*(i+0.5)/n);
    const a = 2*Math.PI*i/phi;
    pts[i*3]   = Math.sin(theta)*Math.cos(a);
    pts[i*3+1] = Math.sin(theta)*Math.sin(a);
    pts[i*3+2] = Math.cos(theta);
  }
  return pts;
}

const BASE_POINTS = generateSpherePoints(NUM_POINTS);
const projected = new Array(NUM_POINTS);

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);
}
resize();
window.addEventListener('resize', resize);

const startTime = performance.now();
let animId;

function render(now) {
  const time = (now - startTime) * 0.001;
  const cosY = Math.cos(time * 0.18);
  const sinY = Math.sin(time * 0.18);
  const cosX = Math.cos(time * 0.12);
  const sinX = Math.sin(time * 0.12);

  const w = window.innerWidth;
  const h = window.innerHeight;

  ctx.clearRect(0, 0, w, h);

  // Radial background glow
  const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w * 0.55);
  grad.addColorStop(0, 'rgba(180, 20, 30, 0.18)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = 'lighter';

  const cx = w / 2;
  const cy = h / 2;
  const displaySize = Math.min(w, h) * 1.5;
  const screenScale = (displaySize / 2) / FOV_HALF_TAN;

  for (let i = 0; i < NUM_POINTS; i++) {
    let px = BASE_POINTS[i*3];
    let py = BASE_POINTS[i*3+1];
    let pz = BASE_POINTS[i*3+2];

    const n = snoise(
      px * 0.5 + time * 0.15,
      py * 0.5 + time * 0.2,
      pz * 0.5 + time * 0.15
    );

    px += n * 0.3; py += n * 0.3; pz += n * 0.3;
    const inv = SPHERE_RADIUS / Math.sqrt(px*px + py*py + pz*pz);
    px *= inv; py *= inv; pz *= inv;

    let rx = px*cosY + pz*sinY;
    let rz = -px*sinY + pz*cosY;
    let ry = py*cosX - rz*sinX;
    rz     = py*sinX + rz*cosX;

    const camDist = 4 - rz;
    const sx = cx + (rx/camDist)*screenScale;
    const sy = cy - (ry/camDist)*screenScale;

    const t = (n + 1) * 0.5;
    const dotR = Math.max(0.5, (1.0 + t * 2.8));
    projected[i] = { sx, sy, rz, dotR, t };
  }

  projected.sort((a, b) => a.rz - b.rz);

  for (let i = 0; i < NUM_POINTS; i++) {
    const { sx, sy, dotR, t } = projected[i];
    const r = Math.round(180 + t * 75);
    const g = Math.round(20  + t * 30);
    const b = Math.round(30  + t * 40);
    const a = 0.28 + t * 0.38;
    ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    ctx.beginPath();
    ctx.arc(sx, sy, dotR, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
  animId = requestAnimationFrame(render);
}

animId = requestAnimationFrame(render);
</script>
</body>
</html>
`

interface AnimatedGlobeProps {
  size?: number
}

export default function AnimatedGlobe({ size = 220 }: AnimatedGlobeProps) {
  return (
    <View
      // style={StyleSheet.absoluteFill}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
      }}
    >
      <WebView
        source={{ html: GLOBE_HTML }}
        style={{ width: size, height: size, backgroundColor: "transparent" }}
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        originWhitelist={["*"]}
        androidLayerType="hardware"
        javaScriptEnabled
        allowsInlineMediaPlayback
      />
    </View>
  )
}
