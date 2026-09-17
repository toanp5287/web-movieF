export async function loadComponents(basePath = ".") {
  const header = await fetch(`${basePath}/src/components/header.html`);
  document.querySelector("#header").innerHTML = await header.text();

  const footer = await fetch(`${basePath}/src/components/footer.html`);
  document.querySelector("#footer").innerHTML = await footer.text();
}
