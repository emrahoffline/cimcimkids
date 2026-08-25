import assert from "node:assert/strict";
import { groupStories } from "./story-groups";
import type { Story } from "./types";

function story(partial: Partial<Story> & Pick<Story, "id" | "groupId">): Story {
  return {
    title: "",
    mediaUrl: "/products/uploads/a.jpg",
    mediaKind: "image",
    durationSec: 5,
    sortOrder: 0,
    viewCount: 0,
    linkUrl: "",
    active: true,
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

const grouped = groupStories([
  story({ id: "1", groupId: "g1", title: "a" }),
  story({ id: "2", groupId: "g1", title: "b" }),
  story({ id: "3", groupId: "g2", title: "c" }),
]);

assert.equal(grouped.length, 2);
assert.deepEqual(
  grouped[0].map((item) => item.id),
  ["1", "2"]
);
assert.deepEqual(
  grouped[1].map((item) => item.id),
  ["3"]
);

console.log("story-groups tests passed");
