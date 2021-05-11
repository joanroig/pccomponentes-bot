import { Subject } from "rxjs";
import { Telegraf } from "telegraf";
import { Service } from "typedi";
import Log from "../utils/log";

@Service()
export default class NotifyService {
  private telegraf: Telegraf;
  public requestUpdate: Subject<boolean>;
  private sendNotifications = false;

  constructor() {
    this.telegraf = new Telegraf(process.env.BOT_TOKEN!);
    this.requestUpdate = new Subject<boolean>();
  }

  getRequestUpdates() {
    return this.requestUpdate.asObservable();
  }

  startTelegram() {
    const telegraf = this.telegraf;

    // Telegram bot setup
    telegraf.start((ctx: any) => {
      console.warn("Put this CHAT_ID in the .env file:" + ctx.chat.id);
      ctx.reply("Welcome! Put this CHAT_ID in the .env file:" + ctx.chat.id);
    });
    // Method to get chat id: https://github.com/telegraf/telegraf/issues/204
    telegraf.hears("getid", (ctx: any) => {
      console.warn(ctx.chat.id);
      return ctx.reply("Put this CHAT_ID in the .env file:" + ctx.chat.id);
    });
    telegraf.hears(["Hi", "hi", "Hello", "hello"], (ctx: any) => {
      this.notify("The bot is running.");
      Log.important("Telegram: Greeting command received.");
    });
    telegraf.hears(["Update", "update", "Refresh", "refresh"], (ctx: any) => {
      this.requestUpdate.next(true);
      this.notify("Data refresh requested.");
      Log.important("Telegram: Data refresh command received.");
    });
    telegraf.launch();

    this.sendNotifications = true;
  }

  // Send a message using the Telegram bot
  notify(message: string, results?: string[]) {
    if (this.sendNotifications) {
      let sendMessage = "*\n\n" + message + "* \n\n";
      if (results) {
        sendMessage += results?.join("\n\n");
      }
      this.telegraf.telegram.sendMessage(process.env.CHAT_ID!, sendMessage, {
        disable_web_page_preview: true,
        parse_mode: "Markdown",
      });
    }
  }
}
