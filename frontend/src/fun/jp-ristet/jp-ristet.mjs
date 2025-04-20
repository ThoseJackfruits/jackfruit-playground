import { css, LitElement, html } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { repeat } from 'lit/directives/repeat.js';
import merge from 'lodash-es/merge';

import { STATES, STATE_TRANSITIONS, DIRECTION, ROTATION } from './lib-enum.mjs';
import { getPieceStreamWeighted, pieceHeight, pieceWidth, rotateShape } from './lib-pieces.mjs';

const COLUMNS = 8;
const ROWS = 16;
const CLEAR_LINE_DURATION = 300;

class JPRistetElement extends LitElement {
  static properties = {
    gameState:     {
      attribute: 'game-state',
      reflect: true,
      type: String
    },
    gameData: { state: true },
    tickRate: { attribute: 'tick-rate', reflect: true, type: Number },
    clearedLines: { state: true },
  };

  static styles = css`
    :host {
      background-color: var(--jp-color-bg-0);
      display: grid;
      gap: calc(var(--jp-common-padding) / 2);
      grid-template:
        " header preview " auto
        " grid   grid    " 1fr
        / auto   auto;
      padding: var(--jp-common-padding) var(--jp-common-padding);
      border: var(--jp-common-border-width) solid var(--jp-color-accent);
      border-radius: var(--jp-common-border-radius);
      height: 100%;
      justify-content: center;
      overflow: hidden;
    }

    :host(:fullscreen) #grid {
      max-width: 50vh; /* depends on aspect-ratio */
    }

    #overlay:empty {
      display: none;
      pointer-events: none;
      opacity: 0;
    }

    #overlay {
      grid-area: grid;
      font-size: 1.5em;
      color: var(--jp-color-text);
      display: flex;
      opacity: 1;
      align-items: center;
      justify-content: center;
      max-width: 100%;
      height: 100%;
      z-index: 2;
      transition: opacity 140ms ease-out;
    }

    :host([game-state="paused"]) #grid,
    :host([game-state="game-over"]) #grid {
      filter: blur(6px);
    }

    @media (prefers-color-scheme: dark) {
      :host([game-state="game-over"]) #grid,
      :host([game-state="paused"]) #grid .grid-cell.on {
        filter: brightness(0.5);
      }
    }

    h2 {
      grid-area: header;
      margin: 0;
    }

    kbd {
      all: unset;
      box-shadow:
        0 1px 1px rgba(0, 0, 0, 0.2),
        0 2px 0 0 rgba(255, 255, 255, 0.7) inset;
      border-radius: var(--jp-common-border-radius);
      border: 1px solid var(--jp-color-accent);
      font-family: var(--jp-font-family-mono);
      padding: 0.1em 0.2em;
    }

    #grid {
      display: grid;
      gap: 2px;
      grid-area: grid;
      grid-template-columns: repeat(${ COLUMNS }, 1fr);
      grid-template-rows: repeat(${ ROWS }, 1fr);
      max-width: 40vh; /* depends on aspect-ratio */
      max-height: 100%;
      transition: filter 140ms ease-out;
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
      height: var(--jp-font-size-h2);
    }

    .grid-cell {
      width: 100%;
      height: 100%;
      align-content: center;
      justify-content: center;
      text-align: center;
      transition: filter 140ms ease-out;
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
      background-color: var(--jp-color-bg-4);
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

    .grid-cell.clearing {
      animation: clearLine ${ CLEAR_LINE_DURATION }ms ease-out;
      align-self: end;
      z-index: 1;
      justify-self: end;
    }

    @keyframes clearLine {
      0% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        opacity: 0.2;
      }
      100% {
        transform: scale(5);
        opacity: 0
      }
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

  previewStream = getPieceStreamWeighted();
  tickRate;
  tickTimeout = null;
  clearedLines = new Map();

  // LIFECYCLE /////////////////////////////////////////////////////////////////

  connectedCallback() {
    super.connectedCallback();
    this.gameState = STATES.PAUSED;
    this.gameData = {};
    this.tickRate = 800;
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

  getCellColorMap({ overlay } = {}) {
    let colorMap = Array.from({ length: ROWS },
      () => Array.from({ length: COLUMNS }, () => 'off'));

    let { buildup, currentPiece } =
      this.gameData.endData ?? this.gameData.resumeData ?? this.gameData;

    if (buildup) {
      for (let y = 0; y < buildup.length; y++) {
        for (let x = 0; x < buildup[y].length; x++) {
          let buildupPiece = buildup[y][x];
          if (buildupPiece)
            colorMap[y][x] = buildupPiece.name;
        }
      }
    }

    if (overlay) {
      for (let y = 0; y < overlay.length; y++) {
        for (let x = 0; overlay[y] && x < overlay[y].length; x++) {
          let overlayPiece = overlay[y][x];
          if (overlayPiece)
            colorMap[y][x] = overlayPiece.name;
        }
      }
    }

    if (currentPiece) {
      let { pos, shape } = currentPiece;
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            colorMap[pos.y + y][pos.x + x] = currentPiece.name;
          }
        }
      }
    }

    return colorMap;
  }

  shouldUpdate(changes) {
    let gameStateChanged = changes.has('gameState');
    let gameDataChanged = changes.has('gameData');

    if (gameStateChanged && !gameDataChanged) {
      console.error('gameState and gameData must be updated together', {
        gameStateChanged,
        gameDataChanged,
        gameState: changes.get('gameState'),
        gameData: changes.get('gameData')
      });
    }

    if (gameStateChanged) {
      let oldGameState = changes.get('gameState');
      let oldGameData = changes.get('gameData');
      let invalidTransition =
        oldGameState &&
        !STATE_TRANSITIONS[oldGameState].includes(this.gameState);

      if (invalidTransition) {
        console.error(
          `Invalid state transition: ${ oldGameState } → ${ this.gameState }`,
          {
            dataNew: this.gameData,
            dataOld: oldGameData
          }
        );
      }

      this.handleStateChangeStart(oldGameState, oldGameData);
    }

    return super.shouldUpdate(changes);
  }

  updated(changes) {
    if (changes.has('gameState')) {
      this.handleStateChanged(
        changes.get('gameState'),
        changes.get('gameData')
      );
    }
  }

  // API ///////////////////////////////////////////////////////////////////////

  * griderator() {
    for (let i = 0; i < COLUMNS * ROWS; i++)
      yield i;
  }

  commitData(data, gameData=this.gameData) {
    console.log('[ristet] commitdata', data);

    if (!data)
      return;

    let { currentPiece } = gameData;

    if (data === MovementError.INTERSECTION) {
      let gameDataNew = merge(this.queuePiece({
        ...gameData,
        currentPiece: null,
      }), {
        buildup: addToBuildup(gameData.buildup, currentPiece),
        swapped: false,
      });

      if (gameDataNew.buildup[0].some(cell => cell)) {
        this.gameState = STATES.GAME_OVER;
        this.gameData = { endData: gameDataNew }
        return;
      }

      // Find rows that need to be cleared
      let rowsToClear = new Map()
      for (let y = 0; y < gameDataNew.buildup.length; y++) {
        if (gameDataNew.buildup[y].every(cell => cell)) {
          rowsToClear.set(y, [ ...gameDataNew.buildup[y] ]);
        }
      }

      if (rowsToClear.size > 0) {
        // Store the rows to be cleared
        this.clearedLines = rowsToClear;
        // Remove the cleared rows from buildup
        gameDataNew.buildup = collapseBuildup(gameDataNew.buildup);
        // Schedule the collapse for after animation
        setTimeout(() => {
          this.clearedLines = new Map();
        }, CLEAR_LINE_DURATION);
      }

      this.gameData = gameDataNew;

      return;
    }

    if (data instanceof StateChangeError)
      return;

    if (!currentPiece)
      return;

    this.gameData = merge({ ...gameData }, data);
  }

  movementSimulate(direction, gameData=this.gameData) {
    let { currentPiece } = gameData;
    if (!currentPiece) {
      return null;
    }

    let { pos } = currentPiece;
    let newPos = { ...pos };

    switch (direction) {
      case DIRECTION.DOWN:
        newPos.y += 1;
        break;
      case DIRECTION.LEFT:
        newPos.x -= 1;
        break;
      case DIRECTION.RIGHT:
        newPos.x += 1;
        break;
    }

    if (newPos.x < 0)
      return MovementError.OUT_OF_BOUNDS;

    if (newPos.x + pieceWidth(currentPiece) > COLUMNS)
      return MovementError.OUT_OF_BOUNDS;

    if (newPos.y + pieceHeight(currentPiece) > ROWS)
      return MovementError.INTERSECTION

    let { buildup } = gameData;

    if (buildup) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x] && buildup[y + newPos.y][x + newPos.x]) {
            return direction === DIRECTION.DOWN
              ? MovementError.INTERSECTION
              : MovementError.OUT_OF_BOUNDS;
          }
        }
      }
    }

    return merge(gameData, {
      currentPiece: {
        pos: newPos
      }
    });
  }

  rotateSimulate(direction, gameData=this.gameData) {
    let { currentPiece } = gameData;
    if (!currentPiece) {
      return null;
    }

    let heightOld = pieceHeight(currentPiece);
    let widthOld = pieceWidth(currentPiece);
    let { pos, shape } = currentPiece;
    let newShape = rotateShape(shape, direction);
    let widthNew = pieceWidth({ shape: newShape });
    let heightNew = pieceHeight({ shape: newShape });
    let xShift = widthOld > widthNew
      ? Math.floor((widthOld - widthNew) / 2)
      : Math.ceil((widthOld - widthNew) / 2);
    let yShift = heightOld - heightNew;
    let newPos = {
      x: pos.x + xShift,
      y: pos.y + yShift,
    };

    if (newPos.x < 0) {
      newPos.x = 0;
    }

    if (newPos.x + widthNew > COLUMNS) {
      newPos.x = COLUMNS - widthNew;
    }

    if (newPos.y < 0) {
      newPos.y = 0;
    }

    if (newPos.y + pieceHeight(currentPiece) > ROWS)
      return MovementError.OUT_OF_BOUNDS;

    let { buildup } = gameData;

    let newPiece = { pos: newPos, shape: newShape };

    if (buildup) {
      for (let y = 0; y < newPiece.shape.length; y++) {
        for (let x = 0; x < newPiece.shape[y].length; x++) {
          if (newPiece.shape[y][x] && buildup[y + newPos.y][x + newPos.x]) {
            return MovementError.OUT_OF_BOUNDS;
          }
        }
      }
    }

    return merge(gameData, {
      currentPiece: {
        shape: null
      }
    }, {
      currentPiece: newPiece
    });
  }

  swapSimulate(gameData=this.gameData) {
    let { currentPiece, previewPiece, swapped } = gameData;

    if (swapped)
      return SwapError.ALREADY_SWAPPED;

    return merge(gameData, {
      currentPiece: null,
      previewPiece: null,
    }, {
      currentPiece: {
        ...previewPiece,
        pos: {
          // center horizontally
          x: Math.floor((COLUMNS - pieceWidth(previewPiece)) / 2),
          y: 0,
        },
      },
      previewPiece: currentPiece,
      swapped: true,
    });
  }

  queuePiece(gameData=this.gameData) {
    if (gameData.currentPiece)
      return gameData;

    let nextPreviewPiece = this.previewStream.next().value;
    let nextPiece =
      gameData.previewPiece ??
      this.previewStream.next().value;

    return merge(gameData, {
      currentPiece: null,
      previewPiece: null,
    }, {
      currentPiece: {
        ...nextPiece,
        pos: {
          // center horizontally
          x: Math.floor((COLUMNS - pieceWidth(nextPiece)) / 2),
          y: 0,
        },
      },
      previewPiece: nextPreviewPiece
    });
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

    let { currentPiece } = this.gameData;
    if (!currentPiece) {
      return this.commitData(this.queuePiece());
    }

    this.commitData(this.movementSimulate(DIRECTION.DOWN));
  }

  // EVENT HANDLERS ////////////////////////////////////////////////////////////

  handleClick(event) {
    this.focus();
  }

  handleKeyDown(event) {
    switch (this.gameState) {
      case STATES.GAME_OVER:
        switch (event.key) {
          case ' ':
            event.preventDefault();
            this.gameState = STATES.PLAYING;
            this.gameData = this.gameData?.resumeData ?? {};
            break;
        }
        break;
      case STATES.PAUSED:
        switch (event.key) {
          case ' ':
            event.preventDefault();
            this.gameState = STATES.PLAYING;
            this.gameData = this.gameData?.resumeData ?? {};
            break;
        }
        break;
      case STATES.PLAYING:
        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            this.tickTimeout &&= clearTimeout(this.tickTimeout);
            this.scheduleNextTick();
            this.commitData(this.movementSimulate(DIRECTION.DOWN));
            break;
          case 'ArrowLeft':
            event.preventDefault();
            this.commitData(this.movementSimulate(DIRECTION.LEFT));
            break;
          case 'ArrowRight':
            event.preventDefault();
            this.commitData(this.movementSimulate(DIRECTION.RIGHT));
            break;
          case '1':
            event.preventDefault();
            this.commitData(this.rotateSimulate(ROTATION.COUNTERCLOCKWISE));
            break;
          case '2':
            event.preventDefault();
            this.commitData(this.rotateSimulate(ROTATION.CLOCKWISE));
            break;
          case '3':
            event.preventDefault();
            this.commitData(this.swapSimulate());
            break;
          case ' ':
            event.preventDefault();
            this.gameState = STATES.PAUSED;
            this.gameData = { resumeData: this.gameData };
            break;
        }
    }

    switch (event.key) {
      case 'f':
        event.preventDefault();
        this.requestFullscreen();
        break;
    }
  }

  handleStateChanged(oldGameState, oldGameData) {
    console.log('[ristet] statechanged', oldGameState, '→', this.gameState);

    switch (this.gameState) {
      case STATES.PLAYING:
        this.commitData(this.queuePiece());
        this.scheduleNextTick();
        break;
      case STATES.GAME_OVER:
        this.tickTimeout &&= clearTimeout(this.tickTimeout);
        break;
      case STATES.PAUSED:
        this.tickTimeout &&= clearTimeout(this.tickTimeout);
        break;
    }
  }

  handleStateChangeStart(oldGameState, oldGameData) {
    console.log('[ristet] statechangestart', oldGameState, '→', this.gameState);
  }

  // RENDER ////////////////////////////////////////////////////////////////////

  render() {
    return html`
      <h2>Ristet</h2>
      <div id="preview">
        ${ this.renderPreview() }
      </div>
      <div id="grid">
        ${ this.renderGrid() }
        ${ this.renderClearedLines() }
      </div>
      <div id="overlay">
        ${ this.renderOverlay() }
      </div>
    `;
  }

  renderCell(x, y, { clearing, colorMap }) {
    let color = colorMap[y][x];
    return html`
      <div class="${ classMap({
        'grid-cell': true,
        [color]: true,
        [color && color !== 'off' ? 'on' : 'off']: true,
        'clearing': clearing
      }) }"
      style="grid-column: ${ x + 1 }; grid-row: ${ y + 1 };">
      </div>
    `;
  }

  renderClearedLine(y, cells, { colorMap }) {
    return repeat(cells,
      (_, x) => x,
      (cell, x) => this.renderCell(x, y, { clearing: true, colorMap })
    );
  }

  renderClearedLines() {
    let colorMap = this.getCellColorMap({
      overlay: Object.fromEntries(this.clearedLines.entries())
    });
    return repeat(this.clearedLines.entries(),
      ([ y ]) => y,
      ([ y, cells ]) => this.renderClearedLine(y, cells, { colorMap })
    );
  }

  renderGrid() {
    let colorMap = this.getCellColorMap();
    return repeat(this.griderator(),
      i => i,
      i => {
        let x = i % COLUMNS;
        let y = Math.floor(i / COLUMNS);
        return this.renderCell(x, y, { colorMap });
      }
    );
  }

  renderOverlay() {
    switch (this.gameState) {
      case STATES.GAME_OVER:
        return html`
          <div id="overlay-content">
            <h2>Game Over</h2>
            <p>Nice try!</p>
            <p><kbd>Space</kbd> to restart</p>
          </div>
        `;
      case STATES.PAUSED:
        return html`
          <div id="overlay-content">
            <h2>Paused</h2>
            <p><kbd>Space</kbd> to resume</p>
            <p><kbd>←</kbd> and <kbd>→</kbd> to move</p>
            <p><kbd>1</kbd> and <kbd>2</kbd> to rotate</p>
            <p><kbd>3</kbd> to swap</p>
            <p><kbd>f</kbd> to fullscreen</p>
          </div>
        `;
      default:
        return '';
    }
  }

  renderPreview() {
    let { previewPiece } =
      this.gameData.endData ?? this.gameData.resumeData ?? this.gameData;

    if (!previewPiece) {
      return '';
    }

    return html`
      ${ repeat(
        previewPiece.shape,
        (_, i) => i,
        (row, y) => this.renderPreviewRow(previewPiece, row, y)
      ) }
    `;
  }

  renderPreviewRow(previewPiece, row, y) {
    return html`
      ${ repeat(
        padArrayStart(row, 0, 4),
        (_, x) => x,
        (cell, x) => this.renderPreviewCell(previewPiece, cell, x, y)
      ) }
    `;
  }

  renderPreviewCell(previewPiece, cell, x, y) {
    return html`
      <div
        class="${ classMap({
          'grid-cell': true,
          'on': cell,
          [previewPiece.name]: true,
        }) }"
        style="grid-column: ${ x + 1 }; grid-row: ${ y + 1 };">
      </div>
    `;
  }
}

customElements.define('jp-ristet', JPRistetElement);

function addToBuildup(buildup, piece) {
  buildup = buildup ?? Array.from({ length: ROWS },
    () => Array.from({ length: COLUMNS }, () => null));

  let { name, pos, shape } = piece;

  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        buildup[y + pos.y][x + pos.x] = { name };
      }
    }
  }

  return buildup;
}

function collapseBuildup(buildup) {
  let getRemovable = () =>
    new Set(buildup.filter(row => row.every(cell => cell)));

  for (
    let removableRows = getRemovable();
    removableRows.size;
    removableRows = getRemovable()
  ) {
    let pairs = [
      ...Array.from({ length: removableRows.size },
        () => Array.from({ length: COLUMNS }, () => null)),
      ...buildup.filter(row => !removableRows.has(row))
    ].flatMap((row, i, buildup) => {
      let nextRow = buildup[i + 1];
      if (!nextRow) {
        return [ ];
      }
      return [ [ row, nextRow ] ];
    });

    buildup = pairs.reduce((acc, [ row, nextRow ], y, pairs) => {
      if (row.every((cell, x) => !cell !== !nextRow[x])) {
        acc.push(row.map((cell, x) => cell || nextRow[x]));
      } else {
        acc.push(row);

        if (y === pairs.length - 1) {
          acc.push(nextRow);
        }
      }

      return acc;
    }, []);
  }

  return buildup;
}

function * padArrayStart(arr, padValue, length) {
  for (let i = 0; i < length - arr.length; i++) {
    yield padValue;
  }
  yield * arr;
}

class StateChangeError extends Error {
}

class MovementError extends StateChangeError {
  static TYPE = Object.freeze({
    OUT_OF_BOUNDS: 'out-of-bounds',
    INTERSECTION: 'intersection',
  });

  static OUT_OF_BOUNDS = new MovementError(this.TYPE.OUT_OF_BOUNDS);
  static INTERSECTION = new MovementError(this.TYPE.INTERSECTION);

  constructor(type) {
    super(type);
  }
}

class SwapError extends StateChangeError {
  static TYPE = Object.freeze({
    ALREADY_SWAPPED: 'already-swapped',
  });

  static ALREADY_SWAPPED = new SwapError(this.TYPE.ALREADY_SWAPPED);
}
