import Ajv, { ValidateFunction } from "ajv";

export default class Validator {
  private readonly outletValidator: ValidateFunction<unknown>;

  constructor() {
    this.outletValidator = this.prepareoutletValidator();
  }

  validateOutletArticle(json: any): boolean {
    return this.outletValidator(json);
  }

  getLastError() {
    return this.outletValidator.errors;
  }

  private prepareoutletValidator(): ValidateFunction<unknown> {
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
                  "data-name": { type: "array" },
                  "data-price": { type: "string" },
                },
                required: ["data-name", "data-price"],
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
