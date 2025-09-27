export function avg2(a, b) {
  return (a + b) / 2;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function * pairs(iterable) {
  let iterator = iterable[Symbol.iterator]();
  let { value: first, done } = iterator.next();
  if (done) {
    return;
  }

  let veryFirst = first;
  let veryLast;

  let { value: second, done: secondDone } = iterator.next();
  while (!secondDone) {
    if (second)
      veryLast = second;
    yield [ first, second ];
    first = second;
    ({ value: second, done: secondDone } = iterator.next());
  }

  if (veryFirst && veryLast) {
    yield [ veryLast, veryFirst ];
  }
}

export async function timePassage(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

export function * zip(iterables) {
  const iterators = iterables.map(iterable => iterable[Symbol.iterator]());
  while (true) {
    const values = iterators.map(iterator => iterator.next());
    if (values.some(({ done }) => done)) {
      return;
    }
    yield values.map(({ value }) => value);
  }
}
