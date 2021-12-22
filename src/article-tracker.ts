import { randomNumberRange } from "ghost-cursor/lib/math";
import { html2json } from "html2json";
import { open } from "out-url";
import { Browser, Page } from "puppeteer";
import sanitizeHtml from "sanitize-html";
import Container from "typedi";
import { Article, ArticleConfig, CategoryConfig } from "./models";
import NotifyService from "./services/notify.service";
import PurchaseService from "./services/purchase.service";
import Log from "./utils/log";
import Utils from "./utils/utils";
import Validator from "./validator";

/**
 * Instantiable class that will take care of tracking a article, send notifications and purchasing it if needed.
 */
export default class ArticleTracker {
  private readonly name: string;
  private readonly config: CategoryConfig;
  private readonly debug: boolean;
  private readonly purchase: boolean;
  private readonly purchaseSame: boolean;

  private previousMatches: Article[] = [];
  private previousAllAvailable: string[] = [];

  // private buying = false;
  private done = false;
  private checking = false;
  private notifyNextMatch = false;

  private minUpdateSeconds;
  private maxUpdateSeconds;

  private speedupStartedTime: number | undefined = undefined;
  private readonly speedupTimeout = 30 * 60 * 1000; // Half hour

  private browser: Browser;
  private page!: Page;

  // Inject needed services
  private readonly purchaseService = Container.get(PurchaseService);
  private readonly notifyService = Container.get(NotifyService);
  private readonly validator = new Validator();

  constructor(
    id: string,
    config: CategoryConfig,
    browser: Browser,
    purchase: boolean,
    purchaseSame: boolean,
    debug: boolean
  ) {
    this.name = id;
    this.config = config;
    this.minUpdateSeconds = this.config.minUpdateSeconds;
    this.maxUpdateSeconds = this.config.maxUpdateSeconds;
    this.browser = browser;
    this.purchase = purchase;
    this.purchaseSame = purchaseSame;
    this.debug = debug;
    this.start();
  }

  async start(): Promise<void> {
    // Create the page that will be used for this tracker
    await this.newPage();

    // Start the speedup
    if (this.config.autoSpeedup) {
      this.startSpeedup();
    }

    // First iteration
    await this.update(true);

    // Infinite loop
    this.loop();
  }

  getName(): string {
    return this.name;
  }

  stop(): void {
    this.done = true;
  }

  reconnect(browser: Browser): void {
    this.browser = browser;
    this.newPage();
  }

  async newPage(): Promise<void> {
    this.page = await Utils.createPage(this.browser, this.debug, true);
  }

  // Infinite loop with a pseudo-random timeout to fetch data imitating a human behaviour
  loop(): void {
    if (this.done) {
      Log.success(`'${this.name} tracker' - Stopped successfully.`, true);
      return;
    }

    setTimeout(async () => {
      // Wait for the update to be done
      await this.update();
      this.loop();
    }, randomNumberRange(this.minUpdateSeconds * 1000, this.maxUpdateSeconds * 1000));
  }

  async update(first = false, notify?: boolean): Promise<void> {
    if (notify) {
      this.notifyNextMatch = true;
    }

    if (this.done) {
      return;
    }

    if (!this.browser.isConnected()) {
      Log.error(`'${this.name} tracker' - Browser is disconnected!`, true);
      return;
    }

    if (this.checking) {
      Log.important(
        `'${this.name} tracker' - Tried to update again while still checking data, reduce the update time or the number of pages to check in 'config.json'`,
        true
      );
      return;
    }

    this.checking = true;

    // Relaunch page if it is closed
    if (this.page.isClosed()) {
      await this.newPage();
    }

    let pages = "";
    try {
      pages = await this.checkPages(0, "");
    } catch (error) {
      Log.error(
        `'${this.name} tracker' - Error while checking page data: ${error}`,
        true
      );
      this.checking = false;
      return;
    }

    if (pages === "") {
      Log.error(
        `'${this.name} tracker' - Error while checking page data, found an empty page.`
      );
      this.checking = false;
      return;
    }

    // Convert the cleaned HTML output to JSON objects
    const json = html2json(pages);

    // Check the JSON schema validity
    const valid = this.validator.validateArticle(json);
    if (!valid) {
      Log.error(
        `'${this.name} tracker' - JSON validation error: ${JSON.stringify(
          this.validator.getLastError()
        )} `
      );
      this.checking = false;
      return;
    }

    const data = this.processData(json);

    const matches = data.matches;
    const allAvailable = data.allAvailable;

    if (this.notifyNextMatch) {
      // Notify the next matches if requested, ensures the sending of the notification in case the tracker is still checking data
      this.notifyNextMatch = false;
      this.notifyService.notify(
        `'${this.name} tracker' - All articles available:`,
        matches.map((v) => v.match)
      );
    }

    if (this.config.autoSpeedup) {
      this.checkAllStock(allAvailable, first);
    }
    this.checkIfNew(matches);
  }

  async checkPages(pageCount: number, result: string): Promise<string> {
    await this.page.goto(
      this.config.url + `&page=${pageCount}&order=${this.config.order}`,
      { waitUntil: "domcontentloaded" } // Only wait till the dom is loaded, it's faster
    );

    // Hide the rating star and image elements without waiting (it does not affect the performance, just to have a cleaner list while debugging)
    this.page.addStyleTag({
      content: ".c-star-rating.cy-product-rating,img{display:none}",
    });

    const bodyHTML = await this.page.evaluate(() => document.body.innerHTML);

    // Allow only a restricted set of tags and attributes to clean the HTML
    const clean = sanitizeHtml(bodyHTML, {
      allowedTags: ["article", "a"],
      allowedAttributes: {
        article: ["data-price", "data-name", "data-id"],
        a: ["href"],
      },
    }).replace(/\n{2,}/g, "\n");

    // Check if the page has articles
    if (clean.includes(`<article`)) {
      result += clean;
      const nextPage = pageCount + 1;

      // Return if all needed pages have been checked
      if (nextPage >= this.config.checkPages) {
        return result;
      }

      //  Check next page
      await this.page.waitForTimeout(randomNumberRange(1000, 2000));
      return await this.checkPages(nextPage, result);
    } else {
      return result;
    }
  }

  processData(json: any): { matches: Article[]; allAvailable: string[] } {
    // List of items that match the requisites (each item is a string with price, name and URL)
    const matches: Article[] = [];
    // List of all items in stock, used to check changes (we can react on it)
    const allAvailable: string[] = [];

    if (!json || !json.child) {
      Log.error("Missing data, skipping...");
      return { matches, allAvailable };
    }

    json.child.forEach((element: any) => {
      if (element.attr && element.tag === "article") {
        const href = element.child.find((a: any) => a.tag === "a").attr
          .href as string;

        let id: number;

        if (href.includes("/rastrillo/")) {
          id = Number(href.replace("/rastrillo/", ""));
        } else {
          id = element.attr["data-id"];
        }

        const price = element.attr["data-price"];
        const name = element.attr["data-name"].map((v: string) =>
          v.toLowerCase()
        );
        let purchase = true;

        // Check if out of stock
        if (
          element.child.find((c: any) =>
            c.text?.toLowerCase().includes("sin fecha de entrada")
          )
        ) {
          return;
        }

        // Build link and and save to the all available list
        const link = "https://www.pccomponentes.com" + href;
        allAvailable.push(link);

        // Check if the price is below the maximum of this category (if defined)
        if (this.config.maxPrice && price >= this.config.maxPrice) {
          return;
        }
        if (
          this.config.articles.some((article: ArticleConfig) => {
            // Check if the price is below the maximum of this article (if defined)
            if (article.maxPrice && price >= article.maxPrice) {
              return false; // skip
            }

            // Check if any of the excluded strings are in the title of the article
            const excluded = this.config.exclude.concat(article.exclude);
            if (excluded.some((e: string) => name.includes(e.toLowerCase()))) {
              return false; // skip
            }

            // Check if all strings of the model are in the title of the article
            if (
              article.model.every((m: string) => name.includes(m.toLowerCase()))
            ) {
              // Check if the purchase of this article is explicitly disabled
              if (article.purchase === false) {
                purchase = false;
              }
              return true;
            }
            return false; // skip
          })
        ) {
          //  Build link, name and price of the article in a single string
          const purchaseLink =
            "https://www.pccomponentes.com/cart/addItem/" + id;
          const nameText = `[${name.join([" "])}](${link})`;
          const priceText = `*${price} EUR*`;
          const match = `${priceText}\n${nameText}`;
          const article: Article = {
            id,
            name,
            price,
            link,
            purchaseLink,
            match,
            purchase,
          };
          matches.push(article);
        }
      }
    });
    return { matches, allAvailable };
  }

  async checkAllStock(allAvailable: string[], first: boolean): Promise<void> {
    // First iteration
    if (first) {
      this.previousAllAvailable = allAvailable;
      return;
    }

    // Check for any stock changes - use difference to only get the new ones
    const difference = allAvailable.filter(
      (a) => !this.previousAllAvailable.find((b) => a === b)
    );
    if (difference.length > 0) {
      this.startSpeedup(difference);
    }
    // Check if the timeout is done to set the normal update time again
    if (
      this.speedupStartedTime !== undefined &&
      new Date().getTime() - this.speedupStartedTime > this.speedupTimeout
    ) {
      this.stopSpeedup();
    }

    // Update previous
    this.previousAllAvailable = allAvailable;
  }

  startSpeedup(difference?: string[]): void {
    if (difference) {
      Log.breakline();
      Log.important(
        `'${this.name} tracker' - Stock changes detected. Articles found:\n\n` +
          difference.map((v) => v).join("\n"),
        true
      );
      Log.breakline();
    }
    const endDate = new Date(new Date().getTime() + this.speedupTimeout);
    const endTime = Utils.getHoursMinutesFromDate(endDate);
    Log.breakline();
    Log.important(`'${this.name} tracker' - Speed up until ${endTime} h`, true);
    Log.breakline();
    this.minUpdateSeconds = 0.1;
    this.maxUpdateSeconds = 0.5;
    this.speedupStartedTime = new Date().getTime();
  }

  stopSpeedup(): void {
    Log.breakline();
    Log.important(
      `'${this.name} tracker' - No stock changes for a while, speed up stopped.`,
      true
    );
    Log.breakline();
    this.speedupStartedTime = undefined;
    this.minUpdateSeconds = this.config.minUpdateSeconds;
    this.maxUpdateSeconds = this.config.maxUpdateSeconds;
  }

  checkIfNew(matches: Article[]): void {
    // Check if there is any new article - use difference to only get the new ones
    const difference = matches.filter(
      (a) => !this.previousMatches.find((b) => a.link === b.link)
    );

    if (difference.length > 0) {
      // Adds the item into the cart in the default browser
      if (this.config.openOnBrowser) {
        difference.forEach((a) => {
          open(a.purchaseLink);
        });
      }

      Log.breakline();
      Log.success(`'${this.name} tracker' - New articles found:`, true);
      Log.important("\n" + difference.map((v) => v.match).join("\n\n"));
      Log.breakline();

      // this.notifyService.notify(
      //   `'${this.name} tracker' - New articles found:`,
      //   difference.map((v) => v.match + "\n\n" + v.purchaseLink)
      // );

      this.notifyService.notify(
        `'${this.name} tracker' - New articles found:`,
        difference.map((v) => {
          const directLink = v.link.includes("rastrillo/")
            ? v.purchaseLink
            : "";
          return v.match + "\n\n" + directLink;
        })
      );

      // Try to purchase the new matches if the bot and the category have the purchase enabled
      if (this.purchase && this.config.purchase) {
        this.checkPurchaseConditions(difference);
      }
    } else {
      Log.info(`'${this.name} tracker' - No new articles found...`, true);
    }

    // Update previous
    this.previousMatches = matches;

    this.checking = false;
  }

  // TODO maybe make this one async, and then make the previous loop wait for this result
  checkPurchaseConditions(articles: Article[]): void {
    articles.forEach(async (article) => {
      if (this.purchaseSame === false) {
        if (this.purchaseService.isAlreadyPurchased(article.link)) {
          Log.important(
            `'${this.name} tracker' - Already purchased, skipping:`,
            true
          );
          Log.breakline();
          Log.success([article.match]);
          Log.breakline();
          return;
        }
      }

      if (article.purchase) {
        // this.buying = true;
        Log.success(`'${this.name} tracker' - Start purchase:`, true);
        Log.breakline();
        Log.success([article.match]);
        Log.breakline();
        this.notifyService.notify(`'${this.name} tracker' - Start purchase:`, [
          article.match,
        ]);
        this.purchaseService.markAsPurchased(article.link);
        this.purchaseService
          .purchase(article, this.browser, this.debug)
          .then((success) => {
            if (success) {
              Log.success("Purchase completed!", true);
              this.notifyService.notify(
                `'${this.name} tracker' - Purchase completed!: `,
                [article.match]
              );
            } else {
              Log.error("Purchase failed!", true);
              this.notifyService.notify(
                `'${this.name} tracker' - Purchase failed!: `,
                [article.match]
              );
            }
            Log.breakline();
          });
      }
    });
  }
}
