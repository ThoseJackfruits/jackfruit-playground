async function main() {
  await Promise.all([
    import('/frontend/src/counter-dom.mjs'),
    import('/frontend/src/counter-lit.mjs')
  ]);
}

main();
