export const STATES = Object.freeze({
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game-over',
});

export const STATE_TRANSITIONS = Object.freeze({
  [STATES.PLAYING]:   [ STATES.GAME_OVER, STATES.PAUSED ],
  [STATES.PAUSED]:    [ STATES.PLAYING ],
  [STATES.GAME_OVER]: [ STATES.PLAYING ],
});

export const DIRECTION = Object.freeze({
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right'
});

export const ROTATION = Object.freeze({
  CLOCKWISE: 'clockwise',
  COUNTERCLOCKWISE: 'counterclockwise'
});
