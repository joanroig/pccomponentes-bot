import { Browser, Page } from "puppeteer";
import Container from "typedi";
import Log from "./utils/log";
import {
  ProductConfigModel,
  ProductModel,
  PurchaseConditionsModel,
} from "./models";
import NotifyService from "./services/notify.service";
import PurchaseService from "./services/purchase.service";
import Utils from "./utils/utils";

const sanitizeHtml = require("sanitize-html");
var html2json = require("html2json").html2json;

/**
 * Instantiable class that will take care of tracking a product, send notifications and purchasing it if needed.
 */
export default class ProductTracker {
  private id: string;

  private config: ProductConfigModel;
  private browser: Browser;

  private debug: boolean;
  private purchase: boolean;

  // Inject needed services
  private readonly purchaseService = Container.get(PurchaseService);
  private readonly notifyService = Container.get(NotifyService);

  private previous: string[] = [];
  private purchased: string[] = [];
  private buying = false;
  private page!: Page;

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

  async newPage() {
    this.page = this.debug
      ? await this.browser.newPage()
      : await Utils.createHeadlessPage(this.browser);
  }

  // Infinite loop with a pseudo-random timeout to fetch data imitating a human behaviour
  loop() {
    // Math.random() * (max - min + 1) + min); // Generate a number in a range
    var rand =
      Math.round(
        Math.random() *
          (this.config.maxUpdateSeconds * 1000 -
            this.config.minUpdateSeconds * 1000 +
            1)
      ) +
      this.config.minUpdateSeconds * 1000;
    setTimeout(() => {
      this.update();
      this.loop();
    }, rand);
  }

  async update() {
    // Relaunch page if it is closed
    if (this.page.isClosed()) {
      await this.newPage();
    }

    await this.page.goto(this.config.url, {
      waitUntil: "networkidle2",
    });

    let bodyHTML = await this.page.evaluate(() => document.body.innerHTML);

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
    // console.log(json);

    // List of items that match the requisites (each item is a string with price, name and URL)
    var matches: string[] = [];

    if (!json || !json.child) {
      Log.error("Missing data, skipping...");
      return;
    }

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
            let link =
              "https://www.pccomponentes.com" +
              element.child.find((link: any) => link.tag === "a").attr.href;
            let nameText = "[" + name.join([" "]) + "](" + link + ")";
            let priceText = "*" + price + " EUR*";
            let match = priceText + "\n" + nameText;

            let product: ProductModel = { name, price, link, match };

            if (this.purchase) {
              if (this.config.purchaseConditions) {
                this.checkPurchaseConditions(
                  product,
                  this.config.purchaseConditions
                );
              } else {
                Log.error(
                  `Purchase is enabled, but the product '${this.id}' has no purchase conditions. Check the config.json file.`
                );
              }
            }

            matches.push(match);
          }
        }
      }
    });

    // Check if there is any new card - we use difference to only get the new cards: https://stackoverflow.com/questions/1187518/how-to-get-the-difference-between-two-arrays-in-javascript
    const difference = matches.filter((x) => !this.previous.includes(x));
    if (difference.length > 0) {
      Log.breakline();
      Log.success(`'${this.id}' - Products found:`, true);
      Log.important("\n" + difference.join("\n"));
      Log.breakline();

      this.notifyService.notify(`'${this.id}' - PRODUCTS FOUND:`, difference);
    } else {
      Log.info(`'${this.id}' - No new products found...`, true);
    }
    // Update previous
    this.previous = matches;
  }

  checkPurchaseConditions(
    product: ProductModel,
    purchaseConditions: PurchaseConditionsModel[]
  ) {
    // Check if the buy conditions are met
    purchaseConditions.forEach((combo: any) => {
      if (
        !this.buying &&
        combo.price >= product.price &&
        combo.model.every((v: string) => product.name.includes(v.toLowerCase()))
      ) {
        if (!this.purchased.includes(product.link)) {
          this.purchased.push(product.link);
          Log.success("*Nice price, start the purchase!!!*");
          Log.important(combo);
          this.buying = true;
          this.purchaseService
            .run(product.link, combo.price, 8000)
            .then((result: any) => {
              if (result) {
                Log.success(
                  "\n------------\n*** PURCHASE FINISHED ***\n------------\n"
                );
                this.notifyService.notify("PURCHASED!\n\n", [product.match]);
                if (!this.config.purchaseMultiple) {
                  process.exit(0);
                }
              } else {
                Log.error("Purchase failed...");
                this.buying = false;
              }
            });
        }
      }
    });
  }
}
