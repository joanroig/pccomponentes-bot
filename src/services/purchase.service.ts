import { createCursor, getRandomPagePoint } from "ghost-cursor";
import { randomNumberRange } from "ghost-cursor/lib/math";
import { Browser } from "puppeteer";
import { Service } from "typedi";
import Log from "../utils/log";
import Utils from "../utils/utils";
import NotifyService from "./notify.service";

@Service()
export default class PurchaseService {
  private readonly email: string;
  private readonly password: string;
  // private readonly link: string;
  // private readonly maxPrice = 0;
  // private readonly refreshRate = 0;
  private loginAttempts = 0;
  private readonly maxLoginAttempts = 3;

  constructor(private readonly notifyService: NotifyService) {
    this.email = process.env.PCC_USER || "";
    this.password = process.env.PCC_PASS || "";
    if (this.email == "" || this.password == "") {
      Log.critical("Login failed due missing data. Check your credentials.");
      this.notifyService.notify(
        `Login attempt failed due missing data, check the credentials. Bot stopped.`
      );
      this.notifyService.sendShutdownRequest(1);
    }
  }

  async run(link: any, maxPrice: any, refreshRate: any): Promise<boolean> {
    // (this.link = link),
    //   (this.maxPrice = maxPrice),
    //   (this.refreshRate = refreshRate);
    // try {
    //   await this.runItem(this.driver);
    //   return await this.buyItem(this.driver);
    // } catch (err) {
    //   console.error("ERROR NOT CAUGHT WHILE RUNNING BOT. MORE INFO BELOW");
    //   console.error(err);
    // }
    return false;
  }

  async login(browser: Browser, debug: boolean): Promise<boolean> {
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
  // async runItem(driver: WebDriver) {
  //   await driver
  //     .navigate()
  //     .to(this.link)
  //     .then(async () => {
  //       let stock: boolean = false;
  //       let price: number | undefined;
  //       // this loop will play till stock is available, then to the next step
  //       while (!stock) {
  //         await driver
  //           .navigate()
  //           .refresh()
  //           .catch(() => driver.navigate().to(this.link));
  //         await driver
  //           .findElement(By.id("notify-me"))
  //           .then(() =>
  //             console.log(
  //               `Article is not yet in stock (${new Date().toUTCString()})`
  //             )
  //           )
  //           .catch(async () => {
  //             await driver
  //               .findElement(By.id("precio-main"))
  //               .then(
  //                 async (value) =>
  //                   (price = parseFloat(await value.getAttribute("data-price")))
  //               )
  //               .catch(() => console.error("Couldn't find item price"));
  //             // checks if current price is below max price before continuing
  //             if (price && price <= this.maxPrice) {
  //               stock = true;
  //               console.log(`ARTICLE IN STOCK! Starting buy process`);
  //             } else {
  //               console.log(
  //                 `Price is above max. Max price set - ${
  //                   this.maxPrice
  //                 }€. Current price - ${price || "not defined"}€`
  //               );
  //             }
  //           });
  //         await this.sleep(this.refreshRate);
  //       }
  //     });
  // }

  // async buyItem(driver: WebDriver) {
  //   await this.sleep(2000);

  //   await driver
  //     .findElement(
  //       By.className("btn btn-block btn-primary btn-lg m-t-1 accept-cookie")
  //     )
  //     .then((value) => value.click())
  //     .catch(() => console.log("No cookie accept button to click"));

  //   // clicks on buy button on article page. There are 3 buttons that show up depending on the current window size.
  //   // the bot will attempt to click all of them
  //   const buyButtons = await driver.findElements(By.className("buy-button"));
  //   let clickedButton = false;
  //   buyButtons.forEach(async (buyButton) => {
  //     if (!clickedButton)
  //       try {
  //         await buyButton.click();
  //         clickedButton = true;
  //       } catch {
  //         console.log("Buy button not found, attempting another one...");
  //       }
  //   });

  //   await this.sleep(3000);
  //   await driver
  //     .findElement(By.id("GTM-carrito-realizarPedidoPaso1"))
  //     .then((value) => value.click());
  //   await this.sleep(3000);

  //   // Automatic scroll
  //   await driver
  //     .findElement(By.className("tipopago5"))
  //     .then(async (element) => {
  //       if (element) {
  //         driver.executeScript(
  //           'arguments[0].scrollIntoView({behavior: "smooth"});',
  //           element
  //         );
  //         console.info("Scrolled!");
  //         await this.sleep(1000).then((done) => {
  //           // Click the inner element
  //           element.findElement(By.className("c-input c-radio")).click();
  //           console.info("Money transfer clicked!");
  //         });
  //       } else {
  //         console.error("Couldn't find the payment box. :(");
  //         return false;
  //       }
  //     });

  //   await this.sleep(1000);
  //   driver.executeScript('window.scrollTo({top: 0, behavior: "smooth"})');
  //   await this.sleep(3000);

  //   await driver
  //     .findElements(By.className("c-indicator margin-top-0"))
  //     .then((value) => value[0].click())
  //     .catch((reason) => {
  //       console.error(reason);
  //       return false;
  //     });
  //   await this.sleep(500);
  //   await driver
  //     .findElement(By.id("GTM-carrito-finalizarCompra"))
  //     .then((value) => value.click())
  //     .catch(() => {
  //       console.error("Couldn't click the buy button. :(");
  //       return false;
  //     });
  //   console.info("PURCHASE SUCCESSFUL");
  //   await this.sleep(1000);
  //   return true;
  // }

  async sleep(msec: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, msec));
  }
}
