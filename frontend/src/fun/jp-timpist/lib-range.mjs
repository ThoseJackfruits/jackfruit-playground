export class Range {
  #start;
  #end;
  #step;

  constructor(start, end, step=1) {
    if (step === 0)
      throw new Error('Step cannot be zero');
    if (start > end && step > 0)
      throw new Error('Start cannot be greater than end when step is positive');
    if (start < end && step < 0)
      throw new Error('Start cannot be less than end when step is negative');
    this.#start = start;
    this.#end = end;
    this.#step = step;
  }

  *[Symbol.iterator]() {
    for (let value = this.#start; value <= this.#end; value += this.#step) {
      yield value;
    }
  }
}
