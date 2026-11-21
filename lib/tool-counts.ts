// Keep these counts aligned with tools that are currently active and usable.
// Coming Soon tools must not be included.
export const TOOL_COUNTS = {
  field: 5,
  documents: 8,
  images: 1,
} as const;

export const ACTIVE_TOOLS_COUNT = Object.values(TOOL_COUNTS).reduce(
  (total, count) => total + count,
  0,
);
