import { Type } from "class-transformer";

export interface Article {
  id: number;
  name: string;
  price: number;
  link: string;
  match: string;
  purchase: boolean;
}

export class ArticleConfig {
  model: string[] = []; // Array of strings that define the title of the article to track, all strings must be in the article title to be considered as a match
  purchase?: boolean; // Optional boolean to DISABLE the purchase for this article
  maxPrice?: number; // Optional maximum price for this article (will be ignored if this value is greater than the category "maxPrice")
  exclude: string[] = []; // Optional array of strings that should NOT be present in the title of this article, in addition of the ones defined in the category
}

export type ArticleOrder =
  | "new"
  | "stock"
  | "relevance"
  | "price-desc"
  | "price-asc"
  | "sales";

export class CategoryConfig {
  name = "Default"; // Category name, used to distinguish between trackers
  url!: string; // Link to the category Ajax request
  @Type(() => ArticleConfig)
  articles: ArticleConfig[] = []; // Array of articles to track
  minUpdateSeconds = 30; // Minimum update time for checking new articles
  maxUpdateSeconds = 40; // Maximum update time for checking new articles
  order: ArticleOrder = "new"; // Order parameter used in the url to fetch the data sorted
  checkPages = 3; // Number of pages to check for this category (each page has 24 articles)
  openOnBrowser = false; // Open new matches in the default browser
  purchaseMultiple = false; // Allow multiple purchases in the category
  purchase = true; // Boolean to disable this category purchase (overrides the article "purchase" values)
  maxPrice?: number; // Optional maximum price for all articles of the category
  exclude: string[] = []; // Optional array of strings that should NOT be present in the title of any article of the category
}

export class BotConfig {
  notify = true; // Boolean to manage the notifications
  purchase = false; // Boolean to manage all purchases (overrides all category and article "purchase" values)
  saveLogs = true; // Boolean to manage the save of logs
  purchaseSame = false; // Allow purchase the same exact article multiple times (a "purchased" list is shared between all trackers to prevent cross-purchases)
  @Type(() => CategoryConfig)
  categories: CategoryConfig[] = []; // Array of categories to track, each category will have a dedicated tracker
}
