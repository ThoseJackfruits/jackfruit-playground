import { LitElement, html } from 'lit';

class CounterLitElement extends LitElement {
  static properties = {
    count: { type: Number }
  };

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
      <button id="button" @click=${ this.handleClick }>Click me</button>
      <p id="count">Count: ${ this.count }</p>
    `;
  }
}

customElements.define('counter-lit', CounterLitElement);
