import "dotenv/config";
import { Browser } from "puppeteer";
import puppeteer from "puppeteer-extra";
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Service } from "typedi";
import config from "../config.json";
import puppeteerConfig from "../puppeteer-config.json";
import ArticleTracker from "./article-tracker";
import { BotConfig, CategoryConfig } from "./models";
import NotifyService from "./services/notify.service";
import PurchaseService from "./services/purchase.service";
import Log from "./utils/log";

// Import environment configurations
@Service()
export default class Bot {
  private readonly purchase = config.purchase;
  private readonly debug = puppeteerConfig.debug;
  private browser!: Browser;
  private readonly botConfig: BotConfig;

  private readonly trackers = new Map<string, ArticleTracker>();

  constructor(
    private readonly notifyService: NotifyService,
    private readonly purchaseService: PurchaseService
  ) {
    // Setup plugins (only once, do not put this in the prepareBrowser method!)
    puppeteer.use(StealthPlugin());
    puppeteer.use(AdblockerPlugin());

    // Detect if the console is closed, then stop the bot completely
    process.on("SIGHUP", () => {
      this.stop();
    });

    this.botConfig = new BotConfig(
      config.notify,
      config.purchase,
      config.saveLogs
    );
  }

  async prepareBrowser(): Promise<boolean> {
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
        return await this.purchaseService.login(this.browser, this.debug);
      } catch (error) {
        Log.error("Exception thrown while logging in: " + error);
        return false;
      }
    }
    return true;
  }

  async start(): Promise<void> {
    Log.Init(this.botConfig.saveLogs ? true : false);
    Log.info("Current configuration:");
    Log.breakline();
    if (this.botConfig.notify) {
      Log.config("Notifications enabled.", true);
      // Setup the telegram bot
      await this.notifyService.startTelegram();
      this.notifyService.getRefreshRequest().subscribe(() => {
        this.refreshTrackers();
      });
      this.notifyService.getShutdownRequest().subscribe(() => {
        this.stop();
      });
    } else {
      Log.config("Notifications disabled.", false);
    }
    if (this.botConfig.purchase) {
      Log.config("Purchase enabled, but still not implemented.", false);
    } else {
      Log.config("Purchase disabled.", false);
    }

    this.prepareBrowser().then((success) => {
      if (!success) {
        this.notifyService.sendShutdownRequest(1);
        return;
      }

      Log.breakline();
      Log.info("Preparing trackers...");

      // Create a tracker for each category to track
      for (const [key, value] of Object.entries(config.categories)) {
        const categoryConfig = new CategoryConfig(value);
        const tracker = new ArticleTracker(
          key,
          categoryConfig,
          this.browser,
          this.purchase,
          this.debug
        );
        this.trackers.set(key, tracker);
        Log.success(`${key}: Article tracker started.`);
      }

      Log.breakline();
      Log.config(
        "-------------------\n*** BOT STARTED ***\n-------------------\n",
        true
      );

      this.notifyService.startMessage();
    });
  }

  async stop(): Promise<void> {
    this.notifyService.stopMessage();
    this.trackers.forEach((tracker) => tracker.stop());
    this.browser.removeAllListeners();
    await this.browser.close();
    setTimeout(() => {
      process.exit(0);
    }, 5000);
  }

  refreshTrackers(): void {
    this.trackers.forEach((tracker, key) => {
      if (tracker) {
        tracker.update(true);
      } else {
        Log.error(
          "Tracker could not be refreshed because it was not found: " + key
        );
      }
    });
  }

  async reconnectTrackers(): Promise<void> {
    this.browser.removeAllListeners();
    await this.browser.close();
    this.prepareBrowser().then(() => {
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
