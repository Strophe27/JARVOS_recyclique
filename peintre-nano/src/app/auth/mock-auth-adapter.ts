import type { ContextEnvelopeStub } from '../../types/context-envelope';
import type { AuthContextPort, AuthSessionState } from './auth-context-port';

export type MockAuthAdapterOptions = {
  readonly session: AuthSessionState;
  readonly envelope: ContextEnvelopeStub;
};

/** Piste A : données typées pour tests et démo ; remplacement par client réel derrière le même port. */
export function createMockAuthAdapter(options: MockAuthAdapterOptions): AuthContextPort {
  const session = options.session;
  const envelope = options.envelope;
  return {
    getSession: () => session,
    getContextEnvelope: () => envelope,
  };
}
