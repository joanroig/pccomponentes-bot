import axios from "axios";
import { Subject } from "rxjs";
import { Telegraf } from "telegraf";
import { Service } from "typedi";
import Log from "../utils/log";
var fs = require("fs");

@Service()
export default class NotifyService {
  private telegraf!: Telegraf;
  public requestUpdate = new Subject<boolean>();
  private sendNotifications = false;

  constructor() {}

  getRequestUpdates() {
    return this.requestUpdate.asObservable();
  }

  async startTelegram() {
    if (process.env.BOT_TOKEN) {
      // Remove all commands sent while the bot was offline
      try {
        await axios.get(
          "https://api.telegram.org/bot" +
            process.env.BOT_TOKEN +
            "/getUpdates?offset=-1"
        );
      } catch (error) {
        Log.error("Error while cleaning offline commands: " + error);
      }

      this.telegraf = new Telegraf(process.env.BOT_TOKEN);
    } else {
      Log.critical(
        "Please, set the BOT_TOKEN in the .env file (explained in the README.md)"
      );
      process.exit(1);
    }

    const telegraf = this.telegraf;

    // Telegram bot setup
    telegraf.start((ctx: any) => {
      this.saveChatId(ctx);
      Log.breakline();
      Log.important("Telegram: Start command received.");
    });

    // Method to get chat id: https://github.com/telegraf/telegraf/issues/204
    telegraf.hears(["/id", "Getid", "getid", "id", "Id"], (ctx: any) => {
      let message =
        "Put this line in the .env file, then restart the bot: " +
        "\nCHAT_ID=" +
        ctx.chat.id;
      ctx.reply(message);
      Log.breakline();
      Log.important("Telegram: Id command received.");
      Log.important(message);
      Log.breakline();
    });

    // Commands
    telegraf.hears(
      ["/hi", "/hello", "Hi", "hi", "Hello", "hello"],
      (ctx: any) => {
        ctx.reply("The bot is running.");
        Log.breakline();
        Log.important("Telegram: Greeting command received.");
        Log.breakline();
      }
    );

    telegraf.hears(
      ["/update", "/refresh", "Update", "update", "Refresh", "refresh"],
      (ctx: any) => {
        this.requestUpdate.next(true);
        ctx.reply("Data refresh requested.");
        Log.breakline();
        Log.important("Telegram: Data refresh command received.");
        Log.breakline();
      }
    );

    telegraf.hears(["/kill"], (ctx: any) => {
      ctx.reply("Shutting down in 5 seconds...");
      Log.breakline();
      Log.important(
        "Telegram: Quit command received, shutting down in 5 seconds..."
      );
      Log.breakline();
      setTimeout(() => {
        process.exit(0);
      }, 5000);
    });

    telegraf.launch().catch((error) => {
      Log.breakline();
      Log.critical("Telegram error: " + error);
      process.exit(1);
    });

    this.sendNotifications = true;
  }

  // Send a message using the Telegram bot
  notify(message: string, results?: string[]) {
    if (this.sendNotifications) {
      if (process.env.CHAT_ID) {
        let sendMessage = "*\n\n" + message + "* \n\n";
        if (results) {
          sendMessage += results?.join("\n\n");
        }
        this.telegraf.telegram.sendMessage(process.env.CHAT_ID, sendMessage, {
          disable_web_page_preview: true,
          parse_mode: "Markdown",
        });
      } else {
        Log.breakline();
        Log.important(
          "Send a message to the Telegram chat with this command to get notifications:"
        );
        Log.config("/start", false);
        Log.breakline();
      }
    }
  }

  startMessage() {
    this.notify(
      "BOT RUNNING\nTelegram commands you can write here:\n\n/start: Set the CHAT_ID to receive alerts\n/id: Print the CHAT_ID\n/hello: Check if the bot is running\n/refresh: Force a refresh of all trackers\n/kill: Shutdown the bot."
    );
  }

  private saveChatId(ctx: any) {
    // Save the chat id in the .env file for the next sessions
    fs.readFile(".env", "utf8", (err: any, data: any) => {
      var formatted;
      if (data.includes("CHAT_ID=")) {
        // Replace the chat id line
        formatted = data.replace(
          /CHAT_ID=.*/g,
          "CHAT_ID=" + ctx.chat.id
        ) as string;
      } else {
        // Append the chat id line
        formatted = data + "\nCHAT_ID=" + ctx.chat.id;
      }

      fs.writeFile(".env", formatted, "utf8", (err: any) => {
        if (err) {
          console.warn(err);
          Log.breakline();
          Log.critical("Error while saving the CHAT_ID automatically.");
          Log.important(
            "Put this line in the .env file, then restart the bot: " +
              "\nCHAT_ID=" +
              ctx.chat.id
          );
          Log.breakline();
        } else {
          // Set the chat id for this session
          process.env.CHAT_ID = ctx.chat.id;
          Log.breakline();
          Log.important("CHAT_ID saved in the .env file: " + ctx.chat.id);
          Log.breakline();
          this.startMessage();
        }
      });
    });
  }
}
