export interface IKonturApiResponse extends Record<string, unknown> {
  UL?: IKonturUlData;
  IP?: IKonturIpData;
  ogrn?: string | number;
}

export interface IKonturUlData extends Record<string, unknown> {
  kpp?: string | number;
  legalAddress?: {
    parsedAddressRF?: {
      oneLineFormatOfAddress?: string;
    };
  };
  legalName?: {
    full?: string;
    short?: string;
  };
  opf?: string;
  heads?: Array<{
    fio?: string;
    position?: string;
  }>;
  status?: {
    statusString?: string;
  };
}

export interface IKonturIpData extends Record<string, unknown> {
  fio?: string;
  status?: {
    statusString?: string;
    dissolved?: boolean;
  };
}
