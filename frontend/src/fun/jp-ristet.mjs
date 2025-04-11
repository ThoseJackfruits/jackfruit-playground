import { css, LitElement, html } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

const COLUMNS = 8;
const ROWS = 16;

const PIECES = Object.freeze({
  I: {
    shape: [
      [ 1, 1, 1, 1 ],
    ],
    width: 4,
    height: 1
  },
  J: {
    shape: [
      [ 1, 0, 0 ],
      [ 1, 1, 1 ]
    ],
    width: 3,
    height: 2
  },
  L: {
    shape: [
      [ 0, 0, 1 ],
      [ 1, 1, 1 ]
    ],
    width: 3,
    height: 2
  },
  O: {
    shape: [
      [ 1, 1 ],
      [ 1, 1 ]
    ],
    width: 2,
    height: 2
  },
  S: {
    shape: [
      [ 0, 1, 1 ],
      [ 1, 1, 0 ]
    ],
    width: 3,
    height: 2
  },
  Z: {
    shape: [
      [ 1, 1, 0 ],
      [ 0, 1, 1 ]
    ],
    width: 3,
    height: 2
  }
});

const STATES = Object.freeze({
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game-over',
});

const STATE_TRANSITIONS = Object.freeze({
  [STATES.PLAYING]:   [ STATES.GAME_OVER, STATES.PAUSED ],
  [STATES.PAUSED]:    [ STATES.PLAYING ],
  [STATES.GAME_OVER]: [ STATES.PLAYING ],
});

class JPRistetElement extends LitElement {
  static properties = {
    currentPiece:  { state: true },
    previewPiece:  { state: true },
    gameState:     { state: true },
    gameStateData: { state: true },
  };

  static styles = css`
    :host {
      display: grid;
      gap: calc(var(--jp-common-padding) / 2);
      grid-template:
        " header preview " auto
        " grid   grid    " 1fr
        / auto   auto;
      padding: var(--jp-common-padding) var(--jp-common-padding);
      border: var(--jp-common-border-width) solid var(--jp-color-accent);
      border-radius: var(--jp-common-border-radius);
      overflow: hidden;
    }

    h2 {
      grid-area: header;
      margin: 0;
    }

    #grid {
      display: grid;
      gap: 2px;
      grid-area: grid;
      grid-template-columns: repeat(${ COLUMNS }, 1fr);
      grid-template-rows: repeat(${ ROWS }, 1fr);
      max-width: 100%;
      max-height: 100%;
      aspect-ratio: ${ COLUMNS } / ${ ROWS };
      align-items: start;
      justify-items: start;
    }

    #preview {
      grid-area: preview;
      display: grid;
      gap: 2px;
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows:    repeat(3, 1fr);
      justify-self: end;
      aspect-ratio: 4 / 3;
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

    .grid-cell.on {
      background-color: var(--jp-color-accent);
    }

    .grid-cell.on.I {
      background-color: #8B8;
    }

    .grid-cell.on.J {
      background-color: #8BB;
    }

    .grid-cell.on.L {
      background-color: #B8B;
    }

    .grid-cell.on.O {
      background-color: #B88;
    }

    .grid-cell.on.S {
      background-color: #8B8;
    }

    .grid-cell.on.Z {
      background-color: #88B;
    }

    .grid-cell.off {
      background-color: transparent;
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

    @media (prefers-color-scheme: dark) {
      .grid-cell.on.I {
        background-color: #FFB;
      }

      .grid-cell.on.J {
        background-color: #BFF;
      }

      .grid-cell.on.L {
        background-color: #FBF;
      }

      .grid-cell.on.O {
        background-color: #FBB;
      }

      .grid-cell.on.S {
        background-color: #BFB;
      }

      .grid-cell.on.Z {
        background-color: #BBF;
      }
    }
  `;

  previewStream = this.getPieceStreamWeighted();
  tickRate = 1000;
  tickTimeout = null;

  // LIFECYCLE /////////////////////////////////////////////////////////////////

  connectedCallback() {
    super.connectedCallback();
    this.gameState = STATES.PAUSED;
    this.gameStateData = {};
    this.addEventListener('click', this.handleClick);
    this.addEventListener('keydown', this.handleKeyDown);
    this.setAttribute('tabindex', '0');
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('keydown', this.handleKeyDown);
    this.tickTimeout &&= clearTimeout(this.tickTimeout);
    super.disconnectedCallback();
  }

  shouldUpdate(changes) {
    let gameStateChanged = changes.has('gameState');
    let gameStateDataChanged = changes.has('gameStateData');

    if (gameStateChanged !== gameStateDataChanged) {
      console.error('gameState and gameStateData must be updated together', {
        gameStateChanged,
        gameStateDataChanged,
        gameState: changes.get('gameState'),
        gameStateData: changes.get('gameStateData')
      });
    }

    if (gameStateChanged) {
      let oldGameState = changes.get('gameState');
      let oldGameStateData = changes.get('gameStateData');
      let invalidTransition =
        oldGameState &&
        !STATE_TRANSITIONS[oldGameState].includes(this.gameState);

      if (invalidTransition) {
        debugger;
        console.error(
          `Invalid state transition: ${ oldGameState } → ${ this.gameState }`,
          {
            dataNew: this.gameStateData,
            dataOld: oldGameStateData
          }
        );
      }

      this.handleStateChangeStart(oldGameState, oldGameStateData);
    }

    return super.shouldUpdate(changes);
  }

  updated(changes) {
    if (changes.has('gameState')) {
      this.handleStateChanged(
        changes.get('gameState'),
        changes.get('gameStateData')
      );
    }
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
          end = 1 / (uses / totalUses);
        else
          end += 1 / (uses / totalUses);
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

  movementSimulate(direction) {
    return {
      direction,
      distance: 1,
    };
  }

  scheduleNextTick() {
    this.tickTimeout = setTimeout(() => {
      try {
        this.tick();
      } finally {
        this.scheduleNextTick();
      }
    }, this.tickRate);
  }

  tick() {
    console.log('[ristet] tick');
    let [ name, piece ] = this.previewStream.next().value;
    this.previewPiece = { name, ...piece };
  }

  // EVENT HANDLERS ////////////////////////////////////////////////////////////

  handleClick(event) {
    this.focus();
  }

  handleKeyDown(event) {
    switch (this.gameState) {
      case STATES.PAUSED:
        switch (event.key) {
          case ' ':
            event.preventDefault();
            this.gameState = STATES.PLAYING;
            this.gameStateData = this.gameStateData?.resumeData ?? {};
            break;
        }
        break;
      case STATES.PLAYING:
        switch (event.key) {
          case ' ':
            event.preventDefault();
            this.gameState = STATES.PAUSED;
            this.gameStateData = { resumeData: this.gameStateData };
            break;
        }
    }
  }

  handleStateChanged(oldGameState, oldGameStateData) {
    console.log('[ristet] statechanged', oldGameState, '→', this.gameState);

    switch (this.gameState) {
      case STATES.PLAYING:
        this.scheduleNextTick();
        break;
      case STATES.PAUSED:
        debugger;
        this.tickTimeout &&= clearTimeout(this.tickTimeout);
        break;
    }
  }

  handleStateChangeStart(oldGameState, oldGameStateData) {
    console.log('[ristet] statechangestart', oldGameState, '→', this.gameState);
  }

  // RENDER ////////////////////////////////////////////////////////////////////

  render() {
    return html`
      <h2>Ristet</h2>
      ${ this.renderPreview() }
      <div id="grid">
        ${ repeat(
          this.griderator(),
          i => i,
          i => {
            let x = i % COLUMNS;
            let y = Math.floor(i / COLUMNS);
            return this.renderCell(x, y, i);
          }
        ) }
      </div>
    `;
  }

  renderCell(x, y, i) {
    return html`
      <div class="grid-cell c${ (i % 3) + 1}">
        ${ x.toString().padStart(2, '0') }
        <br/>
        ${ y.toString().padStart(2, '0') }
      </div>
    `;
  }

  renderPreview() {
    let { previewPiece } = this;

    if (!previewPiece) {
      return '';
    }

    return html`
      <div id="preview">
        ${ repeat(
          previewPiece.shape,
          (_, i) => i,
          (row, y) => this.renderPreviewRow(previewPiece, row, y)
        ) }
      </div>
    `;
  }

  renderPreviewRow(previewPiece, row, y) {
    return html`
      ${ repeat(
        padArray(row, 0, 4),
        (_, x) => x,
        (cell, x) => this.renderPreviewCell(previewPiece, cell, x, y)
      ) }
    `;
  }

  renderPreviewCell(previewPiece, cell, x, y) {
    return html`
      <div
        class="grid-cell ${ cell ? 'on' : 'off' } ${ previewPiece.name }"
        style="grid-column: ${ x + 1 }; grid-row: ${ y + 1 };"
      >
      </div>
    `;
  }
}

customElements.define('jp-ristet', JPRistetElement);

function * padArray(arr, padValue, length) {
  for (let i = 0; i < length - arr.length; i++) {
    yield padValue;
  }
  yield * arr;
}
