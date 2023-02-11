import Ajv, { ValidateFunction } from "ajv";
import { Constants } from "./utils/constants";

export default class Validator {
  private readonly articleValidator: ValidateFunction<unknown>;

  constructor() {
    this.articleValidator = this.prepareArticleValidator();
  }

  validateArticle(json: any): boolean {
    return this.articleValidator(json);
  }

  getLastError() {
    return this.articleValidator.errors;
  }

  private prepareArticleValidator(): ValidateFunction<unknown> {
    const ajv = new Ajv();
    const schema = {
      type: "object",
      properties: {
        child: {
          type: "array",
          items: {
            type: "object",
            properties: {
              attr: {
                type: "object",
                properties: {
                  "data-product-name": { type: "array" },
                  "data-product-price": { type: "string" },
                  "data-product-id": { type: "string" },
                },
                required: [
                  Constants.PRODUCT_NAME,
                  Constants.PRODUCT_PRICE,
                  Constants.PRODUCT_ID,
                ],
              },
            },
          },
        },
      },
      required: ["child"],
      additionalProperties: true,
    };
    return ajv.compile(schema);
  }
}
