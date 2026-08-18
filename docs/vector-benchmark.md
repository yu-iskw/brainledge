# Exact cosine vector search benchmark note (P1-006)

Measured on 2026-08-18 against the in-process `exactVectorSearch` helper (pure JS cosine).

| Corpus size | p50 scan                 | Notes                       |
| ----------- | ------------------------ | --------------------------- |
| 1_000       | < 5ms                    | fine for laptop             |
| 10_000      | documented soft limit    | keep default SQL scan       |
| 100_000     | do not enable by default | native ANN adapter required |

Recall remains lexical if embeddings are disabled or the provider is absent.
