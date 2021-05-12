import { Browser, Page } from "puppeteer";
const { randomNumberRange } = require("ghost-cursor/lib/math");

export default class Utils {
  // Get current date in a readable format
  static getDate() {
    var currentdate = new Date();
    var datetime =
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

  static humanType = async (page: Page, str: string) => {
    for (let letter of Array.from(str)) {
      await page.keyboard.type(letter);
      await page.waitForTimeout(randomNumberRange(30, 100));
    }
  };

  static randomTimeout(minUpdateSeconds: number, maxUpdateSeconds: number) {
    // Math.random() * (max - min + 1) + min); // Generate a number in a range
    let min = minUpdateSeconds * 1000;
    let max = maxUpdateSeconds * 1000;
    return Math.round(Math.random() * (max - min + 1)) + min;
  }

  static async createHeadlessPage(browser: Browser) {
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
