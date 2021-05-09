import { Subject } from "rxjs";
import { Telegraf } from "telegraf";
import { Service } from "typedi";

@Service()
export default class NotifyService {
  private telegraf: Telegraf;
  public notifier: Subject<boolean>;

  constructor() {
    this.telegraf = new Telegraf(process.env.BOT_TOKEN!);
    this.notifier = new Subject<boolean>();
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
    // telegraf.hears(["Hi", "hi", "all", "All"], (ctx: any) => {
    //   this.notify("All cards:", previous);
    // });
    // telegraf.hears(["update", "Update", "refresh", "Refresh"], (ctx: any) => {
    //   updateData();
    //   this.notify("Refreshed");
    // });
    telegraf.launch();
  }

  // Send a message using the Telegram bot
  notify(message: string, results?: string[]) {
    let sendMessage = "*" + message + "* \n\n";
    if (results) {
      sendMessage += results?.join("\n\n");
    }
    this.telegraf.telegram.sendMessage(process.env.CHAT_ID!, sendMessage, {
      disable_web_page_preview: true,
      parse_mode: "Markdown",
    });
  }
}
