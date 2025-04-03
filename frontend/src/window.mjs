document.addEventListener('click', (event) => {
  let composedPath = event.composedPath();
  let target = composedPath.find(element =>
    element.tagName === 'A' &&
    element.href
  );

  if (!target)
    return;

  // Ignore external links, modified clicks, or non-left clicks
  if (!isSameWindowLink(target) ||
    target.target === '_blank' ||
    target.origin !== window.location.origin ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  ) {
    return;
  }

  // Prevent default navigation
  event.preventDefault();

  // Update the URL
  let href = target.href;
  let url = new URL(href);

  // Navigate if it's a different path
  if (window.location.pathname !== url.pathname) {
    navigateTo(url.pathname);
  }
});

// Listen for popstate events (browser back/forward)
window.addEventListener('popstate', () => {
  window.dispatchEvent(new CustomEvent('route-changed', {
    detail: { path: window.location.pathname }
  }));
});

function navigateTo(path) {
  // Update history state
  window.history.pushState({}, '', path);

  // Dispatch a custom event for the route change
  window.dispatchEvent(new CustomEvent('route-changed', {
    detail: { path }
  }));
}

const isOwnTarget = target => {
  switch (target) {
    case '':
      return true;
    case '_self':
      return true;
    case '_top':
      return top === window;
    case '_parent':
      return parent === window;
    case name:
      return true;
    default:
      return false;
  }
};

const isSameWindowLink = element =>
  element?.href &&
  isOwnTarget(element.target);
