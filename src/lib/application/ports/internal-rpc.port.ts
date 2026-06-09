// src/lib/application/ports/internal-rpc.port.ts
// InternalRpcPort — abstracts service-to-service RPC for the VPS deployment
// where multiple processes communicate over HTTP/grpc-like channels.
// Vercel-only deployments use a mock implementation.

import type { Result } from '../result'
import type { ExternalServiceError } from '../../domain/errors'

export interface InternalRpcPort {
  call<TReq, TRes>(input: {
    service: string
    method: string
    payload: TReq
  }): Promise<Result<TRes, ExternalServiceError>>
}
