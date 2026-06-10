// src/lib/infrastructure/adapters/mock/mock-internal-rpc.adapter.ts
// Echo-style RPC for the Vercel-only deployment where service-to-service calls
// are stubbed out. setForceFail toggles ExternalServiceError responses.

import { injectable } from 'tsyringe'
import type { InternalRpcPort } from '../../../application/ports/internal-rpc.port'
import { ok, err, type Result } from '../../../application/result'
import { ExternalServiceError } from '../../../domain/errors'

@injectable()
export class MockInternalRpcAdapter implements InternalRpcPort {
  private forceFail = false

  setForceFail(v: boolean): void {
    this.forceFail = v
  }

  async call<TReq, TRes>(input: {
    service: string
    method: string
    payload: TReq
  }): Promise<Result<TRes, ExternalServiceError>> {
    if (this.forceFail) {
      return err(new ExternalServiceError(input.service, new Error('forced')))
    }
    return ok(input.payload as unknown as TRes)
  }
}
