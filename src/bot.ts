import { plainToClass } from "class-transformer";
import "dotenv/config";
import { Browser } from "puppeteer";
import puppeteer from "puppeteer-extra";
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Service } from "typedi";
import config from "../config.json";
import puppeteerConfig from "../puppeteer-config.json";
import ArticleTracker from "./article-tracker";
import { BotConfig } from "./models";
import LoginService from "./services/login.service";
import NotifyService from "./services/notify.service";
import ShutdownService from "./services/shutdown.service";
import Log from "./utils/log";

// Import environment configurations
@Service()
export default class Bot {
  private readonly debug = puppeteerConfig.debug;
  private readonly plugins = puppeteerConfig.plugins;
  private browser!: Browser;
  private readonly botConfig: BotConfig;

  private readonly trackers = new Map<number, ArticleTracker>();

  constructor(
    private readonly notifyService: NotifyService,
    private readonly loginService: LoginService,
    private readonly shutdownService: ShutdownService
  ) {
    this.botConfig = plainToClass(BotConfig, config);

    if (this.plugins) {
      // Setup puppeteer plugins (only once, do not put this in the prepareBrowser method!)
      puppeteer.use(StealthPlugin());
      puppeteer.use(AdblockerPlugin());
    }

    // Detect if the console is closed, then shutdown the bot completely
    process.on("SIGHUP", () => {
      this.shutdown(0);
    });
  }

  async start(): Promise<void> {
    Log.Init(this.botConfig.saveLogs ? true : false);
    Log.info("Current configuration:");
    Log.breakline();

    this.shutdownService.getShutdownRequest().subscribe((code) => {
      this.shutdown(code);
    });

    if (this.debug) {
      Log.config("Debug enabled.", true);
      Log.breakline();
    }

    if (this.botConfig.notify) {
      Log.config("Notifications enabled.", true);
      // Setup the telegram bot
      const started = await this.notifyService.startTelegram();
      if (!started) {
        this.shutdownService.sendShutdownRequest(1);
        return;
      }
      this.notifyService.getRefreshRequest().subscribe(() => {
        this.refreshTrackers();
      });
    } else {
      Log.config("Notifications disabled.", false);
    }
    if (this.botConfig.purchase) {
      Log.config("Purchase enabled.", true);
    } else {
      Log.config("Purchase disabled.", false);
    }

    this.prepareBrowser().then(
      (success) => {
        Log.breakline();
        Log.info("Preparing trackers...");

        // Create a tracker for each category to track
        this.botConfig.categories.forEach((category, index) => {
          const tracker = new ArticleTracker(
            category.name,
            category,
            this.browser,
            this.botConfig.purchase,
            this.botConfig.purchaseSame,
            this.debug
          );
          this.trackers.set(index, tracker);
          Log.success(`${category.name}: Article tracker started.`);
        });

        Log.breakline();
        Log.config(
          "-------------------\n*** BOT STARTED ***\n-------------------\n",
          true
        );

        this.notifyService.startMessage();
      },
      (error) => {
        return;
      }
    );
  }

  async shutdown(code: number): Promise<void> {
    this.notifyService.shutdownMessage();
    this.trackers.forEach((tracker) => tracker.stop());
    if (this.browser) {
      this.browser.removeAllListeners();
      await this.browser.close();
    }
    setTimeout(() => {
      process.exit(code);
    }, 5000);
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
      this.shutdown(1);
      throw error;
    }

    this.browser.on("disconnected", () => {
      Log.error("Browser has been disconnected! Trying to reconnect...");
      this.reconnectTrackers();
    });

    if (this.botConfig.purchase) {
      try {
        return await this.loginService.login(this.browser, this.debug);
      } catch (error) {
        this.browser.close();
        Log.error("Exception thrown while logging in: " + error);
        throw error;
      }
    }

    Log.success(`Browser ready!`);

    return true;
  }

  refreshTrackers(): void {
    this.trackers.forEach((tracker, key) => {
      if (tracker) {
        tracker.update(false, true);
      } else {
        Log.error(
          "Tracker could not be refreshed because it was not found. Tracker id: " +
            key
        );
      }
    });
  }

  async reconnectTrackers(): Promise<void> {
    this.browser.removeAllListeners();
    this.browser.close(); // Do not await
    this.prepareBrowser().then(
      (success) => {
        if (success) {
          Log.breakline();
          this.trackers.forEach((tracker, key) => {
            if (tracker) {
              Log.important("Reconnecting tracker: " + tracker.getName());
              tracker.reconnect(this.browser);
            } else {
              Log.error(
                "Tracker could not be reconnected because it was not found: Tracker id: " +
                  key
              );
            }
          });
          Log.breakline();
        } else {
          this.shutdown(1);
        }
      },
      (error) => {
        return;
      }
    );
  }
}
