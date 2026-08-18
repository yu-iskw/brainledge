import { findContradictoryPairs } from '@brainledge/core';

import { assertWorkspaceScope } from '../scope.js';

import type { Entity, EntityAlias, EntityRepository, Fact, FactRepository } from '@brainledge/core';

export function createInMemoryFactRepository(facts: Fact[] = []): FactRepository {
  return {
    async insert({ workspaceId, fact }) {
      assertWorkspaceScope(fact.workspaceId, workspaceId);
      facts.push(fact);
      return Promise.resolve();
    },
    async upsert({ workspaceId, fact }) {
      assertWorkspaceScope(fact.workspaceId, workspaceId);
      const index = facts.findIndex((item) => item.id === fact.id);
      if (index >= 0) {
        facts[index] = fact;
      } else {
        facts.push(fact);
      }
      return Promise.resolve();
    },
    findById({ workspaceId, factId }) {
      return Promise.resolve(
        facts.find((item) => item.workspaceId === workspaceId && item.id === factId),
      );
    },
    query({ workspaceId, knowledgeSpaceId, asOf, limit }) {
      return Promise.resolve(
        facts
          .filter(
            (item) =>
              item.workspaceId === workspaceId &&
              item.knowledgeSpaceId === knowledgeSpaceId &&
              (asOf === undefined
                ? item.retractedAt === undefined
                : item.assertedAt <= asOf &&
                  (item.retractedAt === undefined || item.retractedAt > asOf)),
          )
          .slice(0, limit),
      );
    },
    findContradictions({ workspaceId, knowledgeSpaceId }) {
      const scoped = facts.filter(
        (item) => item.workspaceId === workspaceId && item.knowledgeSpaceId === knowledgeSpaceId,
      );
      return Promise.resolve(findContradictoryPairs(scoped));
    },
  };
}

export function createInMemoryEntityRepository(
  entities: Entity[] = [],
  aliases: EntityAlias[] = [],
): EntityRepository {
  return {
    async insert({ workspaceId, entity }) {
      assertWorkspaceScope(entity.workspaceId, workspaceId);
      entities.push(entity);
      return Promise.resolve();
    },
    findById({ workspaceId, entityId }) {
      return Promise.resolve(
        entities.find((item) => item.workspaceId === workspaceId && item.id === entityId),
      );
    },
    findByAlias({ workspaceId, knowledgeSpaceId, normalizedValue }) {
      const alias = aliases.find((item) => item.normalizedValue === normalizedValue);
      if (alias === undefined) {
        return Promise.resolve(
          entities.find(
            (item) =>
              item.workspaceId === workspaceId &&
              item.knowledgeSpaceId === knowledgeSpaceId &&
              item.canonicalName.toLowerCase() === normalizedValue,
          ),
        );
      }
      return Promise.resolve(
        entities.find((item) => item.workspaceId === workspaceId && item.id === alias.entityId),
      );
    },
    addAlias({ alias }) {
      aliases.push(alias);
      return Promise.resolve();
    },
    list({ workspaceId, knowledgeSpaceId }) {
      return Promise.resolve(
        entities.filter(
          (item) => item.workspaceId === workspaceId && item.knowledgeSpaceId === knowledgeSpaceId,
        ),
      );
    },
  };
}
