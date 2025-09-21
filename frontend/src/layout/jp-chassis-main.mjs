import { css, LitElement, html } from 'lit';

class JPChassisMainElement extends LitElement {
  static properties = {
    currentRoute: { type: String }
  };

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      overflow: hidden;
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
      case '/about':
        import('/frontend/src/pages/jp-about.mjs');
        break;
      case '/ristet':
        import('/frontend/src/fun/jp-ristet/jp-ristet.mjs');
        break;
      case '/timpist':
        import('/frontend/src/fun/jp-timpist/jp-timpist.mjs');
        break;
    }
  }

  render() {
    switch (this.currentRoute) {
      case '/':
        return html`<div>
          <p>
            The greatest and most important development in all web framework
            starter pack technology: the distributed, consistent, live-updating
            counter.
          </p>
          <jp-counter-dom></jp-counter-dom>
          <jp-counter-lit></jp-counter-lit>
        </div>`;
      case '/about':
        return html`<jp-about></jp-about>`;
      case '/ristet':
        return html`<jp-ristet></jp-ristet>`;
      case '/timpist':
        return html`<jp-timpist></jp-timpist>`;
      default:
        return html`<div>404 - Page not found</div>`;
    }
  }
}

customElements.define('jp-chassis-main', JPChassisMainElement);

export { JPChassisMainElement };
