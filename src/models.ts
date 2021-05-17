export interface Article {
  name: string;
  price: number;
  link: string;
  match: string;
  purchase: boolean;
}

export interface ArticleConfig {
  model: string[]; // Array of strings that define the title of the article to track, all strings must be in the article title to be considered as a match
  maxPrice?: number; // Optional maximum price for the given article model
  purchase?: boolean; // Optional boolean to disable an specific article purchase
}

export class CategoryConfig {
  url!: string; // Link to the category Ajax request
  articles: ArticleConfig[] = []; // Array of articles to track
  minUpdateSeconds = 20; // Minimum update time for checking new articles
  maxUpdateSeconds = 40; // Maximum update time for checking new articles
  openOnBrowser = false; // Open new matches in the default browser
  purchaseMultiple = false; // Allow multiple purchases in the category
  checkPages = 2; // Number of pages to check for this category (each page has 24 articles)
  maxPrice?: number; // Optional maximum price for all articles of the category (overrides the article "maxPrice" value)
  purchase = true; // Optional boolean to disable a category purchase (overrides the article "purchase" value)
  public constructor(init: Partial<CategoryConfig>) {
    Object.assign(this, init);
  }
}

export class BotConfig {
  notify;
  purchase;
  saveLogs;
  public constructor(notify: boolean, purchase: boolean, saveLogs: boolean) {
    this.notify = notify;
    this.purchase = purchase;
    this.saveLogs = saveLogs;
  }
}
