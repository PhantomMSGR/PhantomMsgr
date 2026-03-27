export interface JwtPayload {
  /** users.id */
  sub: string
  /** sessions.id — enables per-device revocation */
  sid: string
  iat?: number
  exp?: number
}
