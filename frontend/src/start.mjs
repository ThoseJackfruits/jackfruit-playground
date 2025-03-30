async function main() {
  await import('/frontend/src/counter-dom.mjs');
  await import('lit');
  await import('/frontend/src/counter-lit.mjs');
}

main();
