export type StoryItem = {
  id: string;
  title: string;
  mediaUrl: string;
  durationSec: number;
  sortOrder: number;
  active: boolean;
  viewCount: number;
  groupId: string;
  linkUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type StoryGroup = {
  id: string;
  title: string;
  items: StoryItem[];
  sortOrder: number;
};

export function isStoryVideo(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

export function clampStoryDuration(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return 5;
  return Math.min(15, Math.max(3, n));
}

export function groupStories(items: StoryItem[]): StoryGroup[] {
  const map = new Map<string, StoryItem[]>();
  for (const item of items) {
    const gid = item.groupId || item.id;
    const list = map.get(gid) ?? [];
    list.push(item);
    map.set(gid, list);
  }

  const groups: StoryGroup[] = [];
  for (const [id, list] of map) {
    list.sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)
    );
    groups.push({
      id,
      title: list[0]?.title ?? "",
      items: list,
      sortOrder: Math.min(...list.map((i) => i.sortOrder)),
    });
  }

  groups.sort((a, b) => a.sortOrder - b.sortOrder);
  return groups;
}
