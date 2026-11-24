import { strict as assert } from "node:assert";
import { test } from "node:test";
import { BlobSimulation } from "../src/lib/blob-physics.ts";

function advance(simulation: BlobSimulation, seconds: number, step = 1 / 120) {
  for (let elapsed = 0; elapsed < seconds - 1e-8; elapsed += step) simulation.step(Math.min(step, seconds - elapsed));
}

function difference(a: BlobSimulation, b: BlobSimulation) {
  return a.particles.reduce((sum, particle, i) => sum + Math.hypot(...particle.position.map((value, axis) => value - b.particles[i].position[axis])), 0) / a.particles.length;
}

function aim(simulation: BlobSimulation, index = 0): [number, number] {
  const [x, y, z] = simulation.particles[index].position;
  return [4 * x / (4 - z), 4 * y / (4 - z)];
}

function fixture(positions: [number, number, number][], connectionThreshold?: number) {
  const simulation = new BlobSimulation({ count: positions.length, connectionThreshold });
  simulation.particles.forEach((particle, i) => {
    particle.position = [...positions[i]];
    particle.velocity = [0, 0, 0];
    particle.radius = .3;
    particle.mass = 1;
  });
  return simulation;
}

test("empty-space clicks leave all bubbles alone", () => {
  const idle = fixture([[0, 0, 0], [3, 0, 0]]);
  const clicked = fixture([[0, 0, 0], [3, 0, 0]]);
  assert.equal(clicked.hitTest([10, 10]), null);
  assert.deepEqual(clicked.burstAt([10, 10]), []);
  advance(idle, 1);
  advance(clicked, 1);
  assert.deepEqual(clicked.particles, idle.particles);
});

test("a separated bubble gets no click impulse or shape change", () => {
  const idle = fixture([[0, 0, 0], [3, 0, 0]]);
  const clicked = fixture([[0, 0, 0], [3, 0, 0]]);
  assert.deepEqual(clicked.burstAt([0, 0]), [0]);
  idle.step(1 / 120);
  clicked.step(1 / 120);
  assert.ok(clicked.particles[0].burst > 0);
  assert.notDeepEqual(clicked.particles[0].velocity, idle.particles[0].velocity);
  assert.deepEqual(clicked.particles[1], idle.particles[1]);
});

test("a click reaches the entire connected chain but stops before a separate group", () => {
  const simulation = fixture([[-1, 0, 0], [-.25, 0, 0], [.5, 0, 0], [3, 0, 0]]);
  assert.deepEqual(simulation.burstAt([-1, 0]), [0, 1, 2]);
  simulation.step(1 / 120);
  assert.ok(simulation.particles.slice(0, 3).every((particle) => particle.burst > 0));
  assert.equal(simulation.particles[3].burst, 0);
});

test("connections respect the surface-gap threshold", () => {
  assert.deepEqual(fixture([[0, 0, 0], [.99, 0, 0]]).burstAt([0, 0]), [0, 1]);
  assert.deepEqual(fixture([[0, 0, 0], [1.01, 0, 0]]).burstAt([0, 0]), [0]);
  assert.deepEqual(fixture([[0, 0, 0], [.99, 0, 0]], .2).burstAt([0, 0]), [0]);
});

test("hit detection selects the front surface and includes the smooth bridge between bubbles", () => {
  const overlapping = fixture([[0, 0, 0], [0, 0, 1.5]]);
  assert.equal(overlapping.hitTest([0, 0]), 1);
  assert.deepEqual(overlapping.burstAt([0, 0]), [1]);
  const bridge = fixture([[-.45, 0, 0], [.45, 0, 0]]);
  assert.deepEqual(bridge.burstAt([0, 0]), [0, 1]);
});

test("a click eases a velocity impulse from the current state without an instantaneous shape or position jump", () => {
  const simulation = new BlobSimulation();
  advance(simulation, 3);
  const before = structuredClone(simulation.particles);
  assert.ok(simulation.burstAt(aim(simulation)).length > 0);
  assert.deepEqual(simulation.particles, before);
  assert.equal(simulation.burst, 0);
  simulation.step(1 / 120);
  assert.ok(simulation.burst > 0 && simulation.burst < .2);
  simulation.particles.forEach((particle, i) => assert.ok(Math.hypot(...particle.position.map((value, axis) => value - before[i].position[axis])) < .01));
  advance(simulation, .15);
  assert.ok(simulation.burst > .7);
});

test("pointer gravity attracts particles individually rather than translating the scene", () => {
  const idle = new BlobSimulation();
  const attracted = new BlobSimulation();
  const pointer = [1.2, .7] as const;
  attracted.setPointer(pointer);
  advance(idle, 3);
  advance(attracted, 3);
  const distance = (simulation: BlobSimulation) => simulation.particles.reduce((sum, particle) => sum + Math.hypot(particle.position[0] - pointer[0], particle.position[1] - pointer[1]), 0);
  assert.ok(distance(attracted) < distance(idle));
  const shifts = attracted.particles.map((particle, i) => particle.position[0] - idle.particles[i].position[0]);
  assert.ok(Math.max(...shifts) - Math.min(...shifts) > .2);
  assert.ok(new Set(attracted.particles.map((particle) => particle.mass)).size > 1);
});

test("a single click disperses particles for seconds and they gradually recover without a held pointer", () => {
  const idle = new BlobSimulation({ count: 1 });
  const scattered = new BlobSimulation({ count: 1 });
  scattered.burstAt(aim(scattered));
  advance(idle, 1);
  advance(scattered, 1);
  const dispersed = difference(idle, scattered);
  assert.ok(dispersed > .35);
  assert.ok(scattered.burst > .5);
  advance(idle, 11);
  advance(scattered, 11);
  assert.ok(difference(idle, scattered) < dispersed * .15);
  assert.ok(scattered.burst < .002);
});

test("physics remains consistent across low and high refresh rates", () => {
  const low = new BlobSimulation();
  const high = new BlobSimulation();
  for (const simulation of [low, high]) {
    simulation.setPointer([.5, .5]);
    simulation.burstAt(aim(simulation));
  }
  advance(low, 8, 1 / 30);
  advance(high, 8, 1 / 144);
  assert.ok(difference(low, high) < .01);
});

test("resizing preserves time and motion, and long frame gaps cannot destabilize the simulation", () => {
  const simulation = new BlobSimulation();
  advance(simulation, 2);
  const time = simulation.time;
  const x = simulation.particles.map((particle) => particle.position[0]);
  simulation.setAspect(2);
  assert.equal(simulation.time, time);
  simulation.particles.forEach((particle, i) => assert.equal(particle.position[0], x[i] * 2));
  simulation.setAspect(0);
  assert.equal(simulation.aspect, 2);
  for (let i = 0; i < 1000; i++) {
    if (i % 60 === 0) simulation.burstAt([Math.sin(i), Math.cos(i)]);
    simulation.step(i % 100 === 0 ? 60 : 1 / 60);
  }
  for (const particle of simulation.particles) {
    assert.ok([...particle.position, ...particle.velocity].every(Number.isFinite));
    assert.ok(Math.hypot(...particle.position) < 10);
  }
});
