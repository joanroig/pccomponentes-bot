const http = require("http");
require("dotenv").config();
var request = require("request");
var html2json = require("html2json").html2json;
const sanitizeHtml = require("sanitize-html");
const { Telegraf } = require("telegraf");

import { IncomingMessage, ServerResponse } from "http";
import Purchase from "./purchase";

// Server configurations
const hostname = "127.0.0.1";
const port = 3000;
const bot = new Telegraf(process.env.BOT_TOKEN);

// Read values from the configuration file
const config = require("./config.json");
const url = config.url;
const maxPrice = config.maxPrice;
const models = config.models;
const minUpdateSeconds = config.minUpdateSeconds;
const maxUpdateSeconds = config.maxUpdateSeconds;
const purchaseCombos = config.purchaseCombos;

// Global variables
var firstTime = true;
var previous: string[] = [];
var purchased: string[] = [];

var purchase: Purchase;

// Server startup
const server = http.createServer(
  (req: IncomingMessage, res: ServerResponse) => {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    res.end(
      "I'm running, but in the background. \nRefresh this page to force a recheck."
    );
    updateData();
  }
);

server.listen(port, hostname, () => {
  // Setup the telegram bot
  startTelegram();

  purchase = new Purchase({
    email: process.env.PCC_USER!,
    password: process.env.PCC_PASS!,
  });
  purchase.prepare().then((ready) => {
    // First iteration
    updateData();

    // Infinite loop
    loop();

    console.log(`Server running at http://${hostname}:${port}/`);
  });
});

function startTelegram() {
  // Telegram bot setup
  bot.start((ctx: any) => {
    console.warn("Put this CHAT_ID in the .env file:" + ctx.chat.id);
    ctx.reply("Welcome! Put this CHAT_ID in the .env file:" + ctx.chat.id);
  });
  // Method to get chat id: https://github.com/telegraf/telegraf/issues/204
  bot.hears("getid", (ctx: any) => {
    console.warn(ctx.chat.id);
    return ctx.reply("Put this CHAT_ID in the .env file:" + ctx.chat.id);
  });
  bot.hears(["Hi", "hi", "all", "All"], (ctx: any) => {
    notify("All cards:", previous);
  });
  bot.hears(["update", "Update", "refresh", "Refresh"], (ctx: any) => {
    updateData();
    notify("Refreshed");
  });
  bot.launch();
}

// Infinite loop with a pseudo-random timeout to fetch data imitating a human behaviour
function loop() {
  // Math.random() * (max - min + 1) + min); // Generate a number in a range
  var rand =
    Math.round(
      Math.random() * (maxUpdateSeconds * 1000 - minUpdateSeconds * 1000 + 1)
    ) +
    minUpdateSeconds * 1000;
  setTimeout(function () {
    updateData();
    loop();
  }, rand);
}

function updateData() {
  request(url, (err: any, res: any, body: any) => {
    // Allow only a super restricted set of tags and attributes to clean the HTML
    const clean = sanitizeHtml(body, {
      allowedTags: ["article", "a"],
      allowedAttributes: {
        article: ["data-price", "data-name"],
        a: ["href"],
      },
    });

    // Convert the cleaned HTML output to JSON objects
    const json = html2json(clean);
    // console.log(json)

    // List of items that match the requisites (each item is a string with price, name and URL)
    var matches: string[] = [];

    json?.child?.forEach((element: any) => {
      if (element.attr) {
        const price = element.attr["data-price"];
        const name = element.attr["data-name"].map((v: string) =>
          v.toLowerCase()
        );

        // Check if the price is in range
        if (element.tag === "article" && price < maxPrice) {
          // Check if any of the models are in the title of the product
          if (models.some((el: string) => name.includes(el.toLowerCase()))) {
            //  Build link, name and price of the product in a single string
            let link =
              "https://www.pccomponentes.com" +
              element.child.find((link: any) => link.tag === "a").attr.href;

            let nameText = "[" + name.join([" "]) + "](" + link + ")";
            let priceText = "*" + price + " EUR*";
            let match = priceText + "\n" + nameText;

            // Check if it is an instant buy
            purchaseCombos.forEach((combo: any) => {
              if (
                combo.price < price &&
                combo.model.every((v: string) => name.includes(v.toLowerCase()))
              ) {
                if (!purchased.includes(link)) {
                  purchased.push(link);
                  console.warn("\n*Nice price, start the purchase!!!*");
                  console.warn(combo);

                  purchase.run(link, combo.price, 8000).then((result) => {
                    if (result) {
                      console.warn(
                        "\n------------\n*** PURCHASE FINISHED ***\n------------\n"
                      );
                      notify(getDate() + "\n\nPURCHASED!\n\n", [match]);
                    }
                  });
                }
              }
            });

            // console.log(match)
            matches.push(match);
          }
        }
      }
    });

    // Check if there is any new card - we use difference to only get the new cards: https://stackoverflow.com/questions/1187518/how-to-get-the-difference-between-two-arrays-in-javascript
    const difference = matches.filter((x) => !previous.includes(x));

    if (firstTime) {
      // First update
      console.log("\n" + getDate() + "\nBot started! Start tracking cards:");
      console.log(difference);
      notify(
        getDate() +
          "\n\nBOT STARTED\nCommands: 'all', 'refresh'.\nFound cards:",
        difference
      );
      firstTime = false;
    } else if (difference.length > 0) {
      // New cards found!
      console.log("\n" + getDate() + "\nNew cards found!:");
      console.log(difference);
      notify(getDate() + "\n\nNEW CARDS FOUND!:", difference);
    } else {
      console.log("\n" + getDate() + "\nNo new cards found...");
      // notify(getDate() + "\n\nno new cards...");
    }

    // Update previous
    previous = matches;
  });
}

// Send a message using the Telegram bot
function notify(message: string, results?: string[]) {
  let sendMessage = "*" + message + "* \n\n";
  if (results) {
    sendMessage += results?.join("\n\n");
  }
  bot.telegram.sendMessage(process.env.CHAT_ID, sendMessage, {
    disable_web_page_preview: true,
    parse_mode: "Markdown",
  });
}

// Get current date in a readable format
function getDate() {
  var currentdate = new Date();
  var datetime =
    "# " +
    currentdate.getDate() +
    "/" +
    (currentdate.getMonth() + 1) +
    "/" +
    currentdate.getFullYear() +
    " - " +
    String(currentdate.getHours()).padStart(2, "0") +
    ":" +
    String(currentdate.getMinutes()).padStart(2, "0") +
    ":" +
    String(currentdate.getSeconds()).padStart(2, "0");
  return datetime;
}
