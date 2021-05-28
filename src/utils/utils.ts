import { randomNumberRange } from "ghost-cursor/lib/math";
import { Browser, Page } from "puppeteer";

export default class Utils {
  // Get current date in a readable format
  static getDate(): string {
    const date = new Date();
    const datetime =
      "# " +
      date.getDate() +
      "/" +
      (date.getMonth() + 1) +
      "/" +
      date.getFullYear() +
      " - " +
      String(date.getHours()).padStart(2, "0") +
      ":" +
      String(date.getMinutes()).padStart(2, "0") +
      ":" +
      String(date.getSeconds()).padStart(2, "0");
    return datetime;
  }

  // Get the time from a date
  static getHoursMinutesFromDate(date: Date): string {
    const datetime =
      String(date.getHours()).padStart(2, "0") +
      ":" +
      String(date.getMinutes()).padStart(2, "0");
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

    // Block some requests to be faster (not working for article or payment pages)
    if (intercept) {
      await page.setRequestInterception(true);
      page.removeAllListeners("request");
      page.on("request", async (req) => {
        // console.log(req.url());
        // console.log(req.resourceType());
        try {
          if (
            // WARNING: Disabling scripts may lead to page errors, still being tested! (Login and payment pages do not work)
            ["image", "stylesheet", "font", "script"].includes(
              req.resourceType()
            ) ||
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
