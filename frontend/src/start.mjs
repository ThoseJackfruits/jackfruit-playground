async function main() {
  await import('/frontend/src/counter-dom.mjs');
  await import('/frontend/src/counter-lit.mjs');
}

main();
