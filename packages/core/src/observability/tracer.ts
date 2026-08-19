interface Span {
  readonly name: string;
  end(): void;
}

interface TracerPort {
  startSpan(name: string): Span;
}

export function createNoopTracer(): TracerPort {
  return {
    startSpan(name) {
      return { name, end() {} };
    },
  };
}
