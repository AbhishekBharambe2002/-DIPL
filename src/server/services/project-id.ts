import { Project } from "@/server/models/project";

const MONTH_LETTERS = "ABCDEFGHIJKL"; // Jan = A … Dec = L

/**
 * Auto-generates a project ID like "DIPL-C04-12":
 *   C   → month letter (A = January … L = December)
 *   04  → day of month, zero-padded
 *   12  → the Nth project created that calendar day
 *
 * Retries on a rare unique-index collision (two requests in the same day
 * reading the same count before either insert completes).
 */
export async function generateProjectId(): Promise<string> {
  const now = new Date();
  const monthLetter = MONTH_LETTERS[now.getMonth()];
  const day = String(now.getDate()).padStart(2, "0");

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const prefix = `DIPL-${monthLetter}${day}-`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const countToday = await Project.countDocuments({
      createdAt: { $gte: startOfDay, $lt: endOfDay },
    });
    const candidate = `${prefix}${countToday + 1 + attempt}`;
    const exists = await Project.exists({ projectId: candidate });
    if (!exists) return candidate;
  }

  // Extremely unlikely fallback: append a timestamp fragment to guarantee uniqueness.
  return `${prefix}${Date.now().toString().slice(-4)}`;
}
