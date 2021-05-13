export interface ProductModel {
  name: string;
  price: number;
  link: string;
  match: string;
}

export interface ProductConfigModel {
  url: string;
  models: string[];
  minUpdateSeconds: number;
  maxUpdateSeconds: number;
  maxPrice: number;
  purchaseMultiple: boolean;
  purchaseConditions?: PurchaseConditionsModel[];
}

export interface PurchaseConditionsModel {
  variant: string[];
  price: number;
}
