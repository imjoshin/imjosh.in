import { strict as assert } from "node:assert";
import { test } from "node:test";
import { pageDirection } from "../src/lib/navigation.ts";

test("page motion follows Home, Uses, Resume order in both directions", () => {
  for (const [from, to] of [["/", "/uses/"], ["/", "/resume/"], ["/uses/", "/resume/"]]) assert.equal(pageDirection(from, to), "forward");
  for (const [from, to] of [["/uses/", "/"], ["/resume/", "/"], ["/resume/", "/uses/"]]) assert.equal(pageDirection(from, to), "back");
  assert.equal(pageDirection("/uses/?month=2020-04", "/uses"), "none");
  assert.equal(pageDirection("/missing", "/"), "back");
});
