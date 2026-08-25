export class MongoosePopulate<T extends string> {
  private readonly values: T[];

  constructor(...values: T[]) {
    this.values = values;
  }

  except(...args: T[]) {
    const restValues = this.values.filter((value) => !args.includes(value));
    return new MongoosePopulate(...restValues);
  }

  pick(...args: T[]) {
    const includedValues = this.values.filter((value) => args.includes(value));
    return new MongoosePopulate(...includedValues);
  }

  toInclude() {
    return [...this.values];
  }
}
