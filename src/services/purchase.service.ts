import { Browser } from "puppeteer";
import { Service } from "typedi";
import Log from "../utils/log";
import Utils from "../utils/utils";
const { randomNumberRange } = require("ghost-cursor/lib/math");
const { createCursor, getRandomPagePoint } = require("ghost-cursor");

// Import environment configurations
require("dotenv").config();

@Service()
export default class PurchaseService {
  email: string = process.env.PCC_USER!;
  password: string = process.env.PCC_PASS!;
  link: string = "";
  maxPrice: number = 0;
  refreshRate: number = 0;
  phone?: string;

  constructor() {}

  async run(link: any, maxPrice: any, refreshRate: any) {
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
  }

  async login(browser: Browser, debug: boolean) {
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
    });
    await Utils.humanType(loginPage, this.email.trim());

    await cursor.click("input[data-cy='password']", {
      waitForClick: randomNumberRange(1000, 3000),
      moveDelay: randomNumberRange(1000, 3000),
      paddingPercentage: 20,
    });
    await Utils.humanType(loginPage, this.password.trim());

    await cursor.click("button[data-cy='log-in']", {
      waitForClick: randomNumberRange(1000, 3000),
      moveDelay: randomNumberRange(1000, 3000),
      paddingPercentage: 20,
    });

    await loginPage.waitForTimeout(10000);

    let success = loginPage.url().includes("https://www.pccomponentes.com/");

    if (success) {
      Log.success("Successfully logged in!");
    } else {
      Log.critical("Login failed. Check your credentials.");
      process.exit(1);
    }

    await loginPage.close();

    return true;
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
  //               `Product is not yet in stock (${new Date().toUTCString()})`
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
  //               console.log(`PRODUCT IN STOCK! Starting buy process`);
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

  //   // clicks on buy button on product page. There are 3 buttons that show up depending on the current window size.
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

  async sleep(msec: number) {
    return new Promise((resolve) => setTimeout(resolve, msec));
  }
}
