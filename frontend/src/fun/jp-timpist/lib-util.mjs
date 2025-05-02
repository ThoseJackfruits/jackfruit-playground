export function * pairs(iterable) {
  let iterator = iterable[Symbol.iterator]();
  let { value: first, done } = iterator.next();
  if (done) {
    return;
  }

  let { value: second, done: secondDone } = iterator.next();
  while (!secondDone) {
    yield [ first, second ];
    first = second;
    ({ value: second, done: secondDone } = iterator.next());
  }
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
