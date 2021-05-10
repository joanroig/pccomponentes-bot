import { Browser } from "puppeteer";
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Service } from "typedi";
import * as config from "../config.json";
import Log from "./utils/log";
import ProductTracker from "./product-tracker";
import * as puppeteerConfig from "./puppeteer-config.json";
import NotifyService from "./services/notify.service";
import PurchaseService from "./services/purchase.service";

const puppeteer = require("puppeteer-extra");

@Service()
export default class Bot {
  // Global variables

  private purchase = config.purchase;
  private debug = puppeteerConfig.debug;
  private browser!: Browser;

  private trackers: Map<string, ProductTracker> = new Map<
    string,
    ProductTracker
  >();

  constructor(
    private readonly notifyService: NotifyService,
    private readonly purchaseService: PurchaseService
  ) {}

  async prepare() {
    puppeteer.use(StealthPlugin());
    puppeteer.use(AdblockerPlugin());

    let configData = this.debug
      ? puppeteerConfig.browserOptions.debug
      : puppeteerConfig.browserOptions.headless;

    this.browser = await puppeteer.launch(configData);
    if (this.purchase) {
      return await this.purchaseService.login(this.browser, this.debug);
    }
  }

  start() {
    Log.breakline();
    Log.info("Current configuration:");
    Log.breakline();
    if (config.notify) {
      Log.config("Notifications enabled.", true);
      // Setup the telegram bot
      this.notifyService.startTelegram();
      this.notifyService.getRequestUpdates().subscribe((update) => {
        if (update) {
          // this.updateData();
        }
      });
    } else {
      Log.config("Notifications disabled.", false);
    }
    if (config.purchase) {
      Log.config("Purchase enabled, but still not implemented.", false);
    } else {
      Log.config("Purchase disabled.", false);
    }

    this.prepare().then((ready) => {
      Log.breakline();

      // Create a tracker for each product to track
      for (const [key, value] of Object.entries(config.products)) {
        let tracker = new ProductTracker(
          key,
          value,
          this.browser,
          this.purchase,
          this.debug
        );
        this.trackers.set(key, tracker);
        Log.success(`${key}: Product tracker started.`);
      }

      Log.breakline();
      Log.config(
        "-------------------\n*** BOT STARTED ***\n-------------------\n",
        true
      );

      this.notifyService.notify(
        "BOT STARTED\nTelegram commands you can write here:\n\n'hi' - Will tell you if the bot is running\n'refresh' - Will force a refresh of all tracker."
      );
    });
  }
}
