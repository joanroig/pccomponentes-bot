# PC ALERTS

Receive a Telegram message when a graphics card is back to stock!
Currenly implemented just for PcComponentes.com (graphics card outlet section)

---

## Requirements

For development, you will only need Node.js and a node global package installed in your environement.

### Node

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
    v8.11.3

    $ npm --version
    6.1.0

If you need to update `npm`, you can make it using `npm`! Cool right? After running the following command, just open again the command line and be happy.

    $ npm install npm -g

---

## Install

    $ git clone https://github.com/joanroig/pcalerts
    $ cd pcalerts
    $ npm install

## Configure app

Open the `config.json` file, then edit it with your settings.
Open the `.env` file in the root folder, change the BOT_TOKEN and CHAT_ID strings to connect your Telegram account:

- The BOT_TOKEN is provided by https://t.me/botfather, more info here: https://core.telegram.org/bots/api
- The CHAT_ID is provided by

## Running the project

    $ npm start

Or easier if using a Raspberry (maybe chmod + x is needed), double click: `run_raspberry.sh`
