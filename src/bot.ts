// Read values from the configuration file
// const config = require("../config.json");
import { Service } from "typedi";
import * as config from "../config.json";
import NotifyService from "./services/notify.service";
import PurchaseService from "./services/purchase.service";

const url = config.url;
const maxPrice = config.maxPrice;
const models = config.models;
const minUpdateSeconds = config.minUpdateSeconds;
const maxUpdateSeconds = config.maxUpdateSeconds;
const purchaseCombos = config.purchaseCombos;
var request = require("request");
const sanitizeHtml = require("sanitize-html");
var html2json = require("html2json").html2json;

@Service()
export default class Bot {
  // Global variables
  private firstTime = true;
  private previous: string[] = [];
  private purchased: string[] = [];
  private buying = false;

  constructor(
    private readonly notify: NotifyService,
    private readonly purchase: PurchaseService
  ) {}

  start() {
    // Setup the telegram bot
    this.notify.startTelegram();

    // purchase = new Purchase({
    //   email: process.env.PCC_USER!,
    //   password: process.env.PCC_PASS!,
    // });
    this.purchase.prepare().then((ready) => {
      // First iteration
      this.updateData();

      // Infinite loop
      this.loop();

      // console.log(`Server running at http://${hostname}:${port}/`);
    });
  }

  // Infinite loop with a pseudo-random timeout to fetch data imitating a human behaviour
  loop() {
    // Math.random() * (max - min + 1) + min); // Generate a number in a range
    var rand =
      Math.round(
        Math.random() * (maxUpdateSeconds * 1000 - minUpdateSeconds * 1000 + 1)
      ) +
      minUpdateSeconds * 1000;
    setTimeout(() => {
      this.updateData();
      this.loop();
    }, rand);
  }

  updateData() {
    // request(url, (err: any, res: any, body: any) => {
    //   // Allow only a super restricted set of tags and attributes to clean the HTML
    //   const clean = sanitizeHtml(body, {
    //     allowedTags: ["article", "a"],
    //     allowedAttributes: {
    //       article: ["data-price", "data-name"],
    //       a: ["href"],
    //     },
    //   });
    //   // Convert the cleaned HTML output to JSON objects
    //   const json = html2json(clean);
    //   // console.log(json)
    //   // List of items that match the requisites (each item is a string with price, name and URL)
    //   var matches: string[] = [];
    //   json?.child?.forEach((element: any) => {
    //     if (element.attr) {
    //       const price = element.attr["data-price"];
    //       const name = element.attr["data-name"].map((v: string) =>
    //         v.toLowerCase()
    //       );
    //       // Check if the price is in range
    //       if (element.tag === "article" && price < maxPrice) {
    //         // Check if any of the models are in the title of the product
    //         if (models.some((el: string) => name.includes(el.toLowerCase()))) {
    //           //  Build link, name and price of the product in a single string
    //           let link =
    //             "https://www.pccomponentes.com" +
    //             element.child.find((link: any) => link.tag === "a").attr.href;
    //           let nameText = "[" + name.join([" "]) + "](" + link + ")";
    //           let priceText = "*" + price + " EUR*";
    //           let match = priceText + "\n" + nameText;
    //           // Check if it is an instant buy
    //           purchaseCombos.forEach((combo: any) => {
    //             if (
    //               !this.buying &&
    //               combo.price > price &&
    //               combo.model.every((v: string) =>
    //                 name.includes(v.toLowerCase())
    //               )
    //             ) {
    //               if (!this.purchased.includes(link)) {
    //                 this.purchased.push(link);
    //                 console.warn("\n*Nice price, start the purchase!!!*");
    //                 console.warn(combo);
    //                 this.buying = true;
    //                 this.purchase
    //                   .run(link, combo.price, 8000)
    //                   .then((result) => {
    //                     if (result) {
    //                       console.warn(
    //                         "\n------------\n*** PURCHASE FINISHED ***\n------------\n"
    //                       );
    //                       this.notify.notify(
    //                         Utils.getDate() + "\n\nPURCHASED!\n\n",
    //                         [match]
    //                       );
    //                       process.exit();
    //                     } else {
    //                       console.warn("Purchase failed...");
    //                       this.buying = false;
    //                     }
    //                   });
    //               }
    //             }
    //           });
    //           // console.log(match)
    //           matches.push(match);
    //         }
    //       }
    //     }
    //   });
    //   // Check if there is any new card - we use difference to only get the new cards: https://stackoverflow.com/questions/1187518/how-to-get-the-difference-between-two-arrays-in-javascript
    //   const difference = matches.filter((x) => !this.previous.includes(x));
    //   if (this.firstTime) {
    //     // First update
    //     console.log(
    //       "\n" + Utils.getDate() + "\nBot started! Start tracking cards:"
    //     );
    //     console.log(difference);
    //     this.notify.notify(
    //       Utils.getDate() +
    //         "\n\nBOT STARTED\nCommands: 'all', 'refresh'.\nFound cards:",
    //       difference
    //     );
    //     this.firstTime = false;
    //   } else if (difference.length > 0) {
    //     // New cards found!
    //     console.log("\n" + Utils.getDate() + "\nNew cards found!:");
    //     console.log(difference);
    //     this.notify.notify(
    //       Utils.getDate() + "\n\nNEW CARDS FOUND!:",
    //       difference
    //     );
    //   } else {
    //     console.log("\n" + Utils.getDate() + "\nNo new cards found...");
    //     // notify(Utils.getDate() + "\n\nno new cards...");
    //   }
    //   // Update previous
    //   this.previous = matches;
    // });
  }
}
