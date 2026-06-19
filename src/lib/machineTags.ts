export const MACHINE_TAG_OPTIONS = [
  { id: "open_24h", label: "24時間" },
  { id: "cash_only", label: "現金のみ" },
  { id: "cash", label: "現金対応" },
  { id: "qr", label: "QR決済可" },
  { id: "ic", label: "交通系IC可" },
  { id: "new_coin", label: "新500円玉対応" },
  { id: "trash", label: "ゴミ箱あり" },
  { id: "roof", label: "屋根あり" },
  { id: "bright", label: "夜でも明るい" },
  { id: "parking", label: "駐車しやすい" },
  { id: "rare", label: "珍しい商品あり" },
] as const;

export type MachineTagId = (typeof MACHINE_TAG_OPTIONS)[number]["id"];

const tagLabels = new Map<MachineTagId, string>(
  MACHINE_TAG_OPTIONS.map((option) => [option.id, option.label])
);
const tagIdsByLabel = new Map<string, MachineTagId>(
  MACHINE_TAG_OPTIONS.map((option) => [option.label, option.id])
);

export function parseMachineItems(items: string | undefined): {
  memo: string;
  tagIds: MachineTagId[];
  tagLabels: string[];
} {
  const lines = (items ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const tagLine = lines.find((line) => line.startsWith("タグ:"));
  const tagIds = tagLine
    ? tagLine
        .replace(/^タグ:\s*/, "")
        .split(",")
        .map((label) => tagIdsByLabel.get(label.trim()))
        .filter((id): id is MachineTagId => Boolean(id))
    : [];
  const memoLines = lines
    .filter((line) => !line.startsWith("タグ:"))
    .map((line) => line.replace(/^メモ:\s*/, ""));

  return {
    memo: memoLines.join("\n"),
    tagIds,
    tagLabels: tagIds.map((id) => tagLabels.get(id) ?? id),
  };
}

export function formatMachineItems(tagIds: MachineTagId[], memo: string): string {
  const uniqueTagIds = Array.from(new Set(tagIds));
  const labels = uniqueTagIds
    .map((id) => tagLabels.get(id))
    .filter((label): label is string => Boolean(label));
  const parts = [];

  if (labels.length > 0) {
    parts.push(`タグ: ${labels.join(", ")}`);
  }

  const trimmedMemo = memo.trim();
  if (trimmedMemo) {
    parts.push(`メモ: ${trimmedMemo}`);
  }

  return parts.join("\n");
}
