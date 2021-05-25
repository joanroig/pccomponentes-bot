import { Browser } from "puppeteer";
import { Service } from "typedi";
import { Article } from "../models";
import Log from "../utils/log";
import Utils from "../utils/utils";
import NotifyService from "./notify.service";

@Service()
export default class PurchaseService {
  private readonly purchased: string[] = [];

  constructor(private readonly notifyService: NotifyService) {}

  isAlreadyPurchased(link: string): boolean {
    return this.purchased.includes(link);
  }

  markAsPurchased(link: string): void {
    this.purchased.push(link);
  }

  async purchase(
    article: Article,
    browser: Browser,
    debug: boolean
  ): Promise<boolean> {
    const page = await Utils.createPage(browser, debug, false);

    await page.goto(article.purchaseLink, { waitUntil: "networkidle2" });

    let error = await page.evaluate(() => {
      return document.querySelector(".alert-danger > p")?.innerHTML;
    });

    // Error found, return
    if (error) {
      Log.error(error);
      return false;
    }

    const warning = await page.evaluate(() => {
      return document.querySelector(".alert-warning > p")?.innerHTML;
    });

    // Go to the checkout
    // New url:
    // https://www.pccomponentes.com/cart/order?toNewCheckout=1
    await page.goto(
      "https://www.pccomponentes.com/cart/order?toNewCheckout=0",
      {
        waitUntil: "networkidle2",
      }
    );

    // This may happen after trying to do the order, try again
    // Warning example: El artículo XXX tiene una limitación de stock por cliente y sus unidades se han actualizado a 1
    if (warning) {
      Log.error(warning);
      await page.goto(
        "https://www.pccomponentes.com/cart/order?toNewCheckout=0",
        {
          waitUntil: "networkidle2",
        }
      );
    }

    if (!page.url().includes("https://www.pccomponentes.com/cart/order")) {
      Log.error("Order failed, the navigation to the order page was rejected.");
      return false;
    }

    // WE ARE IN THE CHECKOUT PAGE

    error = await page.evaluate(() => {
      return document.querySelector(".alert-danger > p")?.innerHTML;
    });

    // Error found in the checkout page, return
    if (error) {
      Log.error(error);
      return false;
    }

    await page.waitForTimeout(5000);

    // Get all articles
    const articlesToPurchase = await page.evaluate(
      "document.getElementsByClassName('c-articles-to-send__list-items__item-text-info')"
    );

    Log.important(JSON.stringify(articlesToPurchase));

    // articlesToPurchase?.forEach((element: any) => {
    //   Log.success(element.childNodes[0].textContent.trim());
    // });

    Log.important("Attempting buy");

    await page.waitForTimeout(2000);

    // Click the transfer, if available

    // const transfer = await page.evaluate(
    //   "document.getElementsByClassName('tipopago5')[0].getElementsByClassName('c-indicator')[0]"
    // );

    // transfer.click();

    await page.evaluate(() => {
      const transfer = document
        .getElementsByClassName("tipopago5")[0]
        .getElementsByClassName("c-indicator")[0] as HTMLElement;
      transfer.scrollIntoView({ behavior: "smooth" });
      transfer.click();
    });

    await page.waitForTimeout(4000);
    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    await page.waitForTimeout(2000);

    await page.evaluate(() => {
      const conditions = document.getElementById(
        "pccom-conditions"
      ) as HTMLElement;
      conditions.scrollIntoView({ behavior: "smooth" });
      conditions.click();
    });

    // await page.$eval("#pccom-conditions", (el) => el.click());
    // await page.$eval("#GTM-carrito-finalizarCompra", (el) => el.click());
    // await page.click('[id="pccom-conditions"]');
    await page.waitForTimeout(2000);

    await page.evaluate(() => {
      const end = document.getElementById(
        "GTM-carrito-finalizarCompra"
      ) as HTMLElement;
      end.scrollIntoView({ behavior: "smooth" });
      end.click();
    });

    // https://www.pccomponentes.com/cart/order/finished/ok

    // await page.click('[id="GTM-carrito-finalizarCompra"]');

    // const conditions = await page.evaluate("#pccom-conditions");
    // conditions.click();
    // const purchase = await page.evaluate("#GTM-carrito-finalizarCompra");
    // purchase.click();

    // Reference error messages

    // Only one, already in cart!
    // "Solo es posible tener una unidad de un artículo de rastrillo"

    // Not found
    // Lo sentimos, no podemos encontrar lo que buscas

    // No stock
    // El artículo que has intentado añadir no tiene stock

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
    // https:
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
}
