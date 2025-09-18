import { LitElement, html, css, svg } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { getFieldPoints } from './lib-field.mjs';
import { lerp, pairs } from './lib-util.mjs';

const FIELD_TYPE_OPTIONS = Object.freeze([
  { label: 'Circle', value: 'circle' },
  { label: 'Ellipse', value: 'ellipse' },
  { label: 'Peanut', value: 'peanut' },
  { label: 'Square (rounded)', value: 'square-rounded' },
  { label: 'Square (sharp)', value: 'square-sharp' },
  { label: 'Star', value: 'star' },
]);

const STATE = Object.freeze({
  PREVIEW: 'preview',
  PAUSE: 'pause',
  PLAY: 'play'
});

const jpRAF = Symbol('raf');

class JPTimpistElement extends LitElement {
  static properties = {
    state: { type: String, reflect: true },
    data: { state: true },
  };

  static styles = css`
    :host {
      display: flex;
      box-sizing: border-box;
      flex-direction: column;
      flex-shrink: 1;
      width: 100%;
      height: 100%;
      overflow-x: hidden;
      overflow-y: auto;
      padding: 0 var(--jp-common-padding) var(--jp-common-padding);
      max-width: var(--jp-common-max-width);
    }

    form {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
    }

    form .field {
      display: grid;
      grid-template:
        'label select' 1fr /
        1fr 1fr;
      column-gap: var(--jp-common-padding);
    }

    form .field + .field {
      margin-top: var(--jp-common-padding);
    }

    svg {
      max-width: 100%;
      max-height: 100%;
      margin-top: var(--jp-common-padding);
      stroke: var(--jp-color-text);
      stroke-linecap: round;
      overflow: hidden;
      flex-shrink: 1;
    }
  `;

  // LIFECYCLE /////////////////////////////////////////////////////////////////

  connectedCallback() {
    super.connectedCallback();
    this.state = STATE.PREVIEW
    let usp = new URLSearchParams(location.search);
    this.data = {
      fieldLineCount: usp.get('preview-line-count') || 11,
      fieldType: usp.get('preview-type') || 'circle',
      ship: 0
    };

    this.rafStart();
  }

  disconnectedCallback() {
    this.data = null;
    this.state = null;
    super.disconnectedCallback();
  }

  // EVENT HANDLERS //////////////////////////////////////////////////////////

  handleFieldLineCountChange(event) {
    let fieldLineCount = event.target.value;
    this.data = { ...this.data, fieldLineCount };
    let usp = new URLSearchParams(location.search);
    usp.set('preview-line-count', fieldLineCount);
    history.replaceState({}, '', `?${ usp.toString() }`);
  }

  handleFieldTypeChange(event) {
    let fieldType = event.target.value;
    this.data = { ...this.data, fieldType };
    let usp = new URLSearchParams(location.search);
    usp.set('preview-type', fieldType);
    history.replaceState({}, '', `?${ usp.toString() }`);
  }

  handleSubmit(event) {
    event.preventDefault();
  }

  // API ///////////////////////////////////////////////////////////////////////

  getRadiusGetter() {
    switch (this.data.fieldType) {
      case 'circle':
        return (angle, i) => ({ outer: 40, inner: 5, innerOffsetY: 30 });
      case 'ellipse':
        return (angle, i) => {
          let outer = 30 + 15 * (1 - Math.abs(Math.cos(angle)));
          let inner = outer * 0.2;
          return { outer, inner, innerOffsetY: 10 };
        };
      case 'peanut':
        return (angle, i) => {
          let outer =
            30 +
            15 * Math.abs(Math.sin(angle)) ** 1.2 -
            15 * Math.abs(Math.cos(angle)) ** 1.8;
          let inner = 5;
          return { outer, inner, innerOffsetY: 5 };
        };
      case 'star':
        return (angle, i) => {
          let outer = 40;
          let inner = 5;
          if (i % 2 === 0) {
            outer = 20;
            inner = 3.5;
          }
          return { outer, inner, innerOffsetY: 15 };
        };
      case 'square-rounded':
        return (angle, i) => {
          let outer = 40;
          let inner = 5;

          outer *= Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle));

          return { outer, inner, innerOffsetY: 35 };
        };
      case 'square-sharp':
        return (angle, i) => {
          let maxComponent = Math.max(
            Math.abs(Math.cos(angle)),
            Math.abs(Math.sin(angle)));
          let outer = maxComponent > 0 ? 40 / maxComponent : 40;
          let inner = 5;

          return { outer, inner, innerOffsetY: 35 };
        };
    }
  }

  moveShip = () => {
    this.data = {
      ...this.data,
      ship: this.data.ship + 0.01
    }
  };

  rafStart = () => {
    try {
      this.moveShip();
    } finally {
      requestAnimationFrame(this.rafStart);
    }
  };

  // RENDER ////////////////////////////////////////////////////////////////////

  render() {
    return html`
      <form @submit=${ this.handleSubmit }>
        <div class="field">
          <label for="field-type">Field type</label>
          <select @change=${ this.handleFieldTypeChange } id="field-type">
            ${ repeat(
              FIELD_TYPE_OPTIONS,
              ({ label, value }) => html`
                <option
                  ?selected=${ this.data.fieldType === value }
                  value="${ value }">${ label }</option>
              `
            ) }
          </select>
        </div>
        <div class="field">
          <label for="field-line-count">Side count</label>
          <input
            type="range"
            min="3"
            max="20"
            step="1"
            @input=${ this.handleFieldLineCountChange}
            id="field-line-count"
            value="${ this.data.fieldLineCount }">
        </div>
      </form>
      <svg viewBox="0 0 100 100">
        ${ this.renderField() }
        ${ this.renderShip() }
      </svg>
    `;
  }

  renderField() {
    const [ ...points ] = getFieldPoints(this.data.fieldLineCount, {
      getRadius: this.getRadiusGetter(),
      offset: 0.5
    });
    const [ ...pointPairs ] = pairs(points);

    let shipFloor = Math.floor(this.data.ship);
    let shipIndex = shipFloor % pointPairs.length;
    let shipPair = pointPairs[shipIndex];
    let shipR = 0.5 * Math.sqrt(lerp(
      shipPair[0].rOuter - shipPair[0].rInner,
      shipPair[1].rOuter - shipPair[1].rInner,
      this.data.ship - shipFloor
    ));
    let shipX = lerp(
      shipPair[0].xOuter,
      shipPair[1].xOuter,
      this.data.ship - shipFloor
    );
    let shipY = lerp(
      shipPair[0].yOuter,
      shipPair[1].yOuter,
      this.data.ship - shipFloor
    );

    return svg`
      <!-- Inside path -->
      ${ repeat(
        pointPairs,
        pair => pair[0].angle,
        pair => svg`
        <line
          x1="${ pair[0].xInnerF }"
          y1="${ pair[0].yInnerF }"
          x2="${ pair[1].xInnerF }"
          y2="${ pair[1].yInnerF }"
          stroke-width="0.5px">
        </line>
      `) }

      <!-- Inside-outside lines -->
      ${ repeat(
        points,
        point => point.angle,
        point => svg`
        <line
          x1="${ point.xInnerF }"
          y1="${ point.yInnerF }"
          x2="${ point.xOuterF }"
          y2="${ point.yOuterF }"
          stroke-width="0.5px">
        </line>
      `) }

      <!-- Outside path -->
      ${ repeat(
        pointPairs,
        pair => pair[0].angle,
        pair => svg`
        <line
          x1="${ pair[0].xOuterF }"
          y1="${ pair[0].yOuterF }"
          x2="${ pair[1].xOuterF }"
          y2="${ pair[1].yOuterF }"
          stroke-width="0.5px">
        </line>
      `) }

      <circle
        cx="${ shipX }"
        cy="${ shipY }"
        r="${ shipR }"
        stroke="transparent"
        fill="green">
      </circle>
    `;
  }

  renderShip() {
    return svg`
    `;
  }
}

customElements.define('jp-timpist', JPTimpistElement);
