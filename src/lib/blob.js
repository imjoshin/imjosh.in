import { BlobSimulation, BLOB_BLEND, BLOB_SEPARATED_BLEND } from './blob-physics.ts';

// The handoff's chrome shader, driven by independent gravitational particles.
export function initBlob(canvas, o = {}) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true });
  if (!gl) return { destroy() {}, setHome() {}, setPaused() {} };
  const N = Math.max(1, Math.min(8, Math.floor(o.count ?? 7))), S = o.scale ?? 1;
  const simulation = new BlobSimulation({ count: N, scale: S, pull: o.pull ?? .24 });
  const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const fs = `precision highp float;
uniform vec2 uR;uniform float uT;uniform float uDark;uniform float uN;uniform float uS;uniform vec4 uParticles[8];
float map(vec3 p){float d=1e3;float blendedBurst=0.;
 for(int i=0;i<8;i++){float f=float(i);if(f>=uN)break;
  float b=clamp(uParticles[i].w,0.,1.);
  float k=mix(${BLOB_BLEND},${BLOB_SEPARATED_BLEND},max(b,blendedBurst))*uS;
  float r=(.36+.15*sin(f*2.1+1.))*uS*mix(1.,.72,b);
  float distance=length(p-uParticles[i].xyz)-r;
  float h=clamp(.5+.5*(distance-d)/k,0.,1.);
  d=mix(distance,d,h)-k*h*(1.-h);
  blendedBurst=mix(b,blendedBurst,h);}
 return d;}
vec3 nrm(vec3 p){vec2 e=vec2(.002,0.);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}
void main(){vec2 uv=(gl_FragCoord.xy*2.-uR)/uR.y;
 vec3 ro=vec3(0.,0.,4.),rd=normalize(vec3(uv,-1.6));
 float t=0.,hit=0.,md=1e3;
 for(int i=0;i<84;i++){float d=map(ro+rd*t);md=min(md,d);if(d<.002){hit=1.;break;}t+=d;if(t>10.)break;}
 if(hit<.5){float g=exp(-md*6.);float a=g*mix(.09,.3,uDark);vec3 gc=mix(vec3(.05,.03,.15),vec3(.42,.32,1.),uDark);gl_FragColor=vec4(gc*a,a);return;}
 vec3 p=ro+rd*t,n=nrm(p),r=reflect(rd,n);
 float fr=pow(1.-max(dot(n,-rd),0.),2.4);
 float k=dot(n,vec3(.4,.7,.3))*.9+fr*.8+uT*.05;
 vec3 ir=vec3(.44,.4,.96)+vec3(.32,.27,.04)*cos(6.2831*(k+vec3(0.,.22,.5)));
 float hz=smoothstep(-.04,.04,r.y);
 vec3 lo=mix(vec3(.07,.06,.12),vec3(.02,.02,.06),uDark);
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
  const U = {}; ['uR', 'uT', 'uDark', 'uN', 'uS', 'uParticles[0]'].forEach(n => U[n] = gl.getUniformLocation(pr, n));

  const particles = new Float32Array(8 * 4);
  let home = o.home ?? true, interactive = false, paused = false;
  let speed = home ? 1 : .18, dark = isDark() ? 1 : 0;
  let raf = 0, lastFrame = performance.now(), dead = false;
  function isDark() { return document.documentElement.dataset.theme === 'dark'; }
  const toWorld = (e) => {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) * 2 - r.width) / r.height * 2.5, -((e.clientY - r.top) * 2 - r.height) / r.height * 2.5];
  };
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w <= 0 || h <= 0) return;
    let dpr = Math.min(devicePixelRatio, 1.5);
    if (w * h * dpr * dpr > 2.4e6) dpr = Math.sqrt(2.4e6 / (w * h));
    canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    simulation.setAspect(w / Math.max(h, 1));
  };
  const pm = e => { simulation.setPointer(toWorld(e)); };
  const pd = e => {
    if (e.target.closest && e.target.closest('a,button,input')) return;
    // Hit-test the visible surface and kick only its connected group.
    simulation.burstAt(toWorld(e));
  };
  const leave = () => simulation.setPointer(null);
  const up = e => { if (e.pointerType !== 'mouse') leave(); };
  function setHome(value) {
    home = value;
    const enabled = home && !paused && !dead;
    if (interactive === enabled) return;
    interactive = enabled;
    const method = enabled ? 'addEventListener' : 'removeEventListener';
    window[method]('pointermove', pm);
    window[method]('pointerdown', pd);
    window[method]('pointerup', up);
    window[method]('pointercancel', leave);
    document.documentElement[method]('pointerleave', leave);
    window[method]('blur', leave);
    if (!enabled) leave();
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  setHome(home);
  const loop = now => {
    if (dead || paused) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(Math.max((now - lastFrame) / 1000, 0), .05);
    lastFrame = now;
    speed += ((home ? 1 : .18) - speed) * (1 - Math.exp(-dt * 2.4));
    simulation.step(dt * speed);
    dark += ((isDark() ? 1 : 0) - dark) * (1 - Math.exp(-dt * 5));
    simulation.particles.forEach((particle, i) => {
      particles.set(particle.position, i * 4);
      particles[i * 4 + 3] = particle.burst;
    });
    gl.uniform2f(U.uR, canvas.width, canvas.height);
    gl.uniform1f(U.uT, simulation.time);
    gl.uniform1f(U.uDark, dark);
    gl.uniform1f(U.uN, N); gl.uniform1f(U.uS, S);
    gl.uniform4fv(U['uParticles[0]'], particles);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  raf = requestAnimationFrame(loop);
  return {
    setHome,
    setPaused(value) {
      if (dead || paused === value) return;
      paused = value;
      setHome(home);
      cancelAnimationFrame(raf);
      if (!paused) { lastFrame = performance.now(); raf = requestAnimationFrame(loop); }
    },
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      setHome(false);
      gl.deleteBuffer(buf);
      gl.deleteShader(vertexShader); gl.deleteShader(fragmentShader); gl.deleteProgram(pr);
    },
  };
}
