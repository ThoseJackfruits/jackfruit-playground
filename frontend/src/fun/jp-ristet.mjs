import { css, LitElement, html } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

const COLUMNS = 8;
const ROWS = 16;

const PIECES = Object.freeze({
  I: {
    shape: [
      [ 1, 1, 1, 1 ],
    ]
  },
  J: {
    shape: [
      [ 0, 1, 1 ],
      [ 0, 1, 0 ],
      [ 1, 1, 0 ]
    ]
  },
  L: {
    shape: [
      [ 0, 1, 1 ],
      [ 0, 1, 0 ],
      [ 1, 1, 0 ]
    ]
  },
  O: {
    shape: [
      [ 1, 1 ],
      [ 1, 1 ]
    ]
  },
  S: {
    shape: [
      [ 1, 1, 1 ],
      [ 0, 1, 0 ]
    ]
  },
  Z: {
    shape: [
      [ 1, 1, 0 ],
      [ 0, 1, 1 ]
    ]
  }
});

class JPRistetElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      padding: 0 var(--jp-common-padding) var(--jp-common-padding);
      border: var(--jp-common-border-width) solid var(--jp-color-accent);
      border-radius: var(--jp-common-border-radius);
      overflow: hidden;
    }

    #ristet {
      display: grid;
      gap: 2px;
      grid-template-columns: repeat(${ COLUMNS }, 1fr);
      grid-template-rows: repeat(${ ROWS }, 1fr);
      max-width: 100%;
      max-height: 100%;
      aspect-ratio: ${ COLUMNS } / ${ ROWS };
      align-items: start;
      justify-items: start;
    }

    .grid-cell {
      width: 100%;
      height: 100%;
      align-content: center;
      justify-content: center;
      text-align: center;
    }

    .grid-cell.c1 {
      background-color: darkblue;
    }

    .grid-cell.c2 {
      background-color: darkgreen;
    }

    .grid-cell.c3 {
      background-color: darkred;
    }
  `;

  pieceStream = this.getPieceStreamWeighted();
  tickRate = 1000;

  // LIFECYCLE /////////////////////////////////////////////////////////////////

  connectedCallback() {
    super.connectedCallback();
    this.scheduleNextTick();
  }

  disconnectedCallback() {
    this.tickInterval &&= clearInterval(this.tickInterval);
  }

  // API ///////////////////////////////////////////////////////////////////////

  * griderator() {
    for (let i = 0; i < COLUMNS * ROWS; i++)
      yield i;
  }

  /**
   * Generates a stream of randomly-selected pieces, weighted by usage.
   * @returns {IterableIterator<[string, object]>}
   */
  * getPieceStreamWeighted() {
    let pieceUsages =
      Object.fromEntries(Object.keys(PIECES).map((name) => ([ name, 1 ])));

    for (let piecesPicked = 0; '⏏'; piecesPicked++) {
      let totalUses = Object.values(pieceUsages).reduce((a, b) => a + b, 0);
      let end;
      let ranges = Object.entries(pieceUsages).reduce((a, [ name, uses ]) => {
        if (!end)
          end = uses / totalUses;
        else
          end += uses / totalUses;
        a.push({ name, end });
        return a;
      }, []);
      let point = Math.random() * totalUses;
      let { name } = ranges.find(({ end }) => point < end) ?? ranges.at(-1);
      let piece = PIECES[name];
      pieceUsages[name]++;
      yield [ name, piece ];
    }
  }

  scheduleNextTick() {
    this.tickTimeout = setTimeout(() => {
      try {
        this.tick();
      } finally {
        this.tickTimeout = this.scheduleNextTick();
      }
    }, this.tickRate);
  }

  tick() {
    let [ name, piece ] = this.pieceStream.next().value;
  }

  // RENDER ////////////////////////////////////////////////////////////////////

  render() {
    return html`
      <h2>Ristet</h2>
      <div id="ristet">
        ${ repeat(
          this.griderator(),
          i => i,
          (i) => {
            let x = i % COLUMNS;
            let y = Math.floor(i / COLUMNS);
            return this.renderCell(x, y, i);
          }
        ) }
      </div>
    `;
  }

  renderCell(x, y, i) {
    console.log(x, y, i);
    return html`
      <div class="grid-cell c${ (i % 3) + 1}">
        ${ x.toString().padStart(2, '0') }
        <br/>
        ${ y.toString().padStart(2, '0') }
      </div>
    `;
  }
}

customElements.define('jp-ristet', JPRistetElement);
