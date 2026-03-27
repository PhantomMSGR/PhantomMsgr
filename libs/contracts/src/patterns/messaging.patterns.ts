export const MESSAGING_PATTERNS = {
  SEND:             { cmd: 'messaging.send' },
  EDIT:             { cmd: 'messaging.edit' },
  DELETE:           { cmd: 'messaging.delete' },
  GET_HISTORY:      { cmd: 'messaging.history' },
  GET_BY_ID:        { cmd: 'messaging.getById' },

  ADD_REACTION:     { cmd: 'messaging.reaction.add' },
  REMOVE_REACTION:  { cmd: 'messaging.reaction.remove' },

  MARK_READ:        { cmd: 'messaging.read.mark' },

  SEND_POLL:        { cmd: 'messaging.poll.send' },
  VOTE_POLL:        { cmd: 'messaging.poll.vote' },

  PIN:              { cmd: 'messaging.pin' },
  UNPIN:            { cmd: 'messaging.unpin' },
  GET_PINNED:       { cmd: 'messaging.pinned.list' },
} as const
