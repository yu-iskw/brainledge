import { assertListenPolicy } from './http/listen-policy.js';

export { createHttpApp, openApiDocument, REQUIRED_OPENAPI_PATHS } from './http/app.js';
export type { CreateHttpAppOptions } from './http/app.js';
export { resolveServerDataDir } from './data-dir.js';
export { handleMcpJsonRpc } from './mcp/jsonrpc.js';
export { assertListenPolicy } from './http/listen-policy.js';
export {
  createBrainledgeMcpHandler,
  createStdioMcpFacade,
  parseMcpProfiles,
} from './mcp/server.js';
export { MCP_PROTOCOL_VERSION } from './mcp/protocol.js';
export { validateOidcClaims, mapOidcSubjectToPrincipal, verifyJwtHeader } from './auth/oidc.js';

export function defaultListenHost(): string {
  return process.env.BRAINLEDGE_HOST ?? '127.0.0.1';
}

export function defaultListenPort(): number {
  return Number(process.env.BRAINLEDGE_PORT ?? '8787');
}

export function prepareListen(): void {
  assertListenPolicy({
    host: defaultListenHost(),
    port: defaultListenPort(),
    allowNonLoopbackWithoutAuth: process.env.BRAINLEDGE_UNSAFE_BIND === '1',
  });
}
