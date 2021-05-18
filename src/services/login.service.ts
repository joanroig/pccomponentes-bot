import { createCursor, getRandomPagePoint } from "ghost-cursor";
import { randomNumberRange } from "ghost-cursor/lib/math";
import { Browser } from "puppeteer";
import { Service } from "typedi";
import Log from "../utils/log";
import Utils from "../utils/utils";
import NotifyService from "./notify.service";

@Service()
export default class LoginService {
  private readonly email: string;
  private readonly password: string;

  private loginAttempts = 0;
  private readonly maxLoginAttempts = 3;

  constructor(private readonly notifyService: NotifyService) {
    this.email = process.env.PCC_USER || "";
    this.password = process.env.PCC_PASS || "";
  }

  async login(browser: Browser, debug: boolean): Promise<boolean> {
    if (this.email == "" || this.password == "") {
      Log.breakline();
      Log.critical("Login failed due missing data. Check your credentials.");
      Log.breakline();
      this.notifyService.notify(
        `Login attempt failed due missing data, check the credentials. Bot stopped.`
      );
      return false;
    }

    const loginPage = debug
      ? await browser.newPage()
      : await Utils.createHeadlessPage(browser);

    Log.breakline();
    Log.info("Attempting login...");

    await loginPage.goto("https://www.pccomponentes.com/login", {
      waitUntil: "networkidle2",
    });

    await loginPage.waitForTimeout(randomNumberRange(1000, 3000));

    const cursor = createCursor(loginPage, await getRandomPagePoint(loginPage));

    await cursor.click("input[data-cy='email']", {
      waitForClick: randomNumberRange(1000, 3000),
      moveDelay: randomNumberRange(1000, 3000),
      paddingPercentage: 20,
      waitForSelector: 1000,
    });
    await Utils.humanType(loginPage, this.email.trim());

    await cursor.click("input[data-cy='password']", {
      waitForClick: randomNumberRange(1000, 3000),
      moveDelay: randomNumberRange(1000, 3000),
      paddingPercentage: 20,
      waitForSelector: 1000,
    });
    await Utils.humanType(loginPage, this.password.trim());

    await cursor.click("button[data-cy='log-in']", {
      waitForClick: randomNumberRange(1000, 3000),
      moveDelay: randomNumberRange(1000, 3000),
      paddingPercentage: 20,
      waitForSelector: 1000,
    });

    await loginPage.waitForTimeout(10000);

    const success = !loginPage.url().includes("pccomponentes.com/login");

    if (success) {
      Log.success("Successfully logged in!");
      this.loginAttempts = 0;
      await loginPage.close();
      return true;
    } else {
      this.loginAttempts++;
      if (this.loginAttempts >= this.maxLoginAttempts) {
        Log.critical("Login failed three times. Check your credentials.");
        this.notifyService.notify(
          `Login attempt failed, check the credentials. Bot stopped.`
        );
        return false;
      } else {
        Log.error("Login attempt failed. Trying again in 5 seconds...");
        await loginPage.waitForTimeout(5000);
        await loginPage.close();
        return this.login(browser, debug);
      }
    }
  }
}
