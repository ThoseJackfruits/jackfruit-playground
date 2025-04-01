import { css, LitElement, html } from 'lit';

class CounterLitElement extends LitElement {
  static properties = {
    count: { type: Number }
  };

  static styles = css`
    :host {
      display: block;
      font-family: sans-serif;
      padding: 1rem;
      border: 1px solid #333;
      border-radius: 0.25rem;
    }

    button {
      all: unset;
      background-color: #eee;
      color: #111;
      padding: 0.5rem 1rem;
      border-radius: 0.25rem;
      cursor: pointer;
    }

    button:hover {
      background-color: #ddd;
    }
  `;

  constructor() {
    super();
    this.count = 0;
  }

  // EVENT HANDLERS ////////////////////////////////////////////////////////////

  handleClick = () => {
    this.count++;
  };

  // RENDER ////////////////////////////////////////////////////////////////////

  render() {
    return html`
      <h2>Counter Lit</h2>
      <button id="button" @click=${ this.handleClick }>Increment</button>
      <p id="count">Count: ${ this.count }</p>
    `;
  }
}

customElements.define('counter-lit', CounterLitElement);
