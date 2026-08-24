import { IBaseOptions, IBaseQuery, IBaseService, UpdatePartial } from 'lib/services/base/base.service.interface';
import {
  IAgent,
  IAgentBase,
  IAgentCryptoRequisitesAdd,
  IAgentCryptoRequisitesRemove,
} from 'lib/interfaces/models/agent.interface';
import { AgentFilesDto } from '../dto/agent-files.dto';

export interface IAgentOptions extends IBaseOptions {
  files?: {
    stamp?: Express.Multer.File;
    signature?: Express.Multer.File;
  };
}

export interface IAgentService extends IBaseService<IAgent> {
  createMany(data: IAgentCreateMany): Promise<void>;

  updateByAdmin(findData: IAgentQuery, updateData: IAgentUpdateByAdmin, options?: IBaseOptions): Promise<IAgent>;

  create(createData: any, options?: IAgentOptions): Promise<IAgent>;

  updateFilesOnly(findData: { _id: string }, options: AgentFilesDto): Promise<IAgent>;
}

export interface IAgentQuery extends IBaseQuery, Partial<Omit<IAgentBase, 'requisites' | 'cryptoRequisites'>> {}

export interface IAgentCreateMany {
  agents: IAgentBase[];
}

export interface IAgentUpdateByAdmin extends UpdatePartial<IAgent> {
  addCryptoRequisites?: IAgentCryptoRequisitesAdd[];
  removeCryptoRequisites?: IAgentCryptoRequisitesRemove[];
  files?: {
    stamp?: Express.Multer.File;
    signature?: Express.Multer.File;
  };
}
