import { css, LitElement, html } from 'lit';
import '/frontend/src/layout/jp-chassis-nav.mjs';
import '/frontend/src/layout/jp-chassis-main.mjs';

class JPChassisElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
  `;

  constructor() {
    super();
  }

  render() {
    return html`
      <jp-chassis-nav></jp-chassis-nav>
      <main>
        <jp-chassis-main></jp-chassis-main>
      </main>
    `;
  }
}

customElements.define('jp-chassis', JPChassisElement);
