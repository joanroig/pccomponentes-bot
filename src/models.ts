export interface Article {
  name: string;
  price: number;
  link: string;
  match: string;
}

export interface ArticleConfig {
  model: string[];
  maxPrice?: number;
  purchase?: boolean; // Boolean to disable an specific article purchase
}

export class CategoryConfig {
  url!: string;
  articles: ArticleConfig[] = [];
  maxPrice?: number;
  minUpdateSeconds = 20;
  maxUpdateSeconds = 40;
  openOnBrowser = false;
  purchaseMultiple = false;
  purchase = true;
  public constructor(init: Partial<CategoryConfig>) {
    Object.assign(this, init);
  }
}

// export class BotConfigModel {
//   notify = true;
//   purchase = false;
//   categories: CategoryConfigModel[] = [];
// }
