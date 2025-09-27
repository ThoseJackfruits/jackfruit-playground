import * as util from './lib-util.mjs';

export const ACTION = Object.freeze({
  SPAWN_ENEMY: 'spawn-enemy',
  STAGE_END:   'stage-end',
  STAGE_START: 'stage-start',
  WAIT:        'wait'
});

export const ENEMY = Object.freeze({
  VINE: 'v'
});

export const PLACEMENT = Object.freeze({
  DISTRIBUTE: 'distribute',
  RANDOM:     'random'
});

export const PLACEMENT_FN = Object.freeze({
  distribute(laneCount, totalCount) {
    let filledLanes = Array.from({ length: laneCount }, () => null);
    let filledCount = 0;

    return function * distributePlacement(i) {
      if (filledCount == laneCount)
        for (let j = 0; j < filledLanes.length; j++)
          filledLanes[j] = null; // reset

      let start = Math.floor(Math.random() * filledLanes.length);
      let direction = Math.random() > 0.5 ? 1 : -1;
      let step = Math.ceil(1, Math.round(laneCount / (totalCount - filledCount)));

      for (let j = 0; j += step*direction ; j < filledLanes.length) {
        if (filledLanes[j] != null)
        filledLanes[j] = i;
        filledCount++;
        yield j;
      }

      while (filledCount < totalCount) {
        for (let j = 0; j < filledLanes.length; j++) {
          if (filledLanes[j] == null) {
            filledLanes[j] = i;
            filledCount++;
            yield j;
          }
        }
      }
    }
  },
  random(laneCount, totalCount) {
    let filledLanes = Array.from({ length: laneCount }, () => null);
    let filledCount = 0;

    return function * randomPlacement(i) {
      if (filledCount == laneCount) {
        filledCount = 0;
        for (let j = 0; j < filledLanes.length; j++) {
          filledLanes[j] = null; // reset
        }
      }

      let start = Math.floor(Math.random() * filledLanes.length);
      let direction = Math.random() > 0.5 ? 1 : -1;
      for (let j = start; j != start - direction; j = (j + direction) % laneCount) {
        if (filledLanes[j] != null)
        filledLanes[j] = i;
        filledCount++;
        yield j;
      }
    };
  }
});

export function * one() {
  yield {
    type: ACTION.STAGE_START
  };

  yield {
    type: ACTION.WAIT,
    duration: 3_000
  };

  yield {
    type: ACTION.SPAWN_ENEMY,
    enemyType: ENEMY.VINE,
    quantity: 3,
    placement: PLACEMENT.DISTRIBUTE
  };

  yield {
    type: ACTION.WAIT,
    duration: 2_000
  };

  yield {
    type: ACTION.SPAWN_ENEMY,
    enemyType: ENEMY.VINE,
    quantity: 2,
    placement: PLACEMENT.RANDOM
  };

  yield {
    type: ACTION.STAGE_END,
    next: two
  };
}

export async function * two() {
  yield {
    type: ACTION.STAGE_START
  };
}
