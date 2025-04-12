import { css, LitElement, html } from 'lit';

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
      max-width: min(var(--jp-common-max-width), 100%);
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

  willUpdate() {
    switch (this.currentRoute) {
      case '/':
        import('/frontend/src/fun/jp-counter-dom.mjs');
        import('/frontend/src/fun/jp-counter-lit.mjs');
        break;
      case '/ristet':
        import('/frontend/src/fun/jp-ristet/jp-ristet.mjs');
        break;
    }
  }

  render() {
    switch (this.currentRoute) {
      case '/':
        return html`<div>
          <jp-counter-dom></jp-counter-dom>
          <jp-counter-lit></jp-counter-lit>
        </div>`;
      case '/about':
        return html`<div>About Page Content</div>`;
      case '/ristet':
        return html`<div>
          <jp-ristet></jp-ristet>
        </div>`;
      default:
        return html`<div>404 - Page not found</div>`;
    }
  }
}

customElements.define('jp-chassis-main', JPChassisMainElement);

export { JPChassisMainElement }; 