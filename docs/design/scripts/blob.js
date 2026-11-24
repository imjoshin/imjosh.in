// Liquid chrome metaballs. initBlob(canvas, {count, scale, pull, timeOffset}) -> destroy()
export function initBlob(canvas, o = {}) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true });
  if (!gl) return () => {};
  const N = o.count ?? 7, S = o.scale ?? 1, PULL = o.pull ?? 0.22;
  const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const fs = `precision highp float;
uniform vec2 uR;uniform float uT;uniform vec2 uM;uniform float uA;uniform float uB;uniform vec2 uC;uniform float uDark;uniform float uN;uniform float uS;uniform float uPull;
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
vec3 cen(float f){
 vec3 c=vec3(sin(uT*.21+f*1.9)*uA*.95*uS,cos(uT*.17+f*2.7)*1.05*uS,sin(uT*.15+f*1.3)*.6);
 vec2 tm=uM-c.xy;c.xy+=tm*uPull/(1.+length(tm)*.35);
 vec2 dir=normalize(c.xy-uC+vec2(sin(f*12.9),cos(f*7.3))*.7+1e-4);
 c.xy+=dir*uB*(1.5+1.1*fract(f*.618))*uS;c.z+=uB*sin(f*3.)*.7;
 return c;}
float map(vec3 p){float d=1e3;float b=clamp(uB,0.,1.);float k=mix(.8,.1,b);
 for(int i=0;i<8;i++){float f=float(i);if(f>=uN)break;
  float r=(.36+.15*sin(f*2.1+1.))*uS*mix(1.,.72,b);
  d=smin(d,length(p-cen(f))-r,k*uS);}
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
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['uR', 'uT', 'uM', 'uA', 'uB', 'uC', 'uDark', 'uN', 'uS', 'uPull'].forEach(n => U[n] = gl.getUniformLocation(pr, n));

  let m = [0, 0], mt = [0, 0], click = [0, 0], b = 0, bv = 0, dark = isDark() ? 1 : 0, raf, dead = false;
  function isDark() { return document.documentElement.dataset.theme === 'dark'; }
  const toWorld = (e) => {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) * 2 - r.width) / r.height * 2.3, -((e.clientY - r.top) * 2 - r.height) / r.height * 2.3];
  };
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    let dpr = Math.min(devicePixelRatio, 1.5);
    if (w * h * dpr * dpr > 2.4e6) dpr = Math.sqrt(2.4e6 / (w * h));
    canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  const pm = e => { mt = toWorld(e); };
  const pd = e => {
    if (e.target.closest && e.target.closest('a,button,input')) return;
    click = toWorld(e); bv += 0.14;
  };
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  window.addEventListener('pointermove', pm); window.addEventListener('pointerdown', pd);
  const t0 = performance.now();
  const loop = () => {
    if (dead) return;
    raf = requestAnimationFrame(loop);
    m[0] += (mt[0] - m[0]) * .045; m[1] += (mt[1] - m[1]) * .045;
    bv += (0 - b) * .016; bv *= .93; b += bv;
    dark += ((isDark() ? 1 : 0) - dark) * .08;
    gl.uniform2f(U.uR, canvas.width, canvas.height);
    gl.uniform1f(U.uT, (performance.now() - t0) / 1000 + (o.timeOffset ? o.timeOffset() : 0));
    gl.uniform2f(U.uM, m[0], m[1]); gl.uniform1f(U.uA, canvas.width / canvas.height);
    gl.uniform1f(U.uB, b); gl.uniform2f(U.uC, click[0], click[1]); gl.uniform1f(U.uDark, dark);
    gl.uniform1f(U.uN, N); gl.uniform1f(U.uS, S); gl.uniform1f(U.uPull, PULL);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  loop();
  return () => { dead = true; cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('pointermove', pm); window.removeEventListener('pointerdown', pd); };
}
