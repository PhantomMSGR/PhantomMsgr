export const STORY_PATTERNS = {
  CREATE:     { cmd: 'story.create' },
  GET_FEED:   { cmd: 'story.feed' },
  GET_BY_USER:{ cmd: 'story.byUser' },
  DELETE:     { cmd: 'story.delete' },
  ARCHIVE:    { cmd: 'story.archive' },
  PIN:        { cmd: 'story.pin' },
  VIEW:       { cmd: 'story.view' },
  GET_VIEWERS:{ cmd: 'story.viewers' },
  REACT:      { cmd: 'story.react' },
} as const
