import type { Story } from "./types";

export function storyGroupKey(story: Pick<Story, "id" | "groupId">): string {
  return story.groupId || story.id;
}

export function groupStories(stories: Story[]): Story[][] {
  const order: string[] = [];
  const map = new Map<string, Story[]>();
  for (const story of stories) {
    const key = storyGroupKey(story);
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(story);
  }
  return order.map((key) => map.get(key)!);
}
