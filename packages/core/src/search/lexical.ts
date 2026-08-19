const TOKEN_SPLIT = /\W+/u;
const MIN_TOKEN_LENGTH = 3;

export function lexicalTokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(TOKEN_SPLIT)
    .filter((token) => token.length >= MIN_TOKEN_LENGTH);
}
