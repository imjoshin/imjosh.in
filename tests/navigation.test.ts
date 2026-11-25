import { strict as assert } from "node:assert";
import { test } from "node:test";
import { pageDirection } from "../src/lib/navigation.ts";

test("page motion follows Home, Projects, Uses, Resume order in both directions", () => {
  const pages = ["/", "/projects/", "/uses/", "/resume/"];
  for (let source = 0; source < pages.length; source++) {
    for (let target = 0; target < pages.length; target++) {
      assert.equal(pageDirection(pages[source], pages[target]), target > source ? "forward" : target < source ? "back" : "none");
    }
  }
  assert.equal(pageDirection("/uses/?month=2020-04", "/uses"), "none");
  assert.equal(pageDirection("/missing", "/"), "back");
});
