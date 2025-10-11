import { Range } from './util/range.mjs';

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
  RANDOM:     'random',
});

export const PLACEMENT_FN = Object.freeze({
  distribute(laneCount, totalCount, avoid) {
    if (totalCount > laneCount)
      throw new Error('Too many enemies for the stage');
    let filledLanes = Array.from({ length: laneCount }, () => null);

    if (avoid) {
      for (let index of avoid) {
        filledLanes[index] = true;
      }
    }

    return function * distributePlacement() {
      let start = Math.floor(Math.random() * filledLanes.length);
      let direction = Math.random() > 0.5 ? 1 : -1;
      let step = Math.max(1, Math.round(laneCount / totalCount));

      for (let index of new Range(0, totalCount))
        if (!filledLanes[index])
          yield (start + index*step*direction) % laneCount;
    }
  },
  random(laneCount, totalCount, avoid) {
    if (totalCount > laneCount)
      throw new Error('Too many enemies for the stage');
    let filledLanes = Array.from({ length: laneCount }, () => null);
    let filledCount = 0;

    if (avoid) {
      for (let index of avoid) {
        filledLanes[index] = true;
      }
    }

    return function * randomPlacement() {
      let start, direction, foundEmpty;

      while (filledCount < totalCount) {
        start = Math.floor(Math.random() * filledLanes.length);
        direction = Math.random() > 0.5 ? 1 : -1;
        foundEmpty = false;

        // Start at a random point, and move in a random direction until an empty slot is found
        for (let i = start; i != start - direction; i = (i + direction) % laneCount) {
          if (filledLanes[i] != null)
            continue;
          filledLanes[i] = true;
          filledCount++;
          foundEmpty = true;
          yield i;
          break;
        }

        if (!foundEmpty)
          break;
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
    duration: 500
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
