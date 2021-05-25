import { randomNumberRange } from "ghost-cursor/lib/math";
import { Browser, Page } from "puppeteer";

export default class Utils {
  // Get current date in a readable format
  static getDate(): string {
    const currentdate = new Date();
    const datetime =
      "# " +
      currentdate.getDate() +
      "/" +
      (currentdate.getMonth() + 1) +
      "/" +
      currentdate.getFullYear() +
      " - " +
      String(currentdate.getHours()).padStart(2, "0") +
      ":" +
      String(currentdate.getMinutes()).padStart(2, "0") +
      ":" +
      String(currentdate.getSeconds()).padStart(2, "0");
    return datetime;
  }

  static async humanType(page: Page, str: string): Promise<void> {
    for (const letter of Array.from(str)) {
      await page.keyboard.type(letter);
      await page.waitForTimeout(randomNumberRange(30, 100));
    }
  }

  static async createPage(
    browser: Browser,
    debug: boolean,
    intercept: boolean
  ): Promise<Page> {
    const page = await browser.newPage();

    // Set headless
    if (!debug) {
      const headlessUserAgent = await page.evaluate(() => navigator.userAgent);
      const chromeUserAgent = headlessUserAgent.replace(
        "HeadlessChrome",
        "Chrome"
      );
      await page.setUserAgent(chromeUserAgent);
      await page.setExtraHTTPHeaders({
        "accept-language": "es-ES,es;q=0.8",
      });
    }

    // Disable images, fonts and css to be faster
    if (intercept) {
      await page.setRequestInterception(true);
      page.removeAllListeners("request");
      page.on("request", async (req) => {
        // console.log(req.url());
        // console.log(req.resourceType());
        try {
          if (
            ["image", "stylesheet", "font"].includes(req.resourceType()) ||
            req.url().endsWith(".ico")
          ) {
            await req.abort();
          } else {
            await req.continue();
          }
        } catch (e) {
          console.log(e);
        }
      });
    }

    return page;
  }
}
