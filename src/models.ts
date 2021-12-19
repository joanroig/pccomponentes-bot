import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from "class-validator";

export interface Article {
  id: number;
  name: string;
  price: number;
  link: string;
  purchaseLink: string;
  match: string;
  purchase: boolean;
}

export class CartData {
  @IsNotEmpty()
  totalQty!: number;
  @IsNotEmpty()
  totalToPay!: number;
  @IsNotEmpty()
  @IsArray()
  @ValidateNested()
  articles!: ArticleData[];
}

export class ArticleData {
  @IsNotEmpty()
  name!: string;
  @IsNotEmpty()
  qty!: number;
  @IsNotEmpty()
  unitPrice!: number;
  @IsNotEmpty()
  totalPrice!: number;
}

export class ArticleConfig {
  @IsString({ each: true })
  @IsArray()
  model: string[] = []; // Array of strings that define the title of the article to track, all strings must be in the article title to be considered as a match
  @IsBoolean()
  @IsOptional()
  purchase?: boolean; // Optional boolean to DISABLE the purchase for this article
  @IsNumber()
  @IsOptional()
  maxPrice?: number; // Optional maximum price for this article (will be ignored if this value is greater than the category "maxPrice")
  @IsString({ each: true })
  @IsArray()
  exclude: string[] = []; // Optional array of strings that should NOT be present in the title of this article, in addition to the ones defined in the category
}

enum ArticleOrder {
  new = "new",
  stock = "stock",
  relevance = "relevance",
  pricedesc = "price-desc",
  priceaasc = "price-asc",
  sales = "sales",
}

export class CategoryConfig {
  @IsString()
  name = "Default"; // Category name, used to distinguish between trackers
  @IsNotEmpty()
  @IsUrl()
  url!: string; // Link to the category Ajax request
  @ValidateNested()
  @Type(() => ArticleConfig)
  @IsArray()
  articles: ArticleConfig[] = []; // Array of articles to track
  @IsNumber()
  minUpdateSeconds = 30; // Minimum update time for checking new articles
  @IsNumber()
  maxUpdateSeconds = 40; // Maximum update time for checking new articles
  @IsEnum(ArticleOrder)
  order: ArticleOrder = ArticleOrder.new; // Order parameter used in the url to fetch the data sorted
  @IsNumber()
  checkPages = 3; // Number of pages to check for this category (each page has 24 articles)
  @IsBoolean()
  openOnBrowser = false; // Open new matches in the default browser
  @IsBoolean()
  purchaseMultiple = false; // Allow multiple purchases in the category
  @IsBoolean()
  purchase = true; // Boolean to disable this category purchase (overrides the article "purchase" values)
  @IsBoolean()
  autoSpeedup = false; // Boolean to enable automatic speedup when a change is detected in the categories (changes min and max updates to 1-2 seconds)
  @IsNumber()
  @IsOptional()
  maxPrice?: number; // Optional maximum price for all articles of the category
  @IsString({ each: true })
  @IsArray()
  exclude: string[] = []; // Optional array of strings that should NOT be present in the title of any article of the category
}

export class BotConfig {
  @IsBoolean()
  notify = true; // Boolean to manage the notifications
  @IsBoolean()
  purchase = false; // Boolean to manage all purchases (overrides all category and article "purchase" values)
  @IsBoolean()
  saveLogs = true; // Boolean to manage the save of logs
  @IsBoolean()
  purchaseSame = false; // Allow purchase the same exact article multiple times (a "purchased" list is shared between all trackers to prevent cross-purchases)
  @ValidateNested()
  @IsArray()
  @Type(() => CategoryConfig)
  categories: CategoryConfig[] = []; // Array of categories to track, each category will have a dedicated tracker
}
