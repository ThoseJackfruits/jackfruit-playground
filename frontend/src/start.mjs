async function main() {
  await Promise.all([
    import('/frontend/src/layout/jp-chassis.mjs'),
    import('/frontend/src/window.mjs'),
    import('lit').then(({ html, render }) => {
      // Create a global router handler

      render(html`
        <jp-chassis>
        </jp-chassis>
      `, document.body);
    })
  ]);
}

main();
