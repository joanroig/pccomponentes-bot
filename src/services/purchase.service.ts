import { Browser } from "puppeteer";
import { Service } from "typedi";
import { Article } from "../models";
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
    const page = await Utils.createPage(browser, debug, false);

    Log.important("Purchasing: " + article.purchaseLink);
    await page.goto(article.purchaseLink, { waitUntil: "networkidle2" });

    await page.waitForTimeout(200);

    const cartError = await page.evaluate(() => {
      return document
        .querySelector(".alertBox")
        ?.querySelector(".alert-danger > p")?.innerHTML;
    });

    // Error found, return
    if (cartError) {
      Log.error(cartError);
      return false;
    }

    // Go to the checkout
    // New url:
    // https://www.pccomponentes.com/cart/order?toNewCheckout=1
    await page.goto(
      "https://www.pccomponentes.com/cart/order?toNewCheckout=0",
      {
        waitUntil: "networkidle2",
      }
    );

    await page.waitForTimeout(200);

    const purchaseWarning = await page.evaluate(() => {
      return document
        .querySelector("#alertBox")
        ?.querySelector(".alert-warning.alert-dismissible > p")?.innerHTML;
    });

    // This may happen after trying to do the order, try again
    // Warning example: El artículo XXX tiene una limitación de stock por cliente y sus unidades se han actualizado a 1
    if (purchaseWarning) {
      Log.error(purchaseWarning);
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
    await page.waitForTimeout(2000);

    const purchaseError = await page.evaluate(() => {
      return document
        .querySelector("#alertBox")
        ?.querySelector(".alert-danger.alert-dismissible > p")?.innerHTML;
    });

    // Error found in the checkout page, return
    if (purchaseError) {
      Log.error(purchaseError);
      return false;
    }

    await page.waitForTimeout(5000);

    // // Get all articles
    // const articlesToPurchase = await page.evaluate(
    //   "document.getElementsByClassName('c-articles-to-send__list-items__item-text-info')"
    // );

    // Log.important(JSON.stringify(articlesToPurchase));

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
        Log.error("Unable to click the transfer payment type button!");
        return false;
      }
    }
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

    await page.waitForTimeout(6000);

    if (
      !page
        .url()
        .includes("https://www.pccomponentes.com/cart/order/finished/ok")
    ) {
      Log.error(
        "Order payment failed, the browser did not navigate to the confirmation page.\nMaybe you need to confirm the purchase within your bank app.\nReceived URL: \n" +
          page.url()
      );
      Log.important(
        "Maybe the order was created, check if you can pay manually here:\nhttps://www.pccomponentes.com/usuarios/panel/mis-pedidos-y-facturas"
      );
      return false;
    }

    return true;
  }
}
