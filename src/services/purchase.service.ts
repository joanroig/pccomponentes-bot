import { transformAndValidate } from "class-transformer-validator";
import { Browser } from "puppeteer";
import { BehaviorSubject } from "rxjs";
import { Service } from "typedi";
import { Article, CartData } from "../models";
import Log from "../utils/log";
import Utils from "../utils/utils";
import NotifyService from "./notify.service";

@Service()
export default class PurchaseService {
  private readonly purchased: string[] = [];
  private readonly tryTransfer = false;

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
    Log.important("Purchase process started", true);
    Log.breakline();

    // Create a page with intercept enabled for fast scrapping
    const page = await Utils.createPage(browser, debug, true);
    let purchaseUrl = article.purchaseLink;

    // Check if the link contains the article id by checking URL location (should be in 'rastrillo')
    if (!purchaseUrl.includes("rastrillo/")) {
      // Invalid purchase link, scrap the ID from the article page asap (navigate without await, then wait until the selector is rendered)
      page.goto(article.link);
      await page.waitForSelector("#contenedor-principal");

      const articleId = await page.evaluate(() => {
        return document
          .querySelector("#contenedor-principal")
          ?.getAttribute("data-id");
      });

      if (!articleId) {
        Log.error("Unable to get the article id");
        return false;
      }

      purchaseUrl = "https://www.pccomponentes.com/cart/addItem/" + articleId;
    }

    Log.important("Adding to cart. Using direct url:\n" + purchaseUrl, true);
    Log.breakline();

    await page.goto(purchaseUrl, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForTimeout(200);

    const cartError = await page.evaluate(() => {
      return document
        .querySelector(".alertBox")
        ?.querySelector(".alert-danger > p")?.innerHTML;
    });

    // Error found, return
    if (cartError) {
      Log.error(cartError, true);
      return false;
    }

    // Disable intercept for purchasing (load everything in it)
    page.removeAllListeners("request");
    await page.setRequestInterception(false);

    // Go to the checkout (url may change in the future: https://www.pccomponentes.com/cart/order?toNewCheckout=1)
    await page.goto("https://www.pccomponentes.com/cart/summary", {
      waitUntil: "networkidle2",
    });

    // await page.waitForTimeout(200);

    const purchaseWarning = await page.evaluate(() => {
      return document
        .querySelector(".alertBox")
        ?.querySelector(".alert-warning > p")?.innerHTML;
    });

    // This may happen after trying to do the order, try again
    // Warning example: El artículo XXX tiene una limitación de stock por cliente y sus unidades se han actualizado a 1
    if (purchaseWarning) {
      Log.important("Warning found, trying again:\n" + purchaseWarning, true);
      await page.goto("https://www.pccomponentes.com/cart/summary", {
        waitUntil: "networkidle2",
      });
    }

    if (!page.url().includes("https://www.pccomponentes.com/cart/summary")) {
      Log.error(
        "Order failed, the navigation to the order page was rejected.",
        true
      );
      return false;
    }

    // WE ARE IN THE CHECKOUT PAGE

    // Do a quick cart check
    const forceStop = new BehaviorSubject<boolean>(false);
    this.quickCartCheck(browser, debug, forceStop);

    await page.waitForTimeout(2000);

    const purchaseError = await page.evaluate(() => {
      return document
        .querySelector("#alertBox")
        ?.querySelector(".alert-danger.alert-dismissible > p")?.innerHTML;
    });

    // Error found in the checkout page, return
    if (purchaseError) {
      Log.error(purchaseError, true);
      return false;
    }

    Log.important("Reached the payment page, trying to pay.", true);
    Log.breakline();

    await page.waitForTimeout(1000);

    // Change payment to transfer mode
    if (this.tryTransfer) {
      const transferClicked = await page.evaluate(() => {
        const transfer = document
          .getElementsByClassName("tipopago5")[0]
          ?.getElementsByClassName("c-indicator")[0] as HTMLElement;
        if (transfer) {
          transfer.scrollIntoView({ behavior: "smooth" });
          transfer.click();
          return true;
        } else {
          return false;
        }
      });

      if (!transferClicked) {
        Log.error("Unable to click the transfer payment type button!", true);
        return false;
      }
      await page.waitForTimeout(2000);
    }

    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      const conditions = document.querySelector(
        "input[data-cy='accept-conditions-checkbox']"
      ) as HTMLElement;
      if (conditions) {
        conditions.scrollIntoView({ behavior: "smooth" });
        conditions.click();
      } else {
        Log.error("Unable to click the accept conditions checkbox!", true);
        return false;
      }
    });

    await page.waitForTimeout(20000);

    // Check if the purchase should be stopped
    if (forceStop.value === true) {
      Log.breakline();
      Log.critical("Purchase was manually stopped!", true);
      this.notifyService.notify("Purchase was manually stopped!");
      Log.breakline();
      return false;
    }

    // The purchase cannot be stopped from here
    forceStop.unsubscribe();

    await page.evaluate(() => {
      const end = document.querySelector(
        "button[data-cy='save-and-continue']"
      ) as HTMLElement;
      if (end) {
        end.scrollIntoView({ behavior: "smooth" });
        end.click();
      } else {
        Log.error("Unable to click the purchase button!", true);
        return false;
      }
    });

    Log.important("All done, crossing fingers...", true);
    Log.breakline();

    await page.waitForTimeout(20000);

    if (
      !page
        .url()
        .includes("https://www.pccomponentes.com/cart/order/finished/ok")
    ) {
      const errorText =
        "⚠️ Order payment failed, the browser did not navigate to the payment confirmation page. Check the options below.\n";
      const solutions =
        `- Maybe you need to confirm the purchase within your bank app. Last URL found:\n${page.url()}\n\n` +
        "- Maybe the order was created, check if you can pay manually here:\nhttps://www.pccomponentes.com/usuarios/panel/mis-pedidos-y-facturas";
      Log.breakline();
      Log.error(errorText, true);
      Log.important(solutions);
      Log.breakline();

      this.notifyService.notify(errorText + "\n" + solutions);

      return false;
    }

    // page.close();
    return true;
  }

  private async quickCartCheck(
    browser: Browser,
    debug: boolean,
    forceStop: BehaviorSubject<boolean>
  ): Promise<void> {
    const page = await Utils.createPage(browser, debug, true);
    page.goto("https://www.pccomponentes.com/cart/rawcart");
    await page.waitForSelector("body");
    const cartJson = await page.evaluate(() => {
      return document.querySelector("body")?.innerText;
    });
    if (cartJson) {
      try {
        // transform and validate request body
        // console.warn(cartJson);
        const cart = (await transformAndValidate(
          CartData,
          cartJson
        )) as CartData;

        let message = `💰 Purchasing ${cart.totalQty} articles for ${cart.totalToPay} EUR:`;
        cart.articles.forEach((article) => {
          message += `\n\n${article.qty} x ${article.unitPrice} EUR - ${article.name}`;
        });
        Log.breakline();
        Log.important(message);
        Log.breakline();

        const cancelId = "/STOP_NOW_" + Math.random().toString(36).substring(7);
        message += `\n\nPRESS THIS TO CANCEL:\n\n${cancelId}`;
        this.notifyService.notify(message);
        this.notifyService.hearStopRequest(forceStop, cancelId);
      } catch (err) {
        Log.error(
          "Unable to parse JSON data to print the cart info: " + err,
          true
        );
      }
    }

    page.close();
  }
}
