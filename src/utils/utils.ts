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

  static randomTimeout(
    minUpdateSeconds: number,
    maxUpdateSeconds: number
  ): number {
    // Math.random() * (max - min + 1) + min); // Generate a number in a range
    const min = minUpdateSeconds * 1000;
    const max = maxUpdateSeconds * 1000;
    return Math.round(Math.random() * (max - min + 1)) + min;
  }

  static async createHeadlessPage(browser: Browser): Promise<Page> {
    const page = await browser.newPage();

    const headlessUserAgent = await page.evaluate(() => navigator.userAgent);
    const chromeUserAgent = headlessUserAgent.replace(
      "HeadlessChrome",
      "Chrome"
    );
    await page.setUserAgent(chromeUserAgent);
    await page.setExtraHTTPHeaders({
      "accept-language": "es-ES,es;q=0.8",
    });

    return page;
  }
}
