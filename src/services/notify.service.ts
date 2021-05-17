import axios from "axios";
import fs from "fs";
import { Observable, Subject } from "rxjs";
import { Context, Telegraf } from "telegraf";
import { Service } from "typedi";
import Log from "../utils/log";

@Service()
export default class NotifyService {
  private telegraf!: Telegraf;
  private sendNotifications = false;
  public refreshRequest = new Subject<boolean>();
  public shutdownRequest = new Subject<number>();

  getRefreshRequest(): Observable<boolean> {
    return this.refreshRequest.asObservable();
  }

  getShutdownRequest(): Observable<number> {
    return this.shutdownRequest.asObservable();
  }

  sendShutdownRequest(status: number): void {
    this.shutdownRequest.next(status);
  }

  async startTelegram(): Promise<void> {
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
    telegraf.start((ctx: Context) => {
      Log.breakline();
      Log.important("Telegram: Start command received.");
      if (ctx.chat) {
        const chatId = ctx.chat.id;
        this.saveChatId(chatId);
      } else {
        Log.breakline();
        Log.critical(
          "Error while saving the CHAT_ID automatically: Chat not found."
        );
      }
    });

    // Method to get chat id: https://github.com/telegraf/telegraf/issues/204
    telegraf.hears(
      ["🆔", "/id", "Getid", "getid", "id", "Id"],
      (ctx: Context) => {
        Log.breakline();
        Log.important("Telegram: Id command received.");
        if (ctx.chat) {
          const message =
            "🆔 Put this line in the .env file, then restart the bot: " +
            "\nCHAT_ID=" +
            ctx.chat.id;
          ctx.reply(message);
          Log.important(message);
        } else {
          Log.breakline();
          Log.critical("Error while reading the CHAT_ID: Chat not found.");
        }
        Log.breakline();
      }
    );

    // Commands
    telegraf.hears(
      ["👋", "/hi", "/hello", "Hi", "hi", "Hello", "hello"],
      (ctx: Context) => {
        ctx.reply("👋 The bot is running.");
        Log.breakline();
        Log.important("Telegram: Greeting command received.");
        Log.breakline();
      }
    );

    telegraf.hears(
      ["💫", "/update", "/refresh", "Update", "update", "Refresh", "refresh"],
      (ctx: Context) => {
        this.refreshRequest.next(true);
        ctx.reply(
          "💫 Refreshing all trackers and returning all matches (new and old ones)."
        );
        Log.breakline();
        Log.important("Telegram: Data refresh command received.");
        Log.breakline();
      }
    );

    telegraf.hears(["💀", "/shutdown"], (ctx: Context) => {
      ctx.reply("💀 Send this command to confirm the shutdown: /headshot");
      Log.breakline();
      Log.important(
        "Telegram: Quit command received, asking for confirmation."
      );
      Log.breakline();
    });

    telegraf.hears(["/headshot"], () => {
      Log.important("Telegram: Quit command received.");
      Log.breakline();
      this.sendShutdownRequest(0);
    });

    telegraf.launch().catch((error) => {
      Log.breakline();
      Log.critical("Telegram error: " + error);
      process.exit(1);
    });

    this.sendNotifications = true;
  }

  // Send a message using the Telegram bot
  notify(message: string, results?: string[]): void {
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

  startMessage(): void {
    this.notify(
      "🤖 BOT RUNNING 🤖\nTelegram commands you can write here:\n\n🚀 /start: Set the CHAT_ID to receive alerts\n🆔 /id: Print the CHAT_ID\n👋 /hello: Check if the bot is running\n💫 /refresh: Force a refresh of all trackers\n💀 /shutdown: Shutdown the bot"
    );
  }

  stopMessage(): void {
    const message = "👋 Shutting down in 5 seconds...";
    this.notify(message);
    Log.important(message);
    Log.breakline();
  }

  private saveChatId(chatId: number) {
    // Save the chat id in the .env file for the next sessions
    fs.readFile(".env", "utf8", (err, data) => {
      if (err) {
        Log.breakline();
        Log.critical("Error while saving the CHAT_ID automatically: " + err);
        Log.important(
          "Create a '.env' file in the project's root directory and put this line in it, then restart the bot: " +
            "\nCHAT_ID=" +
            chatId
        );
        Log.breakline();
      }
      let formatted;
      if (data.includes("CHAT_ID=")) {
        // Replace the chat id line
        formatted = data.replace(/CHAT_ID=.*/g, "CHAT_ID=" + chatId) as string;
      } else {
        // Append the chat id line
        formatted = data + "\nCHAT_ID=" + chatId;
      }

      fs.writeFile(".env", formatted, "utf8", (err) => {
        if (err) {
          Log.breakline();
          Log.critical("Error while saving the CHAT_ID automatically: " + err);
          Log.important(
            "Put this line in the '.env' file, then restart the bot: " +
              "\nCHAT_ID=" +
              chatId
          );
          Log.breakline();
        } else {
          // Set the chat id for this session
          process.env.CHAT_ID = String(chatId);
          Log.breakline();
          Log.important("CHAT_ID saved in the '.env' file: " + chatId);
          Log.breakline();
          this.startMessage();
        }
      });
    });
  }
}
