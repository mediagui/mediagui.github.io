// Auditoría de axe-core con el tema oscuro del sitio.
//
// El tema se aplica en cliente (theme.js lee localStorage "theme" y, si no hay
// valor, sigue a prefers-color-scheme), así que axe-cli no sirve aquí: no
// permite inyectar scripts antes de cargar la página. Con Puppeteer se fija
// localStorage.theme="dark" antes de cada navegación y se comprueba que el
// documento acabó con data-theme="dark" antes de lanzar axe.
//
// Variables: PAGES ("/", "cv/", ... separadas por comas), BASE_URL y CHROME_PATH.

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const globalRoot = process.env.NPM_GLOBAL_ROOT;

// Los paquetes están instalados con `npm install -g` y se resuelven desde
// NODE_PATH; el fallback explícito evita depender de que npm lo exporte.
const load = (id) => {
  try {
    return require(id);
  } catch (err) {
    if (!globalRoot) throw err;
    return require(`${globalRoot}/${id}`);
  }
};

const puppeteer = load("puppeteer-core");

const axePath = (() => {
  try {
    return require.resolve("axe-core/axe.min.js");
  } catch (err) {
    if (!globalRoot) throw err;
    return `${globalRoot}/axe-core/axe.min.js`;
  }
})();
const axeSource = readFileSync(axePath, "utf8");

const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const executablePath = process.env.CHROME_PATH;

const pages = (process.env.PAGES || "")
  .split(",")
  .filter((page) => page.trim() !== "")
  .map((page) => page.trim().replace(/^\/+/, ""));

if (!executablePath) {
  console.error("Falta CHROME_PATH (ruta al binario de Chrome).");
  process.exit(2);
}
if (pages.length === 0) {
  console.error("Falta PAGES (lista de rutas separadas por comas).");
  process.exit(2);
}

const browser = await puppeteer.launch({
  executablePath,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

let failed = 0;

for (const pagePath of pages) {
  const url = `${BASE_URL}/${pagePath}`;
  console.log(`::group::axe oscuro /${pagePath}`);
  const page = await browser.newPage();
  try {
    await page.evaluateOnNewDocument(() => localStorage.setItem("theme", "dark"));
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await page.waitForFunction(() => document.documentElement.getAttribute("data-theme") === "dark", { timeout: 15000 });
    // Mismo margen que --load-delay=1500 del pase en claro.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await page.addScriptTag({ content: axeSource });

    const raw = await page.evaluate(() => axe.run(document).then((results) => JSON.stringify(results.violations)));
    const violations = JSON.parse(raw);

    if (violations.length === 0) {
      console.log(`/${pagePath}: sin violaciones en tema oscuro`);
    } else {
      failed = 1;
      console.log(`/${pagePath}: ${violations.length} regla(s) incumplida(s) en tema oscuro`);
      for (const violation of violations) {
        console.log(`  [${violation.impact}] ${violation.id}: ${violation.help} (${violation.nodes.length} nodo/s)`);
        for (const node of violation.nodes.slice(0, 5)) {
          console.log(`    - ${node.target.join(" ")}`);
          if (node.failureSummary) {
            console.log(`      ${node.failureSummary.replace(/\n/g, " ")}`);
          }
        }
      }
      console.log(`::error title=axe oscuro /${pagePath}::${violations.map((violation) => violation.id).join(", ")}`);
    }
  } catch (err) {
    failed = 1;
    console.log(`/${pagePath}: ${err.message}`);
    console.log(`::error title=axe oscuro /${pagePath}::${err.message}`);
  } finally {
    await page.close();
    console.log("::endgroup::");
  }
}

await browser.close();
process.exit(failed);
