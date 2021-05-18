import { randomNumberRange } from "ghost-cursor/lib/math";
import open from "open";
import { Browser, Page } from "puppeteer";
import sanitizeHtml from "sanitize-html";
import Container from "typedi";
import { Article, ArticleConfig, CategoryConfig } from "./models";
import NotifyService from "./services/notify.service";
import PurchaseService from "./services/purchase.service";
import Log from "./utils/log";
import Utils from "./utils/utils";
import Validator from "./validator";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const html2json = require("html2json").html2json;

/**
 * Instantiable class that will take care of tracking a article, send notifications and purchasing it if needed.
 */
export default class ArticleTracker {
  private readonly name: string;
  private readonly config: CategoryConfig;
  private readonly debug: boolean;
  private readonly purchase: boolean;
  private readonly purchaseSame: boolean;

  private previous: Article[] = [];
  // private buying = false;
  private done = false;
  private checking = false;
  private notifyNextMatch = false;

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
    this.browser = browser;
    this.purchase = purchase;
    this.purchaseSame = purchaseSame;
    this.debug = debug;
    this.start();
  }

  async start(): Promise<void> {
    // Create the page that will be used for this tracker
    await this.newPage();

    // First iteration
    this.update();

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
    this.page = this.debug
      ? await this.browser.newPage()
      : await Utils.createHeadlessPage(this.browser);
  }

  // Infinite loop with a pseudo-random timeout to fetch data imitating a human behaviour
  loop(): void {
    if (this.done) {
      Log.success(`'${this.name} tracker' - Stopped successfully.`, true);
      return;
    }

    setTimeout(() => {
      this.update();
      this.loop();
    }, randomNumberRange(this.config.minUpdateSeconds * 1000, this.config.maxUpdateSeconds * 1000));
  }

  async update(notify?: boolean): Promise<void> {
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

    const matches = this.processData(json);

    // Notify the next matches if requested, ensures the sending of the notification in case the tracker is still checking data
    if (this.notifyNextMatch) {
      this.notifyNextMatch = false;
      this.notifyService.notify(
        `'${this.name} tracker' - All articles available:`,
        matches.map((v) => v.match)
      );
    }

    this.checkIfNew(matches);
  }

  async checkPages(pageCount: number, result: string): Promise<string> {
    await this.page.goto(
      this.config.url + `&page=${pageCount}&order=${this.config.order}`,
      {
        waitUntil: "networkidle2",
      }
    );

    const bodyHTML = await this.page.evaluate(() => document.body.innerHTML);

    // Allow only a restricted set of tags and attributes to clean the HTML
    const clean = sanitizeHtml(bodyHTML, {
      allowedTags: ["article", "a"],
      allowedAttributes: {
        article: ["data-price", "data-name"],
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

  processData(json: any): Article[] {
    // List of items that match the requisites (each item is a string with price, name and URL)
    const matches: Article[] = [];

    if (!json || !json.child) {
      Log.error("Missing data, skipping...");
      return [];
    }

    json.child.forEach((element: any) => {
      if (element.attr && element.tag === "article") {
        const price = element.attr["data-price"];
        const name = element.attr["data-name"].map((v: string) =>
          v.toLowerCase()
        );
        let purchase = true;

        // Check if the price is below the maximum of this category (if defined)
        if (this.config.maxPrice && price >= this.config.maxPrice) {
          return;
        }

        // Check if out of stock
        if (
          element.child.find((c: any) =>
            c.text?.toLowerCase().includes("sin fecha de entrada")
          )
        ) {
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
          const link =
            "https://www.pccomponentes.com" +
            element.child.find((a: any) => a.tag === "a").attr.href;
          const nameText = `[${name.join([" "])}](${link})`;
          const priceText = `*${price} EUR*`;
          const match = `${priceText}\n${nameText}`;
          const article: Article = { name, price, link, match, purchase };
          matches.push(article);
        }
      }
    });
    return matches;
  }

  checkIfNew(matches: Article[]): void {
    // Check if there is any new article - use difference to only get the new ones
    const difference = matches.filter(
      (a) => !this.previous.find((b) => a.link === b.link)
    );

    if (difference.length > 0) {
      Log.breakline();
      Log.success(`'${this.name} tracker' - New articles found:`, true);
      Log.important("\n" + difference.map((v) => v.match).join("\n\n"));
      Log.breakline();

      // opens the url in the default browser
      if (this.config.openOnBrowser) {
        difference
          .map((v) => v.link)
          .forEach((link) => {
            open(link);
          });
      }

      this.notifyService.notify(
        `'${this.name} tracker' - New articles found:`,
        difference.map((v) => v.match)
      );

      // Try to purchase the new matches if the bot and the category have the purchase enabled
      if (this.purchase && this.config.purchase) {
        this.checkPurchaseConditions(difference);
      }
    } else {
      Log.info(`'${this.name} tracker' - No new articles found...`, true);
    }

    // Update previous
    this.previous = matches;

    this.checking = false;
  }

  checkPurchaseConditions(articles: Article[]): void {
    articles.forEach((article) => {
      if (this.purchaseSame === false) {
        if (this.purchaseService.isAlreadyPurchased(article.link)) {
          Log.important(
            `'${this.name} tracker' - Already purchased, skipping:`
          );
          Log.breakline();
          Log.success([article.match]);
          Log.breakline();
          return;
        } else {
          this.purchaseService.markAsPurchased(article.link);
        }
      }
      if (article.purchase) {
        Log.success(`'${this.name} tracker' - Start purchase:`);
        Log.breakline();
        Log.success([article.match]);
        Log.breakline();
        Log.critical("Purchase still not implemented.");
        Log.breakline();
      }
    });

    // const purchaseConditions = this.config.purchaseConditions;
    // if (!purchaseConditions) {
    //   Log.error(
    //     `Purchase is enabled, but the article tracker '${this.id}' has no purchase conditions. Check the config.json file.`
    //   );
    //   return;
    // }
    //
    // // Check if the purchase conditions are met
    // purchaseConditions.forEach((conditions: ArticleConfig) => {
    //   if (
    //     !this.buying &&
    //     conditions.price >= article.price &&
    //     conditions.model.every((v: string) =>
    //       article.name.includes(v.toLowerCase())
    //     )
    //   ) {
    //     if (!this.purchased.map((v) => v.link).includes(article.link)) {
    //       this.buy(article, conditions);
    //     }
    //   }
    // });
  }

  //   buy(article: Article, conditions: ArticleConfig): void {
  //     this.purchased.push(article);
  //     Log.success(
  //       `'${this.id} tracker' - Nice price, starting the purchase!` +
  //         [article.match]
  //     );
  //     this.notifyService.notify(
  //       `'${this.id} tracker' - Nice price, starting the purchase!`,
  //       [article.match]
  //     );

  //     this.buying = true;
  //     this.purchaseService
  //       .run(article.link, conditions.price, 8000)
  //       .then((result: boolean) => {
  //         if (result) {
  //           Log.success(`'${this.id} tracker' - Purchased! ` + [article.match]);
  //           this.notifyService.notify(`'${this.id} tracker' - Purchased! `, [
  //             article.match,
  //           ]);
  //           if (!this.config.purchaseMultiple) {
  //             this.done = true;
  //             this.notifyService.notify(
  //               `'${this.id} tracker' - Purchase completed, tracker will be stopped.`
  //             );
  //           }
  //         } else {
  //           Log.error(
  //             `'${this.id} tracker' - Purchase failed: ` + [article.match]
  //           );
  //           this.notifyService.notify(
  //             `'${this.id} tracker' - Purchase failed: `,
  //             [article.match]
  //           );
  //           this.buying = false;
  //         }
  //       });
  //   }
}
