import chalk from "chalk";
import Utils from "./utils";

export default class Log {
  // Print breakline or a background-colored line
  static breakline(line = false) {
    console.log(chalk.bgWhite(line ? "                         " : ""));
  }

  // Common logs
  static info(text: any, time = false) {
    console.log(Log.formatLog(text, time));
  }
  static success(text: any, time = false) {
    console.log(chalk.green(Log.formatLog(text, time)));
  }
  static error(text: any, time = false) {
    console.error(chalk.red(Log.formatLog(text, time)));
  }
  static important(text: any, time = false) {
    console.log(chalk.yellow(Log.formatLog(text, time)));
  }

  // Logs with background
  static critical(text: any, time = false) {
    console.error(chalk.black(chalk.bgRed(Log.formatLog(text, time))));
  }
  static config(text: any, activated: boolean) {
    if (activated) {
      console.log(chalk.black(chalk.bgGreen(text)));
    } else {
      console.log(chalk.black(chalk.bgYellow(text)));
    }
  }

  static formatLog(text: any, time: boolean): string {
    return time ? Utils.getDate() + " " + text : text;
  }
}
