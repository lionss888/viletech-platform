import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Token } from './token.schema';
import { Model } from 'mongoose';
import crypto from 'crypto';
import { ITokenCreate, ITokenDelete, ITokenService } from './token.service.interface';
import { IToken } from 'lib/interfaces/models/token.interface';

@Injectable()
export class TokenService implements ITokenService {
  constructor(@InjectModel(Token.name) private model: Model<Token>) {}

  async create(data: ITokenCreate): Promise<IToken> {
    const token = new this.model({
      account: data.account,
      userAgent: data.userAgent,
      ip: data.ip,
      domain: data.domain,
      hash: crypto.randomBytes(64).toString('hex'),
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await token.save();

    return this.model.findOne({ _id: token._id }).populate('account').exec();
  }

  async findOne(dto: Partial<IToken>): Promise<IToken> {
    const token = await this.model
      .findOne({
        ...dto,
        expires: { $gt: new Date() },
      })
      .exec();

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    return token;
  }

  async delete(dto: ITokenDelete): Promise<void> {
    await this.model.deleteMany(dto).exec();
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async deleteObsolete() {
    await this.model.deleteMany({ expires: { $lt: new Date() } }).exec();
  }
}
