import chalk from "chalk";
import fs from "fs";
import Utils from "./utils";

export default class Log {
  static logStream: fs.WriteStream;

  // Create the logs folder and a new log file
  public static Init(saveLogs: boolean): void {
    if (saveLogs) {
      const dir = "logs";
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      this.logStream = fs.createWriteStream(`logs/log-${Date.now()}.log`, {
        flags: "a",
      });
    }

    Log.info("\n-----------------------");
    Log.info("   " + process.env.npm_package_name);
    Log.info("", true);
    Log.info("     Version " + process.env.npm_package_version);
    Log.info("-----------------------");
    Log.breakline();
  }

  // Print breakline or a background-colored line
  static breakline(line = false): void {
    this.saveLog("");
    console.log(chalk.bgWhite(line ? "                         " : ""));
  }

  // Common logs
  static info(text: any, time = false): void {
    console.log(Log.formatLog(text, time));
  }

  static success(text: any, time = false): void {
    console.log(chalk.green(Log.formatLog(text, time)));
  }

  static error(text: any, time = false): void {
    console.error(chalk.red(Log.formatLog(text, time)));
  }

  static important(text: any, time = false): void {
    console.log(chalk.yellow(Log.formatLog(text, time)));
  }

  // Logs with background
  static critical(text: any, time = false): void {
    console.error(chalk.black(chalk.bgRed(Log.formatLog(text, time))));
  }

  static config(text: any, activated: boolean): void {
    this.saveLog(text);
    if (activated) {
      console.log(chalk.black(chalk.bgGreen(text)));
    } else {
      console.log(chalk.black(chalk.bgYellow(text)));
    }
  }

  // Append the date and time if needed
  static formatLog(text: any, time: boolean): string {
    const formatted = time ? Utils.getDate() + " " + text : text;
    this.saveLog(formatted);
    return formatted;
  }

  // Write logs into the log file
  static saveLog(text: any): void {
    if (this.logStream) {
      this.logStream.write(text + "\r\n");
    }
  }
}
