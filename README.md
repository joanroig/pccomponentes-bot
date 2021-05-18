# PcComponentes Bot

Receive a Telegram message when a article is back to stock!
Implemented for PcComponentes.com stock and outlet articles, useful for tracking:

- Graphic cards
- Processors
- Motherboards

In progress: Automatic purchase (no credit card needed).

**The bot may fail from time to time due changes in the website, new issues and pull requests are welcome.**

> ⚠️ Disclaimer: Please note that this is a research project. I am by no means responsible for any usage of this tool. Use it on your behalf.

## Requirements

You will need Node.js and a node global package installed in your environement. Yarn is recommended as a package manager and script runner over npm.

### Node and npm

- #### Node installation on Windows

  Just go on [official Node.js website](https://nodejs.org/) and download the installer.
  Also, be sure to have `git` available in your PATH, `npm` might need it (You can find git [here](https://git-scm.com/)).

- #### Node installation on Ubuntu

  You can install nodejs and npm easily with apt install, just run the following commands.

  $ sudo apt install nodejs
  $ sudo apt install npm

- #### Other Operating Systems

  You can find more information about the installation on the [official Node.js website](https://nodejs.org/) and the [official NPM website](https://npmjs.org/).

If the installation was successful, you should be able to run the following command.

    $ node --version
    v14.16.1

    $ npm --version
    7.12.0

If you need to update `npm`, you can make it using `npm`! Cool right? After running the following command, just open again the command line and be happy.

    $ npm install npm -g

### Yarn

You can install yarn after installing npm with the following command.

    $ npm install --global yarn

If the installation was successful, you should be able to run the following command.

    $ yarn --version
    1.22.10

## Install

    $ git clone https://github.com/joanroig/pcalerts
    $ cd pcalerts
    $ yarn

## Configure bot

Edit the `config.json` file with your settings. Use the files in the `examples` folder as a reference, and check the [examples README](/examples/README.md) to know about all configurations.

Edit the `.env` file in the root folder by changing the `BOT_TOKEN` string to connect your Telegram account:

- The `BOT_TOKEN` is provided by https://t.me/botfather, more info here: https://core.telegram.org/bots/api
- The `CHAT_ID` is provided after starting a chat with the Telegram bot. It will be saved automatically in the `.env` file.

If you enable the purchase mode, add those strings in the .env file with your account credentials:

    PCC_USER=username@mail.com
    PCC_PASS=userpassword

## Running the project

    $ yarn start

To run it on a Raspberry (maybe chmod + x is needed), you can also execute: `run_raspberry.sh`

## Known issues

### Login fails, but credentials are right

Edit the `puppeteer-config.json` and set `"debug":true`.
Restart the bot, and in the login attempt check if a captcha appears. Solve it manually after the bot introduces the credentials, and perform a login.
Then set `"debug":false` again and check it the problem is solved.

### An issue is not listed here?

Please check the [open](https://github.com/joanroig/pccomponentes-bot/labels/bug) and [closed](https://github.com/joanroig/pccomponentes-bot/issues?q=is%3Aclosed+label%3Abug) bugs in the issue tracker for the details of your bug. If you can't find it, open a [new issue](https://github.com/joanroig/pccomponentes-bot/issues/new?assignees=joanroig&labels=bug&template=bug_report.md&title=%5BBUG%5D+).

## Credits

This project uses modified code from: https://github.com/elpatronaco/pccomponentes-buy-bot
