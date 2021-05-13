import "reflect-metadata";
import Container from "typedi";
import Bot from "./bot";

const botInstance = Container.get(Bot);
botInstance.start();
