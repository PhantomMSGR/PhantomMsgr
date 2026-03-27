export const AUTH_PATTERNS = {
  REGISTER:        { cmd: 'auth.register' },
  LOGIN:           { cmd: 'auth.login' },
  REFRESH:         { cmd: 'auth.refresh' },
  LOGOUT:          { cmd: 'auth.logout' },
  RECOVER:         { cmd: 'auth.recover' },
  VERIFY_2FA:      { cmd: 'auth.2fa.verify' },
  VALIDATE_TOKEN:  { cmd: 'auth.token.validate' },
  GET_SESSIONS:    { cmd: 'auth.sessions.list' },
  REVOKE_SESSION:  { cmd: 'auth.session.revoke' },
} as const
