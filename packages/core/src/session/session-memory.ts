import type { Episode } from '../knowledge/episode.js';

export function sessionEpisodes(
  episodes: readonly Episode[],
  sessionId: string,
): readonly Episode[] {
  return episodes.filter((episode) => episode.metadata.sessionId === sessionId);
}
