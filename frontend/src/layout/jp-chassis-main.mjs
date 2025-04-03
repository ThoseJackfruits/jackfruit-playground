import { css, LitElement, html } from 'lit';
import '/frontend/src/fun/counter-dom.mjs';
import '/frontend/src/fun/counter-lit.mjs';

class JPChassisMainElement extends LitElement {
  static properties = {
    currentRoute: { type: String }
  };

  static styles = css`
    :host {
      display: block;
    }

    div {
      padding: 0 var(--jp-common-padding);
      max-width: var(--jp-common-max-width);
    }
  `;

  constructor() {
    super();
    this.currentRoute = window.location.pathname;

    // Listen for route changes
    window.addEventListener('route-changed', (event) => {
      this.currentRoute = event.detail.path;
    });
  }

  render() {
    // Render different content based on the current route
    switch(this.currentRoute) {
      case '/':
        return html`<div>
          <counter-dom></counter-dom>
          <counter-lit></counter-lit>
        </div>`;
      case '/about':
        return html`<div>About Page Content</div>`;
      default:
        return html`<div>404 - Page not found</div>`;
    }
  }
}

customElements.define('jp-chassis-main', JPChassisMainElement);

export { JPChassisMainElement }; 