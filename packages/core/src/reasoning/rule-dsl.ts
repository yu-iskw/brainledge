interface RuleClause {
  readonly predicate: string;
  readonly args: readonly string[];
}

interface SafeRule {
  readonly name: string;
  readonly when: readonly RuleClause[];
  readonly then: RuleClause;
}

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/u;
const MAX_RULE_SOURCE = 4096;

export function parseRuleDsl(source: string): SafeRule {
  if (source.length > MAX_RULE_SOURCE) {
    throw new Error('RULE_DSL_INVALID');
  }
  const trimmed = source.trim();
  if (!trimmed.startsWith('rule ')) {
    throw new Error('RULE_DSL_INVALID');
  }
  const afterRule = trimmed.slice('rule '.length);
  const colon = afterRule.indexOf(':');
  if (colon <= 0) {
    throw new Error('RULE_DSL_INVALID');
  }
  const name = afterRule.slice(0, colon).trim();
  const body = afterRule.slice(colon + 1);
  const arrow = body.indexOf('=>');
  if (arrow < 0 || name.length === 0) {
    throw new Error('RULE_DSL_INVALID');
  }
  const whenRaw = body.slice(0, arrow).trim();
  const thenRaw = body.slice(arrow + 2).trim();
  if (whenRaw.length === 0 || thenRaw.length === 0 || !IDENT.test(name)) {
    throw new Error('RULE_DSL_INVALID');
  }
  if (trimmed.includes('eval(') || trimmed.includes('Function(') || trimmed.includes('=> {')) {
    throw new Error('RULE_DSL_UNSAFE');
  }
  return {
    name,
    when: splitAndClauses(whenRaw).map(parseClause),
    then: parseClause(thenRaw),
  };
}

function splitAndClauses(whenRaw: string): readonly string[] {
  const parts: string[] = [];
  let remaining = whenRaw;
  const separator = ' and ';
  while (remaining.length > 0) {
    const index = remaining.indexOf(separator);
    if (index < 0) {
      parts.push(remaining.trim());
      break;
    }
    parts.push(remaining.slice(0, index).trim());
    remaining = remaining.slice(index + separator.length);
  }
  return parts.filter((part) => part.length > 0);
}

function parseClause(raw: string): RuleClause {
  const trimmed = raw.trim();
  const open = trimmed.indexOf('(');
  const close = trimmed.lastIndexOf(')');
  if (open <= 0 || close !== trimmed.length - 1 || close <= open) {
    throw new Error('RULE_DSL_CLAUSE');
  }
  const predicate = trimmed.slice(0, open);
  const argsRaw = trimmed.slice(open + 1, close);
  const args = splitCommaArgs(argsRaw);
  if (!IDENT.test(predicate) || args.some((arg) => !IDENT.test(arg) && !isQuotedArg(arg))) {
    throw new Error('RULE_DSL_IDENT');
  }
  return { predicate, args };
}

function splitCommaArgs(argsRaw: string): readonly string[] {
  return argsRaw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function isQuotedArg(arg: string): boolean {
  return (
    arg.startsWith('"') && arg.endsWith('"') && arg.length >= 2 && !arg.slice(1, -1).includes('"')
  );
}
