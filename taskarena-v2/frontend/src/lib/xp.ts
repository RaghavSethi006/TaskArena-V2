export const XP_THRESHOLDS = [0, 100, 250, 500, 850, 1300, 1900, 2700, 3700, 5000]

export function getLevel(xp: number): number {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (xp >= XP_THRESHOLDS[i]) return i + 1
  }
  return 1
}

export function getNextThreshold(level: number): number {
  return level <= 9 ? XP_THRESHOLDS[level] : XP_THRESHOLDS[9] + (level - 9) * 700
}

export function getPrevThreshold(level: number): number {
  return XP_THRESHOLDS[Math.max(0, level - 1)] ?? 0
}

export function getLevelProgress(xp: number): { level: number; progress: number; xpToNext: number } {
  const level = getLevel(xp)
  const prev = getPrevThreshold(level)
  const next = getNextThreshold(level)
  const progress = Math.min(100, ((xp - prev) / Math.max(1, next - prev)) * 100)
  const xpToNext = Math.max(0, next - xp)
  return { level, progress, xpToNext }
}
