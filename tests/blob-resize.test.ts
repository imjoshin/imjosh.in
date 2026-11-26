import { strict as assert } from "node:assert";
import { test } from "node:test";
import { initBlob } from "../src/lib/blob.js";

test("resizing reuses the drawing buffer until settled, then resizes and draws in one frame", (t) => {
  let now = 0, frameId = 0, width = 300, height = 150, programs = 0, disconnected = false;
  let notifyResize = () => {};
  const events: string[] = [];
  const uniforms = new Map<string, number>();
  const callbacks = new Map<number, FrameRequestCallback>();
  const gl = new Proxy({
    getParameter: () => 256,
    getShaderParameter: () => true,
    getProgramParameter: () => true,
    getAttribLocation: () => 0,
    getUniformLocation: (_program: unknown, name: string) => name,
    createProgram: () => { programs++; return {}; },
    uniform1f: (name: string, value: number) => uniforms.set(name, value),
    viewport: () => events.push("viewport"),
    drawArrays: () => events.push("draw"),
  }, {
    get(target, key) {
      if (key in target) return target[key as keyof typeof target];
      return /^[A-Z_]+$/.test(String(key)) ? key : () => ({});
    },
  });
  const globals = {
    window: Object.assign(new EventTarget(), {
      localStorage: { getItem: () => null, setItem() {} },
      setInterval: () => 1, clearInterval() {},
    }),
    document: { documentElement: Object.assign(new EventTarget(), { dataset: {}, toggleAttribute() {} }) },
    devicePixelRatio: 1,
    requestAnimationFrame: (callback: FrameRequestCallback) => { callbacks.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: (id: number) => callbacks.delete(id),
    ResizeObserver: class {
      constructor(callback: () => void) { notifyResize = callback; }
      observe() {}
      disconnect() { disconnected = true; }
    },
  };
  const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, value });
  t.mock.method(performance, "now", () => now);
  let dispose = () => {};
  t.after(() => {
    dispose();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  const canvas = {
    getContext: () => gl, clientWidth: 1000, clientHeight: 800,
    get width() { return width; },
    set width(value: number) { width = value; events.push("width"); },
    get height() { return height; },
    set height(value: number) { height = value; events.push("height"); },
  };
  const controller = initBlob(canvas as unknown as HTMLCanvasElement);
  dispose = () => controller.destroy();
  function tick(milliseconds: number) {
    now += milliseconds;
    const pending = [...callbacks.values()];
    callbacks.clear();
    pending.forEach((callback) => callback(now));
  }
  function resize(w: number, h = canvas.clientHeight) {
    canvas.clientWidth = w; canvas.clientHeight = h;
    notifyResize();
  }

  assert.deepEqual(events, ["width", "height", "viewport"]);
  events.length = 0;
  notifyResize(); // The observer's initial notification must not clear the buffer again.
  tick(200);
  assert.deepEqual(events, ["draw"]);
  const time = uniforms.get("uT")!;

  events.length = 0;
  resize(1200); tick(100);
  resize(1400); tick(100);
  resize(1500, 900); tick(149);
  assert.deepEqual(events, ["draw", "draw", "draw"]);
  assert.deepEqual([width, height], [1000, 800]);
  assert.equal(uniforms.get("uAspect"), 1500 / 900);
  assert.ok(uniforms.get("uT")! > time, "the same simulation keeps advancing during resize");
  events.length = 0;
  tick(1);
  assert.deepEqual(events, ["width", "height", "viewport", "draw"]);
  assert.deepEqual([width, height], [1500, 900]);
  assert.equal(programs, 2, "resizing must not recreate either shader program");

  events.length = 0;
  resize(1600); tick(50);
  resize(1500); tick(200);
  resize(0, 0); tick(200);
  assert.deepEqual(events, ["draw", "draw", "draw"], "unchanged and hidden sizes must not clear the buffer");

  events.length = 0;
  controller.setPaused(true);
  resize(390, 844); tick(200);
  assert.deepEqual(events, []);
  controller.setPaused(false); tick(16);
  assert.deepEqual(events, ["width", "height", "viewport", "draw"]);
  assert.deepEqual([width, height], [390, 844]);

  events.length = 0;
  resize(400); tick(150);
  assert.deepEqual(events, ["width", "viewport", "draw"], "only the dimension that changed needs assigning");
  controller.destroy(); dispose = () => {};
  assert.equal(callbacks.size, 0);
  assert.equal(disconnected, true);
});
