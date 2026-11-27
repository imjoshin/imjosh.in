import { BlobSimulation, BLOB_BLEND, BLOB_SEPARATED_BLEND, BLOB_RADIUS_BLEND, MAX_BLOB_PARTICLES } from './blob-physics.ts';
import { PewMode, MAX_PELLETS } from './blob-pew.ts';

const INNER_PAGE_SPEED = .04;
const RESIZE_DELAY = 150;
const STORAGE_KEY = 'imjosh.in:blobs:v1';

// The handoff's chrome shader, driven by independent gravitational particles.
export function initBlob(canvas, o = {}) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true });
  if (!gl) return { destroy() {}, setHome() {}, setPaused() {} };
  const N = Math.max(1, Math.min(8, Math.floor(o.count ?? 7))), S = o.scale ?? 1;
  // Pack burst states four per vector to stay within mobile WebGL uniform limits.
  const capacity = Math.max(8, Math.min(MAX_BLOB_PARTICLES, Math.floor((gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) - 6) / 5) * 4));
  const simulation = new BlobSimulation({ count: N, scale: S, pull: o.pull ?? .24, maxParticles: capacity });
  const pew = new PewMode(simulation, (event, affected) => o.onInteraction?.(event, { affected_blobs: affected }));
  const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const fs = `precision highp float;
uniform vec2 uR;uniform float uAspect;uniform float uT;uniform float uDark;uniform float uN;uniform float uS;uniform vec4 uParticles[${capacity}];uniform vec4 uBursts[${capacity / 4}];
float blendWidth(float radius,float burst){return max(${BLOB_SEPARATED_BLEND}*uS,min(${BLOB_BLEND}*uS,radius*${BLOB_RADIUS_BLEND})*(1.-burst*.55));}
float map(vec3 p){float density=0.;float minimumWidth=1e3;
 for(int i=0;i<${capacity};i++){if(float(i)>=uN)break;
  float r=uParticles[i].w;if(r<.0001)continue;
  int lane=i-(i/4)*4;vec4 states=uBursts[i/4];
  float b=clamp(lane==0?states.x:lane==1?states.y:lane==2?states.z:states.w,0.,1.);
  float width=blendWidth(r,b);
  float distance=length(p-uParticles[i].xyz)-r;
  minimumWidth=min(minimumWidth,width);
  density+=exp(clamp(-distance/width,-60.,20.));}
 return -log(max(density,1e-26))*minimumWidth;}
// Differentiate the surface directly instead of subtracting six nearby samples.
vec3 nrm(vec3 p){vec3 gradient=vec3(0.);
 for(int i=0;i<${capacity};i++){if(float(i)>=uN)break;
  float radius=uParticles[i].w;if(radius<.0001)continue;
  int lane=i-(i/4)*4;vec4 states=uBursts[i/4];
  float burst=clamp(lane==0?states.x:lane==1?states.y:lane==2?states.z:states.w,0.,1.);
  float width=blendWidth(radius,burst);vec3 delta=p-uParticles[i].xyz;float distance=length(delta);
  gradient+=exp(clamp((radius-distance)/width,-60.,20.))*delta/(width*max(distance,.0001));}
 return normalize(gradient+vec3(0.,0.,1e-10));}
void main(){vec2 uv=(gl_FragCoord.xy*2./uR-1.)*vec2(uAspect,1.);
 vec3 ro=vec3(0.,0.,4.),rd=normalize(vec3(uv,-1.6));
 float t=0.,hit=0.,md=1e3;
 for(int i=0;i<84;i++){float d=map(ro+rd*t);md=min(md,d);if(d<.002){hit=1.;break;}t+=d;if(t>10.)break;}
 if(hit<.5){float g=exp(-md*6.);float a=g*mix(.09,.3,uDark);vec3 gc=mix(vec3(.05,.03,.15),vec3(.42,.32,1.),uDark);gl_FragColor=vec4(gc*a,a);return;}
 vec3 p=ro+rd*t,n=nrm(p),r=reflect(rd,n);
 float fr=pow(1.-max(dot(n,-rd),0.),2.4);
 float k=dot(n,vec3(.4,.7,.3))*.9+fr*.8+uT*.05;
 vec3 ir=vec3(.44,.4,.96)+vec3(.32,.27,.04)*cos(6.2831*(k+vec3(0.,.22,.5)));
 float hz=smoothstep(-.04,.04,r.y);
 // White reflected floor in light mode; retain the dark-mode indigo floor.
 vec3 lo=mix(vec3(1.),vec3(.02,.02,.06),uDark);
 vec3 hi=mix(vec3(.96,.95,1.),vec3(.62,.56,.95),uDark);
 vec3 env=mix(lo+.28*smoothstep(-.7,-.05,r.y)*vec3(.8,.8,1.),hi,hz)+.45*smoothstep(.7,1.,r.y);
 vec3 col=mix(env,env*ir*1.5,.6);
 col+=pow(max(dot(r,normalize(vec3(.5,.8,.6))),0.),48.)*1.3;
 col=mix(col,ir,fr*mix(.45,.75,uDark));
 gl_FragColor=vec4(col,1.);}`;
  const sh = (type, src) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(error || 'Unable to compile the blob shader');
    }
    return shader;
  };
  const pr = gl.createProgram();
  const vertexShader = sh(gl.VERTEX_SHADER, vs), fragmentShader = sh(gl.FRAGMENT_SHADER, fs);
  gl.attachShader(pr, vertexShader); gl.attachShader(pr, fragmentShader); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) {
    gl.deleteShader(vertexShader); gl.deleteShader(fragmentShader); gl.deleteProgram(pr);
    throw new Error('Unable to link the blob shader');
  }
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['uR', 'uAspect', 'uT', 'uDark', 'uN', 'uS', 'uParticles[0]', 'uBursts[0]'].forEach(n => U[n] = gl.getUniformLocation(pr, n));

  // A separate point pass leaves the chrome shading untouched. Perspective makes
  // pellets travel up from beneath the camera and shrink into the scene.
  const pelletVertex = sh(gl.VERTEX_SHADER, `attribute vec3 aPellet;uniform vec2 uR;uniform float uAspect;
void main(){float depth=max(.01,4.-aPellet.z);
 gl_Position=vec4(aPellet.x*1.6/uAspect,aPellet.y*1.6,0.,depth);
 gl_PointSize=clamp(.016*uR.y/depth,2.,12.);}`);
  const pelletFragment = sh(gl.FRAGMENT_SHADER, `precision mediump float;uniform float uDark;
void main(){float r=length(gl_PointCoord*2.-1.);if(r>1.)discard;
 float alpha=1.-smoothstep(.7,1.,r);gl_FragColor=vec4(vec3(uDark)*alpha,alpha);}`);
  const pelletProgram = gl.createProgram();
  gl.attachShader(pelletProgram, pelletVertex); gl.attachShader(pelletProgram, pelletFragment);
  gl.bindAttribLocation(pelletProgram, loc, 'aPellet');
  gl.linkProgram(pelletProgram);
  if (!gl.getProgramParameter(pelletProgram, gl.LINK_STATUS)) throw new Error('Unable to link the pellet shader');
  const pelletLocation = gl.getAttribLocation(pelletProgram, 'aPellet');
  const pelletResolution = gl.getUniformLocation(pelletProgram, 'uR');
  const pelletAspect = gl.getUniformLocation(pelletProgram, 'uAspect');
  const pelletDark = gl.getUniformLocation(pelletProgram, 'uDark');
  const pelletBuffer = gl.createBuffer(), pelletPositions = new Float32Array(MAX_PELLETS * 3);
  gl.bindBuffer(gl.ARRAY_BUFFER, pelletBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, pelletPositions.byteLength, gl.DYNAMIC_DRAW);

  const particles = new Float32Array(capacity * 4), bursts = new Float32Array(capacity);
  const complexity = () => Math.max(1, Math.ceil(simulation.particles.length / 16));
  let resolutionComplexity = complexity();
  let home = o.home ?? true, interactive = false, paused = false;
  let blobClicks = 0, hintVisible = false, hintDismissed = false;
  let gravityGrab = false;
  let speed = home ? 1 : INNER_PAGE_SPEED, dark = isDark() ? 1 : 0;
  let raf = 0, lastFrame = performance.now(), dead = false;
  let viewWidth = 0, viewHeight = 0, resizeAfter = Infinity;
  function isDark() { return document.documentElement.dataset.theme === 'dark'; }
  const toWorld = (e) => {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) * 2 - r.width) / r.height * 2.5, -((e.clientY - r.top) * 2 - r.height) / r.height * 2.5];
  };
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w <= 0 || h <= 0 || (w === viewWidth && h === viewHeight)) return;
    viewWidth = w; viewHeight = h;
    simulation.setAspect(w / h);
    resizeAfter = performance.now() + RESIZE_DELAY;
  };
  const resizeBuffer = () => {
    resizeAfter = Infinity;
    const w = viewWidth, h = viewHeight;
    if (w <= 0 || h <= 0) return;
    let dpr = Math.min(devicePixelRatio, 1.5);
    const pixelBudget = 2.4e6 / resolutionComplexity;
    if (w * h * dpr * dpr > pixelBudget) dpr = Math.sqrt(pixelBudget / (w * h));
    const width = Math.max(1, Math.round(w * dpr)), height = Math.max(1, Math.round(h * dpr));
    if (canvas.width === width && canvas.height === height) return;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  const blockedTarget = target => target?.closest?.('a,button,input,select,textarea,details,[contenteditable]:not([contenteditable="false"])');
  const overCanvas = e => {
    const r = canvas.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX < r.left + r.width && e.clientY >= r.top && e.clientY < r.top + r.height;
  };
  const syncCursor = () => document.documentElement.toggleAttribute('data-pew-mode', pew.active);
  const setPewHint = visible => {
    if (hintVisible === visible) return;
    hintVisible = visible;
    o.onPewHintChange?.(visible);
  };
  const pm = e => {
    const point = toWorld(e);
    if (blockedTarget(e.target) || (e.pointerType === 'mouse' && !(e.buttons & 2))) gravityGrab = false;
    simulation.setPointer(point, gravityGrab);
    pew.setAim(point);
    if (blockedTarget(e.target) || (e.pointerType === 'mouse' && !(e.buttons & 1))) pew.stop();
  };
  const pd = e => {
    if (blockedTarget(e.target)) { gravityGrab = false; simulation.setPointer(toWorld(e)); pew.stop(); return; }
    if (e.button === 2 && e.pointerType === 'mouse' && overCanvas(e)) {
      if (!gravityGrab) o.onInteraction?.('blob_gravity_grab', { method: 'mouse' });
      gravityGrab = true;
      simulation.setPointer(toWorld(e), true);
      return;
    }
    if (e.button !== 0) return;
    if (pew.active) {
      if (e.pointerType === 'mouse') { pew.setAim(toWorld(e)); pew.start(); }
      return;
    }
    // Hit-test the visible surface and kick only its connected group.
    const affected = simulation.burstAt(toWorld(e)).length;
    const hit = affected > 0;
    if (hit) o.onInteraction?.('blob_burst', { method: e.pointerType || 'mouse', affected_blobs: affected });
    if (hit && !hintDismissed && o.onPewHintChange && e.pointerType === 'mouse'
      && window.matchMedia('(min-width: 768px)').matches
      && ++blobClicks === 5) setPewHint(true);
  };
  const leave = () => { gravityGrab = false; simulation.setPointer(null); pew.stop(); };
  const up = e => {
    pew.stop();
    if (e.pointerType !== 'mouse') leave();
    else if (e.button === 2) { gravityGrab = false; simulation.setPointer(toWorld(e)); }
  };
  const context = e => {
    if (e.button === 2 && !blockedTarget(e.target) && overCanvas(e)) e.preventDefault();
  };
  const kd = e => {
    if (e.repeat || e.isComposing || e.altKey || e.ctrlKey || e.metaKey
      || e.target?.closest?.('input,select,textarea,[contenteditable]:not([contenteditable="false"])')) return;
    const wasActive = pew.active;
    pew.type(e.key);
    if (pew.active !== wasActive) o.onInteraction?.(pew.active ? 'pew_mode_enable' : 'pew_mode_disable', { method: 'keyboard' });
    if (pew.active) { hintDismissed = true; setPewHint(false); }
    syncCursor();
  };
  function setHome(value) {
    home = value;
    const enabled = home && !paused && !dead;
    if (!home || dead) { blobClicks = 0; setPewHint(false); }
    if (pew.active && !enabled) o.onInteraction?.('pew_mode_disable', { method: home ? 'pause' : 'navigation' });
    pew.setHome(enabled);
    syncCursor();
    if (interactive === enabled) return;
    interactive = enabled;
    const method = enabled ? 'addEventListener' : 'removeEventListener';
    window[method]('pointermove', pm);
    window[method]('pointerdown', pd);
    window[method]('pointerup', up);
    window[method]('pointercancel', leave);
    window[method]('contextmenu', context);
    window[method]('keydown', kd);
    document.documentElement[method]('pointerleave', leave);
    window[method]('blur', leave);
    if (!enabled) leave();
  }
  resize();
  let restored = false;
  try { restored = simulation.restore(JSON.parse(window.localStorage.getItem(STORAGE_KEY))); } catch { /* Storage may be unavailable or corrupt. */ }
  if (!restored) simulation.randomizePositions();
  resolutionComplexity = complexity();
  resizeBuffer();
  const save = () => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(simulation.snapshot())); } catch { /* Animation also works without storage. */ }
  };
  save();
  const saveInterval = window.setInterval(save, 2000);
  window.addEventListener('pagehide', save);
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  setHome(home);
  const loop = now => {
    if (dead || paused) return;
    raf = requestAnimationFrame(loop);
    const elapsed = Math.max((now - lastFrame) / 1000, 0);
    const dt = Math.min(elapsed, .05);
    lastFrame = now;
    speed += ((home ? 1 : INNER_PAGE_SPEED) - speed) * (1 - Math.exp(-dt * 2.4));
    simulation.step(dt * speed);
    pew.step(elapsed);
    if (complexity() !== resolutionComplexity) { resolutionComplexity = complexity(); resizeAfter = now; }
    // Keep drawing into the existing buffer during a resize. Reallocate only
    // after it settles, immediately before drawing so no cleared frame appears.
    if (now >= resizeAfter) resizeBuffer();
    dark += ((isDark() ? 1 : 0) - dark) * (1 - Math.exp(-dt * 5));
    simulation.particles.forEach((particle, i) => {
      particles.set(particle.position, i * 4);
      particles[i * 4 + 3] = simulation.renderRadius(particle);
      bursts[i] = particle.burst;
    });
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(U.uR, canvas.width, canvas.height);
    // Projection follows the CSS viewport even while the buffer size is held.
    gl.uniform1f(U.uAspect, simulation.aspect);
    gl.uniform1f(U.uT, simulation.time);
    gl.uniform1f(U.uDark, dark);
    gl.uniform1f(U.uN, simulation.particles.length); gl.uniform1f(U.uS, S);
    gl.uniform4fv(U['uParticles[0]'], particles);
    gl.uniform4fv(U['uBursts[0]'], bursts);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (pew.pellets.length) {
      pew.pellets.forEach((pellet, i) => pelletPositions.set(pellet.position, i * 3));
      gl.useProgram(pelletProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, pelletBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, pelletPositions);
      gl.enableVertexAttribArray(pelletLocation); gl.vertexAttribPointer(pelletLocation, 3, gl.FLOAT, false, 0, 0);
      gl.uniform2f(pelletResolution, canvas.width, canvas.height);
      gl.uniform1f(pelletAspect, simulation.aspect);
      gl.uniform1f(pelletDark, isDark() ? 1 : 0);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.POINTS, 0, pew.pellets.length);
      gl.disable(gl.BLEND);
    }
  };
  raf = requestAnimationFrame(loop);
  return {
    setHome,
    setPaused(value) {
      if (dead || paused === value) return;
      paused = value;
      if (paused) save();
      setHome(home);
      cancelAnimationFrame(raf);
      if (!paused) { lastFrame = performance.now(); raf = requestAnimationFrame(loop); }
    },
    destroy() {
      save();
      window.clearInterval(saveInterval);
      window.removeEventListener('pagehide', save);
      dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      setHome(false);
      gl.deleteBuffer(buf);
      gl.deleteShader(vertexShader); gl.deleteShader(fragmentShader); gl.deleteProgram(pr);
      gl.deleteBuffer(pelletBuffer);
      gl.deleteShader(pelletVertex); gl.deleteShader(pelletFragment); gl.deleteProgram(pelletProgram);
    },
  };
}
