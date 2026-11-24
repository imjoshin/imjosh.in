import { strict as assert } from "node:assert";
import { test } from "node:test";
import { BlobSimulation } from "../src/lib/blob-physics.ts";

function advance(simulation: BlobSimulation, seconds: number, step = 1 / 120) {
  for (let elapsed = 0; elapsed < seconds - 1e-8; elapsed += step) simulation.step(Math.min(step, seconds - elapsed));
}

function difference(a: BlobSimulation, b: BlobSimulation) {
  return a.particles.reduce((sum, particle, i) => sum + Math.hypot(...particle.position.map((value, axis) => value - b.particles[i].position[axis])), 0) / a.particles.length;
}

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
  const idle = new BlobSimulation();
  const scattered = new BlobSimulation();
  scattered.burstAt([0, 0]);
  advance(idle, 1);
  advance(scattered, 1);
  const dispersed = difference(idle, scattered);
  assert.ok(dispersed > .7);
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
    simulation.burstAt([-.5, .1]);
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
