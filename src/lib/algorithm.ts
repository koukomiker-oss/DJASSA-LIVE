import { VideoPost } from '../types';

/**
 * Ranks videos based on completion rate and shares rather than just recency.
 * Formula: Score = (CompletionRate * 0.6) + (SharesWeight * 0.3) + (RecencyWeight * 0.1)
 */
export function rankVideos(videos: VideoPost[]): VideoPost[] {
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  return [...videos].sort((a, b) => {
    // Normalizing share count (max 100 for scaling)
    const shareScoreA = Math.min(a.shareCount / 100, 1);
    const shareScoreB = Math.min(b.shareCount / 100, 1);

    // Normalizing recency (max 7 days)
    const recencyScoreA = Math.max(0, 1 - (now - a.createdAt) / (ONE_DAY * 7));
    const recencyScoreB = Math.max(0, 1 - (now - b.createdAt) / (ONE_DAY * 7));

    const totalScoreA = (a.completionRate * 0.6) + (shareScoreA * 0.3) + (recencyScoreA * 0.1);
    const totalScoreB = (b.completionRate * 0.6) + (shareScoreB * 0.3) + (recencyScoreB * 0.1);

    return totalScoreB - totalScoreA; // Descending order
  });
}
