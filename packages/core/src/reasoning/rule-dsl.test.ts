import { describe, expect, it } from 'vitest';

import { parseRuleDsl } from './rule-dsl.js';

describe('parseRuleDsl', () => {
  it('parses a valid rule with and-clauses', () => {
    const rule = parseRuleDsl('rule lives: person(Alice) and city(Tokyo) => livesIn(Alice, Tokyo)');
    expect(rule).toEqual({
      name: 'lives',
      when: [
        { predicate: 'person', args: ['Alice'] },
        { predicate: 'city', args: ['Tokyo'] },
      ],
      then: { predicate: 'livesIn', args: ['Alice', 'Tokyo'] },
    });
  });

  it('throws RULE_DSL_INVALID for malformed sources', () => {
    expect(() => parseRuleDsl('lives: person(Alice) => livesIn(Alice)')).toThrow(
      'RULE_DSL_INVALID',
    );
    expect(() => parseRuleDsl('rule : person(Alice) => livesIn(Alice)')).toThrow(
      'RULE_DSL_INVALID',
    );
    expect(() => parseRuleDsl('rule lives person(Alice) => livesIn(Alice)')).toThrow(
      'RULE_DSL_INVALID',
    );
    expect(() => parseRuleDsl(`rule x: foo(a) => bar(a)${'y'.repeat(4096)}`)).toThrow(
      'RULE_DSL_INVALID',
    );
  });

  it('throws RULE_DSL_UNSAFE when the source contains eval()', () => {
    expect(() => parseRuleDsl('rule x: eval(1) => boom(x)')).toThrow('RULE_DSL_UNSAFE');
    expect(() => parseRuleDsl('rule x: Function(1) => boom(x)')).toThrow('RULE_DSL_UNSAFE');
    expect(() => parseRuleDsl('rule x: foo(a) => { bar(a)')).toThrow('RULE_DSL_UNSAFE');
  });

  it('throws RULE_DSL_CLAUSE when a clause lacks parentheses', () => {
    expect(() => parseRuleDsl('rule x: incomplete => boom(x)')).toThrow('RULE_DSL_CLAUSE');
    expect(() => parseRuleDsl('rule x: foo(a) => incomplete')).toThrow('RULE_DSL_CLAUSE');
  });
});
