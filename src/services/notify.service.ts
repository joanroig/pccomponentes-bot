import { Subject } from "rxjs";
import { Telegraf } from "telegraf";
import { Service } from "typedi";
import Log from "../utils/log";

@Service()
export default class NotifyService {
  private telegraf!: Telegraf;
  public requestUpdate!: Subject<boolean>;
  private sendNotifications = false;

  constructor() {}

  getRequestUpdates() {
    return this.requestUpdate.asObservable();
  }

  startTelegram() {
    if (process.env.BOT_TOKEN) {
      this.telegraf = new Telegraf(process.env.BOT_TOKEN);
      this.requestUpdate = new Subject<boolean>();
    } else {
      Log.critical(
        "Please, set the BOT_TOKEN in the .env file (explained in the README.md)"
      );
      process.exit(1);
    }

    const telegraf = this.telegraf;

    // Telegram bot setup
    telegraf.start((ctx: any) => {
      Log.important(
        "Put this CHAT_ID in the .env file, then restart the bot: " +
          ctx.chat.id
      );
      return ctx.reply(
        "Put this CHAT_ID in the .env file, then restart the bot: " +
          ctx.chat.id
      );
    });

    // Method to get chat id: https://github.com/telegraf/telegraf/issues/204
    telegraf.hears(["Getid", "getid", "id", "Id"], (ctx: any) => {
      Log.important(
        "Put this CHAT_ID in the .env file, then restart the bot: " +
          ctx.chat.id
      );
      return ctx.reply(
        "Put this CHAT_ID in the .env file, then restart the bot: " +
          ctx.chat.id
      );
    });

    // Commands
    telegraf.hears(["Hi", "hi", "Hello", "hello"], (ctx: any) => {
      this.notify("The bot is running.");
      Log.important("Telegram: Greeting command received.");
    });

    telegraf.hears(["Update", "update", "Refresh", "refresh"], (ctx: any) => {
      this.requestUpdate.next(true);
      this.notify("Data refresh requested.");
      Log.important("Telegram: Data refresh command received.");
    });

    telegraf.launch().catch((error) => {
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
        this.telegraf.telegram.sendMessage(process.env.CHAT_ID!, sendMessage, {
          disable_web_page_preview: true,
          parse_mode: "Markdown",
        });
      } else {
        Log.important(
          "Send a message to the Telegram chat with this command to get the CHAT_ID:"
        );
        Log.config("getid", false);
        Log.breakline();
      }
    }
  }
}
