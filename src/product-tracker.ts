import { Browser, Page } from "puppeteer";
import Container from "typedi";
import { ProductConfigModel, ProductModel } from "./models";
import NotifyService from "./services/notify.service";
import PurchaseService from "./services/purchase.service";
import Log from "./utils/log";
import Utils from "./utils/utils";

const sanitizeHtml = require("sanitize-html");
var html2json = require("html2json").html2json;

/**
 * Instantiable class that will take care of tracking a product, send notifications and purchasing it if needed.
 */
export default class ProductTracker {
  private readonly id: string;

  private readonly config: ProductConfigModel;
  private browser: Browser;

  private readonly debug: boolean;
  private readonly purchase: boolean;

  private previous: string[] = [];
  private readonly purchased: string[] = [];
  private buying = false;
  private done = false;
  private page!: Page;

  // Inject needed services
  private readonly purchaseService = Container.get(PurchaseService);
  private readonly notifyService = Container.get(NotifyService);

  constructor(
    id: string,
    config: ProductConfigModel,
    browser: Browser,
    purchase: boolean,
    debug: boolean
  ) {
    this.id = id;
    this.config = config;
    this.browser = browser;
    this.purchase = purchase;
    this.debug = debug;
    this.start();
  }

  async start() {
    // Create the page that will be used for this tracker
    await this.newPage();

    // First iteration
    this.update();

    // Infinite loop
    this.loop();
  }

  reconnect(browser: Browser) {
    this.browser = browser;
    this.newPage();
  }

  async newPage() {
    this.page = this.debug
      ? await this.browser.newPage()
      : await Utils.createHeadlessPage(this.browser);
  }

  // Infinite loop with a pseudo-random timeout to fetch data imitating a human behaviour
  loop() {
    if (this.done) {
      Log.success(`'${this.id} tracker' - Stopped successfully.`, true);
      return;
    }

    setTimeout(() => {
      this.update();
      this.loop();
    }, Utils.randomTimeout(this.config.minUpdateSeconds, this.config.maxUpdateSeconds));
  }

  async update() {
    if (this.done) {
      Log.important(`'${this.id} tracker' - Tracker is stopped.`, true);
      this.notifyService.notify(`'${this.id} tracker' - Tracker is stopped.`);
      return;
    }

    if (!this.browser.isConnected()) {
      Log.error(`'${this.id} tracker' - Browser is disconnected!`, true);
      return;
    }

    // Relaunch page if it is closed
    if (this.page.isClosed()) {
      await this.newPage();
    }

    try {
      await this.page.goto(this.config.url, {
        waitUntil: "networkidle2",
      });
    } catch (error) {
      Log.error(`'${this.id} tracker' - Page error: ${error}`, true);
      return;
    }

    const bodyHTML = await this.page.evaluate(() => document.body.innerHTML);

    // Allow only a restricted set of tags and attributes to clean the HTML
    const clean = sanitizeHtml(bodyHTML, {
      allowedTags: ["article", "a"],
      allowedAttributes: {
        article: ["data-price", "data-name"],
        a: ["href"],
      },
    });

    // Convert the cleaned HTML output to JSON objects
    const json = html2json(clean);

    if (!json || !json.child) {
      Log.error("Missing data, skipping...");
      return;
    }

    this.processData(json);
  }

  processData(json: any) {
    // List of items that match the requisites (each item is a string with price, name and URL)
    var matches: string[] = [];

    json.child.forEach((element: any) => {
      if (element.attr) {
        const price = element.attr["data-price"];
        const name = element.attr["data-name"].map((v: string) =>
          v.toLowerCase()
        );
        // Check if the price is in range
        if (element.tag === "article" && price < this.config.maxPrice) {
          // Check if any of the models are in the title of the product
          if (
            this.config.models.some((el: string) =>
              name.includes(el.toLowerCase())
            )
          ) {
            //  Build link, name and price of the product in a single string
            const link =
              "https://www.pccomponentes.com" +
              element.child.find((a: any) => a.tag === "a").attr.href;
            const nameText = `[${name.join([" "])}](${link})`;
            const priceText = `*${price} EUR*`;
            const match = `${priceText}\n${nameText}`;

            const product: ProductModel = { name, price, link, match };

            if (this.purchase) {
              this.checkPurchaseConditions(product);
            }

            matches.push(match);
          }
        }
      }
    });
    this.checkDifferences(matches);
  }

  checkDifferences(matches: string[]) {
    // Check if there is any new card - use difference to only get the new cards
    const difference = matches.filter((x) => !this.previous.includes(x));
    if (difference.length > 0) {
      Log.breakline();
      Log.success(`'${this.id} tracker' - Products found:`, true);
      Log.important("\n" + difference.join("\n"));
      Log.breakline();

      this.notifyService.notify(
        `'${this.id} tracker' - PRODUCTS FOUND:`,
        difference
      );
    } else {
      Log.info(`'${this.id} tracker' - No new products found...`, true);
    }
    // Update previous
    this.previous = matches;
  }

  checkPurchaseConditions(product: ProductModel) {
    const purchaseConditions = this.config.purchaseConditions;
    if (!purchaseConditions) {
      Log.error(
        `Purchase is enabled, but the product '${this.id}' has no purchase conditions. Check the config.json file.`
      );
      return;
    }

    // Check if the purchase conditions are met
    purchaseConditions.forEach((combo: any) => {
      if (
        !this.buying &&
        combo.price >= product.price &&
        combo.model.every((v: string) => product.name.includes(v.toLowerCase()))
      ) {
        if (!this.purchased.includes(product.link)) {
          this.buy(product, combo);
        }
      }
    });
  }

  buy(product: ProductModel, combo: any) {
    this.purchased.push(product.link);
    Log.success(
      `'${this.id} - Nice price, starting the purchase!` + [product.match]
    );
    this.notifyService.notify(
      `'${this.id} - Nice price, starting the purchase!` + [product.match]
    );

    this.buying = true;
    this.purchaseService
      .run(product.link, combo.price, 8000)
      .then((result: any) => {
        if (result) {
          Log.success(`'${this.id} - Purchased! ` + [product.match]);
          this.notifyService.notify(
            `'${this.id} - Purchased! ` + [product.match]
          );
          if (!this.config.purchaseMultiple) {
            this.done = true;
          }
        } else {
          Log.error(`'${this.id} - Purchase failed: ` + [product.match]);
          this.notifyService.notify(
            `'${this.id} - Purchase failed: ` + [product.match]
          );
          this.buying = false;
        }
      });
  }
}
