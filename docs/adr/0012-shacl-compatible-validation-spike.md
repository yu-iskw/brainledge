# ADR 0012: SHACL-compatible validation spike

## Status

Accepted (spike)

## Context

P1-012 requires a SHACL-compatible validation path without making RDF the memory API.

## Decision

Validate facts with a SHACL-shaped subset: closed predicate lists and datatype checks in TypeScript (`validateFactsAgainstOntology`). A future adapter may emit SHACL shapes from the same ontology registry. Memory APIs stay typed triples.

## Consequences

Standalone never requires a SHACL engine. Ontology violations fail closed in `validateFactsAgainstOntology`.
