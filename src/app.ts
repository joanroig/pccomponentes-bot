import "reflect-metadata";
import Container from "typedi";
import Bot from "./bot";

// const injector = ReflectiveInjector.resolveAndCreate([Bot]);
const botInstance = Container.get(Bot);
botInstance.start();

// const http = require("http");
// require("dotenv").config();
// var request = require("request");
// var html2json = require("html2json").html2json;
// const sanitizeHtml = require("sanitize-html");
// const { Telegraf } = require("telegraf");

// import { IncomingMessage, ServerResponse } from "http";
// import { exit } from "process";
// import Purchase from "./purchase";
// import Utils from "./utils";
// import Bot from "./bot";
// import Notify from "./notify";

// // Server configurations
// const hostname = "127.0.0.1";
// const port = 3000;

// // Read values from the configuration file
// const config = require("../config.json");
// const url = config.url;
// const maxPrice = config.maxPrice;
// const models = config.models;
// const minUpdateSeconds = config.minUpdateSeconds;
// const maxUpdateSeconds = config.maxUpdateSeconds;
// const purchaseCombos = config.purchaseCombos;

// // Global variables
// var firstTime = true;
// var previous: string[] = [];
// var purchased: string[] = [];

// var purchase: Purchase;

// var buying = false;

// // Server startup
// const server = http.createServer(
//   (req: IncomingMessage, res: ServerResponse) => {
//     res.statusCode = 200;
//     res.setHeader("Content-Type", "text/plain");
//     res.end(
//       "I'm running, but in the background. \nRefresh this page to force a recheck."
//     );
//     updateData();
//   }
// );

// server.listen(port, hostname, () => {
//   // Setup the telegram bot
//   startTelegram();

//   purchase = new Purchase({
//     email: process.env.PCC_USER!,
//     password: process.env.PCC_PASS!,
//   });
//   purchase.prepare().then((ready) => {
//     // First iteration
//     updateData();

//     // Infinite loop
//     loop();

//     console.log(`Server running at http://${hostname}:${port}/`);
//   });
// });
