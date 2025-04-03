class CounterDOMElement extends HTMLElement {
  static observedAttributes = [ 'count', 'updating' ];

  get count() {
    return this.getAttribute('count');
  } 

  set count(value) {
    this.setAttribute('count', `${ value }`);
  }

  get updating() {
    return this.hasAttribute('updating');
  }

  set updating(value) {
    if (value)
      this.setAttribute('updating', '');
    else
      this.removeAttribute('updating');
  }

  // LIFECYCLE /////////////////////////////////////////////////////////////////

  // CustomElement
  connectedCallback() {
    this.innerHTML = '';
    addEventListener('ws-message-counter', this.handleCounterChange);
    this.render();
    (async () => {
      try {
        this.updating = true;
        const response = await fetch('/api/counter', { method: 'GET', });
        const { value } = await response.json();
        if (this.isConnected)
          this.count = value;
      } finally {
        this.updating = false;
      }
    })();
  }

  disconnectedCallback() {
    this.querySelector('button')?.removeEventListener('click', this.handleClick);
    removeEventListener('ws-message-counter', this.handleCounterChange);
  }

  // CustomElement
  attributeChangedCallback(attr, oldValue, newValue) {
    this.render();
  }

  // EVENT HANDLERS ////////////////////////////////////////////////////////////

  handleClick = async () => {
    try {
      this.updating = true;
      const response = await fetch('/api/counter', { method: 'PUT', });
      const { value } = await response.json();
      this.count = value;
    } finally {
      this.updating = false;
    }
  };

  handleCounterChange = (event) => {
    this.count = event.detail.data.count;
  }

  // RENDER ////////////////////////////////////////////////////////////////////

  render() {
    let header = this.querySelector('#header');
    let button = this.querySelector('#button');
    let paragraph = this.querySelector('#count');

    if (!header) {
      header = document.createElement('h2');
      header.id = 'header';
      header.textContent = 'Counter DOM';
      this.appendChild(header);
    }

    if (!button) {
      button = document.createElement('button');
      button.id = 'button';
      button.textContent = 'Increment';
      button.addEventListener('click', this.handleClick);
      this.appendChild(button);
    }

    if (this.updating)
      button.setAttribute('disabled', '');
    else
      button.removeAttribute('disabled');

    if (!paragraph) {
      paragraph = document.createElement('p');
      paragraph.id = 'count';
      this.appendChild(paragraph);
    }

    paragraph.textContent = `Count: ${ this.count ?? '' }`;
  }
}

customElements.define('counter-dom', CounterDOMElement);
