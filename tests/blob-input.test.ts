import { strict as assert } from "node:assert";
import { test } from "node:test";
import { initBlob } from "../src/lib/blob.js";
import { BlobSimulation, type Point } from "../src/lib/blob-physics.ts";

test("renderer input excludes links and controls, stops on release, and disarms across routes and pauses", (t) => {
  const attributes = new Set<string>();
  const root = Object.assign(new EventTarget(), {
    dataset: { theme: "dark" },
    toggleAttribute(name: string, enabled: boolean) {
      if (enabled) attributes.add(name); else attributes.delete(name);
    },
  });
  const windowTarget = Object.assign(new EventTarget(), {
    localStorage: { getItem: () => null, setItem() {} },
    setInterval: () => 1,
    clearInterval() {},
    matchMedia: () => ({ matches: desktop }),
  });
  let desktop = true;
  const hints: boolean[] = [];
  const callbacks = new Map<number, FrameRequestCallback>();
  let frameId = 0, now = performance.now(), pointCount = 0, blobCount = 0, pelletColor = -1;
  const gl = new Proxy({
    getParameter: () => 256,
    getShaderParameter: () => true,
    getProgramParameter: () => true,
    getAttribLocation: () => 0,
    getUniformLocation: (_program: unknown, name: string) => name,
    uniform1f(name: string, value: number) {
      if (name === "uN") blobCount = value;
      if (name === "uDark") pelletColor = value;
    },
    drawArrays(mode: unknown, _start: number, count: number) { if (mode === "POINTS") pointCount = count; },
  }, {
    get(target, key) {
      if (key in target) return target[key as keyof typeof target];
      return /^[A-Z_]+$/.test(String(key)) ? key : () => ({});
    },
  });
  const globals = {
    window: windowTarget,
    document: { documentElement: root },
    devicePixelRatio: 1,
    requestAnimationFrame: (callback: FrameRequestCallback) => { callbacks.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: (id: number) => { callbacks.delete(id); },
    ResizeObserver: class { observe() {} disconnect() {} },
  };
  const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, value });
  const random = Math.random;
  let dispose = () => {};
  Math.random = () => .5;
  t.after(() => {
    dispose();
    Math.random = random;
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  const canvas = {
    getContext: () => gl, clientWidth: 1000, clientHeight: 800,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 800 }),
  };
  const controller = initBlob(canvas as unknown as HTMLCanvasElement, { count: 1, onPewHintChange: (visible) => hints.push(visible) });
  dispose = () => controller.destroy();
  function tick(seconds = .01) {
    pointCount = 0;
    const pending = [...callbacks.values()];
    callbacks.clear();
    now += seconds * 1000;
    pending.forEach((callback) => callback(now));
  }
  function dispatch(type: string, fields: Record<string, unknown> = {}) {
    const { target, ...properties } = fields;
    const event = Object.assign(new Event(type), { button: 0, buttons: 1, pointerType: "mouse", clientX: 999, clientY: 1, ...properties });
    if (target) Object.defineProperty(event, "target", { value: target });
    windowTarget.dispatchEvent(event);
  }
  function typePeW(fields: Record<string, unknown> = {}) {
    for (const key of "pew") dispatch("keydown", { key, ...fields });
  }
  function blocked(selector: string) {
    return { closest: (query: string) => query.includes(selector) ? {} : null };
  }
  function activate() { typePeW(); assert.equal(attributes.has("data-pew-mode"), true); }
  function reset() { dispatch("keydown", { key: "Escape" }); tick(); assert.equal(pointCount, 0); }

  // Only successful desktop mouse hits count, and the fifth reveals the hint once.
  const burst = t.mock.method(BlobSimulation.prototype, "burstAt", (point: Point) => point[0] === 0 ? [0] : []);
  const hit = (fields: Record<string, unknown> = {}) => dispatch("pointerdown", { clientX: 500, clientY: 400, ...fields });
  for (let i = 0; i < 5; i++) {
    dispatch("pointerdown"); // Empty space.
    hit({ target: blocked("button") });
    hit({ pointerType: "touch" });
    hit({ button: 2 });
    desktop = false; hit(); desktop = true;
  }
  for (let i = 0; i < 4; i++) hit();
  assert.deepEqual(hints, []);
  controller.setPaused(true);
  controller.setPaused(false);
  hit(); hit();
  assert.deepEqual(hints, [true]);
  controller.setHome(false);
  assert.deepEqual(hints, [true, false]);
  for (let i = 0; i < 5; i++) hit();
  controller.setHome(true);
  for (let i = 0; i < 4; i++) hit();
  assert.deepEqual(hints, [true, false]);
  hit();
  assert.deepEqual(hints, [true, false, true]);
  typePeW();
  assert.deepEqual(hints, [true, false, true, false]);
  dispatch("keydown", { key: "Escape" });
  for (let i = 0; i < 5; i++) hit();
  assert.deepEqual(hints, [true, false, true, false], "discovered mode stays dismissed after Escape");
  burst.mock.restore();

  // Keyboard shortcuts, autorepeat, IME, and typing into fields cannot arm it.
  for (const fields of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { repeat: true }, { isComposing: true }, { target: blocked("input") }]) {
    typePeW(fields);
    assert.equal(attributes.has("data-pew-mode"), false);
  }
  activate();
  for (const selector of ["a,", "button", "input", "details", "contenteditable"]) {
    dispatch("pointerdown", { target: blocked(selector) });
    tick();
    assert.equal(pointCount, 0);
  }
  dispatch("pointerdown", { pointerType: "touch" });
  tick();
  assert.equal(pointCount, 0);
  dispatch("pointerdown", { button: 2 });
  tick();
  assert.equal(pointCount, 0);

  dispatch("pointerdown");
  tick();
  assert.equal(pointCount, 1);
  assert.equal(blobCount, 1); // Shooting must not trigger a click burst at the muzzle.
  assert.equal(pelletColor, 1);
  root.dataset.theme = "light";
  tick(.1);
  assert.equal(pointCount, 2);
  assert.equal(pelletColor, 0);
  dispatch("pointerup");
  tick(.1);
  assert.equal(pointCount, 2);

  reset(); activate();
  dispatch("pointerdown");
  dispatch("pointermove", { target: blocked("a,") });
  tick(.1);
  assert.equal(pointCount, 1);
  reset(); activate();
  dispatch("pointerdown");
  dispatch("blur");
  tick(.1);
  assert.equal(pointCount, 1);

  controller.setHome(false);
  assert.equal(attributes.has("data-pew-mode"), false);
  typePeW();
  controller.setHome(true);
  dispatch("pointerdown", { target: blocked("a,") });
  tick();
  assert.equal(pointCount, 0);
  assert.equal(attributes.has("data-pew-mode"), false);
  activate();
  controller.setPaused(true);
  assert.equal(attributes.has("data-pew-mode"), false);
  controller.setPaused(false);
  assert.equal(attributes.has("data-pew-mode"), false);
  tick();
  assert.equal(pointCount, 0);
});
