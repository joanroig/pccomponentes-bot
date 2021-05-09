import chromedriver from "chromedriver";
import { ICard, IData } from "./models";
import webdriver, {
  WebDriver,
  Builder,
  By,
  Key,
  Actions,
} from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";
import fetch from "node-fetch";

chrome.setDefaultService(new chrome.ServiceBuilder(chromedriver.path).build());

export default class Purchase {
  email: string;
  password: string;
  link: string = "";
  maxPrice: number = 100;
  card?: ICard;
  refreshRate: number = 100;
  phone?: string;

  constructor({ email, password }: IData) {
    (this.email = email), (this.password = password);
  }

  driver: any;

  async prepare() {
    try {
      this.driver = await new Builder().forBrowser("chrome").build();
      this.sleep(1000);
      return await this.login(this.driver);
    } catch (err) {
      console.error("ERROR NOT CAUGHT WHILE RUNNING BOT. MORE INFO BELOW");
      console.error(err);
    }
  }

  async run(link: any, maxPrice: any, refreshRate: any) {
    (this.link = link),
      (this.maxPrice = maxPrice),
      (this.refreshRate = refreshRate);
    try {
      await this.runItem(this.driver);
      return await this.buyItem(this.driver);
    } catch (err) {
      console.error("ERROR NOT CAUGHT WHILE RUNNING BOT. MORE INFO BELOW");
      console.error(err);
    }
  }

  async login(driver: WebDriver) {
    await driver
      .navigate()
      .to("https://www.pccomponentes.com/login")
      .then(async () => {
        // this fills the form and logs in
        await driver
          .findElement(By.css("input[data-cy='email'"))
          .then((value) => value.sendKeys(this.email.trim()));
        await driver
          .findElement(By.css("input[data-cy='password'"))
          .then((value) => value.sendKeys(this.password.trim(), Key.RETURN));
        await this.sleep(3000);
        // await driver.findElement(By.css("button[data-cy='log-in']")).then(value => value.click())
      });
    console.log(`Successfully logged in as ${this.email}`);
    return true;
  }

  async runItem(driver: WebDriver) {
    await driver
      .navigate()
      .to(this.link)
      .then(async () => {
        let stock: boolean = false;
        let price: number | undefined;
        // this loop will play till stock is available, then to the next step
        while (!stock) {
          await driver
            .navigate()
            .refresh()
            .catch(() => driver.navigate().to(this.link));
          await driver
            .findElement(By.id("notify-me"))
            .then(() =>
              console.log(
                `Product is not yet in stock (${new Date().toUTCString()})`
              )
            )
            .catch(async () => {
              await driver
                .findElement(By.id("precio-main"))
                .then(
                  async (value) =>
                    (price = parseFloat(await value.getAttribute("data-price")))
                )
                .catch(() => console.error("Couldn't find item price"));
              // checks if current price is below max price before continuing
              if (price && price <= this.maxPrice) {
                stock = true;
                console.log(`PRODUCT IN STOCK! Starting buy process`);
              } else {
                console.log(
                  `Price is above max. Max price set - ${
                    this.maxPrice
                  }€. Current price - ${price || "not defined"}€`
                );
              }
            });
          await this.sleep(this.refreshRate);
        }
      });
  }

  async buyItem(driver: WebDriver) {
    await this.sleep(2000);

    await driver
      .findElement(
        By.className("btn btn-block btn-primary btn-lg m-t-1 accept-cookie")
      )
      .then((value) => value.click())
      .catch(() => console.log("No cookie accept button to click"));

    // clicks on buy button on product page. There are 3 buttons that show up depending on the current window size.
    // the bot will attempt to click all of them
    const buyButtons = await driver.findElements(By.className("buy-button"));
    let clickedButton = false;
    buyButtons.forEach(async (buyButton) => {
      if (!clickedButton)
        try {
          await buyButton.click();
          clickedButton = true;
        } catch {
          console.log("Buy button not found, attempting another one...");
        }
    });

    await this.sleep(3000);
    await driver
      .findElement(By.id("GTM-carrito-realizarPedidoPaso1"))
      .then((value) => value.click());
    await this.sleep(3000);

    // Automatic scroll
    await driver
      .findElement(By.className("tipopago5"))
      .then(async (element) => {
        if (element) {
          driver.executeScript(
            'arguments[0].scrollIntoView({behavior: "smooth"});',
            element
          );
          console.info("Scrolled!");
          await this.sleep(1000).then((done) => {
            // Click the inner element
            element.findElement(By.className("c-input c-radio")).click();
            console.info("Money transfer clicked!");
          });
        } else {
          console.error("Couldn't find the payment box. :(");
          return false;
        }
      });

    await this.sleep(1000);
    driver.executeScript('window.scrollTo({top: 0, behavior: "smooth"})');
    await this.sleep(3000);

    await driver
      .findElements(By.className("c-indicator margin-top-0"))
      .then((value) => value[0].click())
      .catch((reason) => {
        console.error(reason);
        return false;
      });
    await this.sleep(500);
    await driver
      .findElement(By.id("GTM-carrito-finalizarCompra"))
      .then((value) => value.click())
      .catch(() => {
        console.error("Couldn't click the buy button. :(");
        return false;
      });
    console.info("PURCHASE SUCCESSFUL");
    await this.sleep(1000);
    return true;
  }

  async sleep(msec: number) {
    return new Promise((resolve) => setTimeout(resolve, msec));
  }
}
