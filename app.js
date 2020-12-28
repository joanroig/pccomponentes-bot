const http = require("http");
require("dotenv").config();
var request = require("request");
var html2json = require("html2json").html2json;
const sanitizeHtml = require("sanitize-html");
const { Telegraf } = require("telegraf");

const hostname = "127.0.0.1";
const port = 3000;

const bot = new Telegraf(process.env.BOT_TOKEN);

// Global variables
var firstTime = true;
var previous = [];
var price = 320;
var models = ["2060", "2070", "3060", "3060ti"];

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");
  res.end("I'm running, but in the background.");
});

server.listen(port, hostname, () => {
  bot.start((ctx) => ctx.reply("Welcome!"));

  // Method to get chat id: https://github.com/telegraf/telegraf/issues/204
  bot.hears("getid", (ctx) => {
    console.warn(ctx.chat.id);
    return ctx.reply(ctx.chat.id);
  });

  bot.launch();

  // First iteration
  updateData();
  // Infinite loop
  loop();

  console.log(`Server running at http://${hostname}:${port}/`);
});

function loop() {
  // Math.random() * (max - min + 1) + min); // Random time between 4 and 6 minutes
  var rand = Math.round(Math.random() * (240000 - 360000 + 1)) + 360000;
  setTimeout(function () {
    updateData();
    loop();
  }, rand);
}

function updateData() {
  // GPUs ajax URL
  let url =
    "https://www.pccomponentes.com/outlet/ajax?idFamilies[]=6&page=0&order=price-asc";

  request(url, function (err, res, body) {
    // Allow only a super restricted set of tags and attributes
    const clean = sanitizeHtml(body, {
      allowedTags: ["article", "a"],
      allowedAttributes: {
        article: ["data-price", "data-name"],
        a: ["href"],
      },
    });

    const json = html2json(clean);

    var matches = [];

    json.child.forEach((element) => {
      if (element.tag === "article" && element.attr["data-price"] < price) {
        // Check if any of the models are in the title of the product
        if (models.some((el) => element.attr["data-name"].includes(el))) {
          let link =
            "https://www.pccomponentes.com" +
            element.child.find((link) => link.tag === "a").attr.href;

          let name =
            "[" + element.attr["data-name"].join([" "]) + "](" + link + ")";
          let price = "*" + element.attr["data-price"] + " EUR*";
          let match = price + "\n" + name;
          matches.push(match);
        }
      }
    });

    // Check if there is any new card in the price range
    const difference = matches.filter((x) => !previous.includes(x));

    if (firstTime) {
      // First update
      console.log("Bot started! Start tracking cards:");
      console.log(difference);
      notify("BOT STARTED:", difference);
      firstTime = false;
    } else if (difference.length > 0) {
      // New cards found!
      console.log(difference);
      notify("NEW:", difference);
    } else {
      console.log("No new cards found...");
    }

    // Update previous
    previous = matches;
  });

  function notify(message, results) {
    bot.telegram.sendMessage(
      process.env.CHAT_ID,
      "*" + message + "* \n\n" + results.join("\n\n"),
      {
        disable_web_page_preview: true,
        parse_mode: "Markdown",
      }
    );
  }
}
