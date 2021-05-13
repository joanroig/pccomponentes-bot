import { Browser } from "puppeteer";
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Service } from "typedi";
import * as config from "../config.json";
import ProductTracker from "./product-tracker";
import * as puppeteerConfig from "./puppeteer-config.json";
import NotifyService from "./services/notify.service";
import PurchaseService from "./services/purchase.service";
import Log from "./utils/log";

// Import environment configurations
require("dotenv").config();

const puppeteer = require("puppeteer-extra");

@Service()
export default class Bot {
  private readonly purchase = config.purchase;
  private readonly debug = puppeteerConfig.debug;
  private browser!: Browser;

  private readonly trackers = new Map<string, ProductTracker>();

  constructor(
    private readonly notifyService: NotifyService,
    private readonly purchaseService: PurchaseService
  ) {
    // Setup plugins (only once, do not put this in the prepareBrowser method!)
    puppeteer.use(StealthPlugin());
    puppeteer.use(AdblockerPlugin());
  }

  async prepareBrowser() {
    Log.breakline();
    Log.info("Preparing browser...");

    const configData = this.debug
      ? puppeteerConfig.browserOptions.debug
      : puppeteerConfig.browserOptions.headless;

    try {
      this.browser = await puppeteer.launch(configData);
    } catch (error) {
      Log.critical("Browser cannot be launched: " + error);
      process.exit(1);
    }

    this.browser.on("disconnected", () => {
      Log.error("Browser has been disconnected! Trying to reconnect...");
      this.reconnectTrackers();
    });

    Log.success(`Browser ready!`);

    if (this.purchase) {
      try {
        await this.purchaseService.login(this.browser, this.debug);
      } catch (error) {
        Log.error("Exception thrown while logging in: " + error);
      }
    }
  }

  start() {
    Log.breakline();
    Log.info(process.env.npm_package_name);
    Log.info("Version " + process.env.npm_package_version);
    Log.breakline();
    Log.info("Current configuration:");
    Log.breakline();
    if (config.notify) {
      Log.config("Notifications enabled.", true);
      // Setup the telegram bot
      this.notifyService.startTelegram();
      this.notifyService.getRequestUpdates().subscribe((update) => {
        this.updateTrackers();
      });
    } else {
      Log.config("Notifications disabled.", false);
    }
    if (config.purchase) {
      Log.config("Purchase enabled, but still not working.", false);
    } else {
      Log.config("Purchase disabled.", false);
    }

    this.prepareBrowser().then((ready) => {
      Log.breakline();
      Log.info("Preparing trackers...");

      // Create a tracker for each product to track
      for (const [key, value] of Object.entries(config.products)) {
        const tracker = new ProductTracker(
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

      this.notifyService.startMessage();
    });
  }

  updateTrackers() {
    this.trackers.forEach((tracker, key) => {
      if (tracker) {
        tracker.update();
      } else {
        Log.error(
          "Tracker could not be updated because it was not found: " + key
        );
      }
    });
  }

  reconnectTrackers() {
    this.prepareBrowser().then((ready) => {
      Log.breakline();
      this.trackers.forEach((tracker, key) => {
        if (tracker) {
          Log.important("Reconnecting tracker: " + key);
          tracker.reconnect(this.browser);
        } else {
          Log.error(
            "Tracker could not be reconnected because it was not found: " + key
          );
        }
      });
      Log.breakline();
    });
  }
}
