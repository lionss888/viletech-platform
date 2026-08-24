/**
 * VF-2: Сервис генерации XML документов для Diadoc
 *
 * Генерирует XML документы в форматах:
 * - Invoice (счёт-фактура)
 * - Torg12 (ТОРГ-12)
 * - AcceptanceCertificate (акт выполненных работ)
 * - UniversalTransferDocument (УПД)
 * - XmlTorg12
 * - XmlAcceptanceCertificate
 *
 * @see https://developer.kontur.ru/doc/diadoc-api/
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  DiadocXmlDocumentType,
  DiadocDocumentFunction,
  IDiadocXmlDocumentData,
  IDiadocXmlOrganization,
  IDiadocXmlInvoiceItem,
  IDiadocXmlGenerationResult,
} from '../types/diadoc-api.types';
import { IFormPayment, IFormPaymentDocs, IFormPaymentInvoice } from '../../../lib/interfaces/models/form-payment.interface';
import { IContract } from '../../../lib/interfaces/models/contract.interface';

/**
 * Интерфейс сервиса генерации XML документов
 */
export interface IDiadocXmlGeneratorService {
  /**
   * Генерирует XML документ указанного типа на основе данных FormPayment
   */
  generateXml(documentType: DiadocXmlDocumentType, formPayment: IFormPayment): Promise<IDiadocXmlGenerationResult>;

  /**
   * Генерирует счёт-фактуру (Invoice)
   */
  generateInvoice(formPayment: IFormPayment): Promise<IDiadocXmlGenerationResult>;

  /**
   * Генерирует ТОРГ-12
   */
  generateTorg12(formPayment: IFormPayment): Promise<IDiadocXmlGenerationResult>;

  /**
   * Генерирует акт выполненных работ
   */
  generateAcceptanceCertificate(formPayment: IFormPayment): Promise<IDiadocXmlGenerationResult>;

  /**
   * Генерирует УПД (Универсальный передаточный документ)
   */
  generateUniversalTransferDocument(formPayment: IFormPayment, documentFunction?: DiadocDocumentFunction): Promise<IDiadocXmlGenerationResult>;

  /**
   * Генерирует XML ТОРГ-12
   */
  generateXmlTorg12(formPayment: IFormPayment): Promise<IDiadocXmlGenerationResult>;

  /**
   * Генерирует XML акт выполненных работ
   */
  generateXmlAcceptanceCertificate(formPayment: IFormPayment): Promise<IDiadocXmlGenerationResult>;

  /**
   * Подготавливает данные для XML документа из FormPayment
   */
  prepareDocumentData(formPayment: IFormPayment, documentType: DiadocXmlDocumentType): IDiadocXmlDocumentData;
}

@Injectable()
export class DiadocXmlGeneratorService implements IDiadocXmlGeneratorService {
  private readonly logger = new Logger(DiadocXmlGeneratorService.name);

  /**
   * Генерирует XML документ указанного типа
   */
  async generateXml(documentType: DiadocXmlDocumentType, formPayment: IFormPayment): Promise<IDiadocXmlGenerationResult> {
    this.logger.log(`Generating XML document: type=${documentType}, formPaymentId=${formPayment._id}`);

    switch (documentType) {
      case DiadocXmlDocumentType.INVOICE:
        return this.generateInvoice(formPayment);
      case DiadocXmlDocumentType.TORG12:
        return this.generateTorg12(formPayment);
      case DiadocXmlDocumentType.ACCEPTANCE_CERTIFICATE:
        return this.generateAcceptanceCertificate(formPayment);
      case DiadocXmlDocumentType.UNIVERSAL_TRANSFER_DOCUMENT:
        return this.generateUniversalTransferDocument(formPayment);
      case DiadocXmlDocumentType.XML_TORG12:
        return this.generateXmlTorg12(formPayment);
      case DiadocXmlDocumentType.XML_ACCEPTANCE_CERTIFICATE:
        return this.generateXmlAcceptanceCertificate(formPayment);
      default:
        throw new BadRequestException(`Unsupported document type: ${documentType}`);
    }
  }

  /**
   * Генерирует счёт-фактуру (Invoice)
   * @see https://developer.kontur.ru/doc/diadoc-api/
   */
  async generateInvoice(formPayment: IFormPayment): Promise<IDiadocXmlGenerationResult> {
    const data = this.prepareDocumentData(formPayment, DiadocXmlDocumentType.INVOICE);
    const xmlContent = this.buildInvoiceXml(data);
    const fileName = `invoice_${data.documentNumber}_${this.formatDateForFileName(data.documentDate)}.xml`;

    this.logger.log(`Generated Invoice XML: formPaymentId=${formPayment._id}, fileName=${fileName}`);

    return {
      xmlContent,
      documentType: DiadocXmlDocumentType.INVOICE,
      fileName,
      size: Buffer.byteLength(xmlContent, 'utf-8'),
    };
  }

  /**
   * Генерирует ТОРГ-12
   */
  async generateTorg12(formPayment: IFormPayment): Promise<IDiadocXmlGenerationResult> {
    const data = this.prepareDocumentData(formPayment, DiadocXmlDocumentType.TORG12);
    const xmlContent = this.buildTorg12Xml(data);
    const fileName = `torg12_${data.documentNumber}_${this.formatDateForFileName(data.documentDate)}.xml`;

    this.logger.log(`Generated Torg12 XML: formPaymentId=${formPayment._id}, fileName=${fileName}`);

    return {
      xmlContent,
      documentType: DiadocXmlDocumentType.TORG12,
      fileName,
      size: Buffer.byteLength(xmlContent, 'utf-8'),
    };
  }

  /**
   * Генерирует акт выполненных работ
   */
  async generateAcceptanceCertificate(formPayment: IFormPayment): Promise<IDiadocXmlGenerationResult> {
    const data = this.prepareDocumentData(formPayment, DiadocXmlDocumentType.ACCEPTANCE_CERTIFICATE);
    const xmlContent = this.buildAcceptanceCertificateXml(data);
    const fileName = `act_${data.documentNumber}_${this.formatDateForFileName(data.documentDate)}.xml`;

    this.logger.log(`Generated AcceptanceCertificate XML: formPaymentId=${formPayment._id}, fileName=${fileName}`);

    return {
      xmlContent,
      documentType: DiadocXmlDocumentType.ACCEPTANCE_CERTIFICATE,
      fileName,
      size: Buffer.byteLength(xmlContent, 'utf-8'),
    };
  }

  /**
   * Генерирует УПД (Универсальный передаточный документ)
   * @see https://developer.kontur.ru/doc/diadoc-api/
   */
  async generateUniversalTransferDocument(
    formPayment: IFormPayment,
    documentFunction: DiadocDocumentFunction = DiadocDocumentFunction.SCHFDOP,
  ): Promise<IDiadocXmlGenerationResult> {
    const data = this.prepareDocumentData(formPayment, DiadocXmlDocumentType.UNIVERSAL_TRANSFER_DOCUMENT);
    data.documentFunction = documentFunction;
    const xmlContent = this.buildUniversalTransferDocumentXml(data);
    const fileName = `upd_${data.documentNumber}_${this.formatDateForFileName(data.documentDate)}.xml`;

    this.logger.log(`Generated UniversalTransferDocument XML: formPaymentId=${formPayment._id}, fileName=${fileName}, function=${documentFunction}`);

    return {
      xmlContent,
      documentType: DiadocXmlDocumentType.UNIVERSAL_TRANSFER_DOCUMENT,
      fileName,
      size: Buffer.byteLength(xmlContent, 'utf-8'),
    };
  }

  /**
   * Генерирует XML ТОРГ-12
   */
  async generateXmlTorg12(formPayment: IFormPayment): Promise<IDiadocXmlGenerationResult> {
    const data = this.prepareDocumentData(formPayment, DiadocXmlDocumentType.XML_TORG12);
    const xmlContent = this.buildXmlTorg12Xml(data);
    const fileName = `xml_torg12_${data.documentNumber}_${this.formatDateForFileName(data.documentDate)}.xml`;

    this.logger.log(`Generated XmlTorg12 XML: formPaymentId=${formPayment._id}, fileName=${fileName}`);

    return {
      xmlContent,
      documentType: DiadocXmlDocumentType.XML_TORG12,
      fileName,
      size: Buffer.byteLength(xmlContent, 'utf-8'),
    };
  }

  /**
   * Генерирует XML акт выполненных работ
   */
  async generateXmlAcceptanceCertificate(formPayment: IFormPayment): Promise<IDiadocXmlGenerationResult> {
    const data = this.prepareDocumentData(formPayment, DiadocXmlDocumentType.XML_ACCEPTANCE_CERTIFICATE);
    const xmlContent = this.buildXmlAcceptanceCertificateXml(data);
    const fileName = `xml_act_${data.documentNumber}_${this.formatDateForFileName(data.documentDate)}.xml`;

    this.logger.log(`Generated XmlAcceptanceCertificate XML: formPaymentId=${formPayment._id}, fileName=${fileName}`);

    return {
      xmlContent,
      documentType: DiadocXmlDocumentType.XML_ACCEPTANCE_CERTIFICATE,
      fileName,
      size: Buffer.byteLength(xmlContent, 'utf-8'),
    };
  }

  /**
   * Подготавливает данные для XML документа из FormPayment
   */
  prepareDocumentData(formPayment: IFormPayment, documentType: DiadocXmlDocumentType): IDiadocXmlDocumentData {
    // Получаем данные организации (продавец = агент/платформа)
    const seller = this.extractSellerOrganization(formPayment);

    // Получаем данные покупателя (клиент)
    const buyer = this.extractBuyerOrganization(formPayment);

    // Получаем товарные позиции из инвойсов
    const items = this.extractInvoiceItems(formPayment);

    // Генерируем номер документа
    const documentNumber = this.generateDocumentNumber(formPayment);

    // Получаем валюту
    const currencyCode = this.getCurrencyCode(formPayment);
    const currencyName = this.getCurrencyName(formPayment);

    // Рассчитываем суммы
    const { totalAmountWithoutVat, totalVatAmount, totalAmountWithVat } = this.calculateTotals(items);

    // Получаем ссылку на договор
    const contractReference = this.extractContractReference(formPayment);

    return {
      documentType,
      documentNumber,
      documentDate: new Date(),
      seller,
      buyer,
      items,
      currencyCode,
      currencyName,
      totalAmountWithoutVat,
      totalVatAmount,
      totalAmountWithVat,
      contractReference,
      principalOrderReference: this.extractPrincipalOrderReference(formPayment),
    };
  }

  // ==================== Private XML Building Methods ====================

  /**
   * Строит XML для счёт-фактуры
   */
  private buildInvoiceXml(data: IDiadocXmlDocumentData): string {
    const header = this.buildXmlHeader();
    const documentInfo = this.buildDocumentInfo(data, 'Файл обмена счета-фактуры');

    return `${header}
<Файл xmlns="http://www.w3.org/2001/XMLSchema" ИдФайл="${this.generateFileId(data)}" ВерсФорм="5.01" ВерсПрог="Diadoc 1.0">
  <СвУчДокОбор>
    <СвОЭДОтпр>
      <НаимОрг>Контур.Диадок</НаимОрг>
      <ИННЮЛ>6663003127</ИННЮЛ>
    </СвОЭДОтпр>
  </СвУчДокОбор>
  <Документ КНД="1115101" ДатаИнфПр="${this.formatDate(data.documentDate)}" ВремИнфПр="${this.formatTime(data.documentDate)}" НаимЭконСуб662="${this.escapeXml(data.seller.shortName || data.seller.fullName)}">
    ${documentInfo}
    <СвСчФакт НомерСчФ="${this.escapeXml(data.documentNumber)}" ДатаСчФ="${this.formatDate(data.documentDate)}" КодОКВ="${data.currencyCode}">
      ${this.buildSellerInfo(data.seller)}
      ${this.buildBuyerInfo(data.buyer)}
      ${data.contractReference ? this.buildContractReference(data.contractReference) : ''}
    </СвСчФакт>
    <ТаsblСчФакт>
      ${this.buildInvoiceItems(data.items)}
      <ВсsегоОпл>
        <СтТовБезНДСВсего>${this.formatAmount(data.totalAmountWithoutVat)}</СтТовБезНДСВсего>
        <СумНалВсего>${this.formatAmount(data.totalVatAmount || 0)}</СумНалВсего>
        <СтТовУчНалВсего>${this.formatAmount(data.totalAmountWithVat)}</СтТовУчНалВсего>
      </ВсsегоОпл>
    </ТаsblСчФакт>
    ${this.buildSignerInfo(data.seller)}
  </Документ>
</Файл>`;
  }

  /**
   * Строит XML для ТОРГ-12
   */
  private buildTorg12Xml(data: IDiadocXmlDocumentData): string {
    const header = this.buildXmlHeader();

    return `${header}
<Файл xmlns="http://www.w3.org/2001/XMLSchema" ИдФайл="${this.generateFileId(data)}" ВерсФорм="5.01" ВерсПрог="Diadoc 1.0">
  <СвУчДокОбор>
    <СвОЭДОтпр>
      <НаимОрг>Контур.Диадок</НаимОрг>
      <ИННЮЛ>6663003127</ИННЮЛ>
    </СвОЭДОтпр>
  </СвУчДокОбор>
  <Документ КНД="1175010" ДатаИнфПр="${this.formatDate(data.documentDate)}" ВремИнфПр="${this.formatTime(data.documentDate)}">
    <СвТНО НомТНО="${this.escapeXml(data.documentNumber)}" ДатаТНО="${this.formatDate(data.documentDate)}">
      ${this.buildSellerInfo(data.seller)}
      ${this.buildBuyerInfo(data.buyer)}
      ${data.contractReference ? this.buildContractReference(data.contractReference) : ''}
    </СвТНО>
    <ТоsварТНО>
      ${this.buildTorg12Items(data.items)}
      <ВсsегоТНО>
        <СумБезНДС>${this.formatAmount(data.totalAmountWithoutVat)}</СумБезНДС>
        <СумНДС>${this.formatAmount(data.totalVatAmount || 0)}</СумНДС>
        <СумВсего>${this.formatAmount(data.totalAmountWithVat)}</СумВсего>
      </ВсsегоТНО>
    </ТоsварТНО>
    ${this.buildSignerInfo(data.seller)}
  </Документ>
</Файл>`;
  }

  /**
   * Строит XML для акта выполненных работ
   */
  private buildAcceptanceCertificateXml(data: IDiadocXmlDocumentData): string {
    const header = this.buildXmlHeader();

    return `${header}
<Файл xmlns="http://www.w3.org/2001/XMLSchema" ИдФайл="${this.generateFileId(data)}" ВерсФорм="5.01" ВерсПрог="Diadoc 1.0">
  <СвУчДокОбор>
    <СвОЭДОтпр>
      <НаимОрг>Контур.Диадок</НаимОрг>
      <ИННЮЛ>6663003127</ИННЮЛ>
    </СвОЭДОтпр>
  </СвУчДокОбор>
  <Документ КНД="1175012" ДатаИнфПр="${this.formatDate(data.documentDate)}" ВремИнфПр="${this.formatTime(data.documentDate)}">
    <СвАкт НомАкт="${this.escapeXml(data.documentNumber)}" ДатаАкт="${this.formatDate(data.documentDate)}">
      ${this.buildSellerInfo(data.seller)}
      ${this.buildBuyerInfo(data.buyer)}
      ${data.contractReference ? this.buildContractReference(data.contractReference) : ''}
    </СвАкт>
    <РаботыУслуги>
      ${this.buildServiceItems(data.items)}
      <ВсsегоРабУсл>
        <СумБезНДС>${this.formatAmount(data.totalAmountWithoutVat)}</СумБезНДС>
        <СумНДС>${this.formatAmount(data.totalVatAmount || 0)}</СумНДС>
        <СумВсего>${this.formatAmount(data.totalAmountWithVat)}</СумВсего>
      </ВсsегоРабУсл>
    </РаботыУслуги>
    ${this.buildSignerInfo(data.seller)}
  </Документ>
</Файл>`;
  }

  /**
   * Строит XML для УПД (Универсальный передаточный документ)
   */
  private buildUniversalTransferDocumentXml(data: IDiadocXmlDocumentData): string {
    const header = this.buildXmlHeader();
    const functionCode = data.documentFunction || DiadocDocumentFunction.SCHFDOP;

    return `${header}
<Файл xmlns="http://www.w3.org/2001/XMLSchema" ИдФайл="${this.generateFileId(data)}" ВерсФорм="5.01" ВерсПрог="Diadoc 1.0">
  <СвУчДокОбор>
    <СвОЭДОтпр>
      <НаимОрг>Контур.Диадок</НаимОрг>
      <ИННЮЛ>6663003127</ИННЮЛ>
    </СвОЭДОтпр>
  </СвУчДокОбор>
  <Документ КНД="1115131" ДатаИнфПр="${this.formatDate(data.documentDate)}" ВремИнфПр="${this.formatTime(data.documentDate)}" НаимЭконСубСост="${this.escapeXml(data.seller.shortName || data.seller.fullName)}" Функция="${functionCode}">
    <СвСчФакт НомерСчФ="${this.escapeXml(data.documentNumber)}" ДатаСчФ="${this.formatDate(data.documentDate)}" КодОКВ="${data.currencyCode}">
      ${this.buildSellerInfo(data.seller)}
      ${this.buildBuyerInfo(data.buyer)}
      ${data.contractReference ? this.buildContractReference(data.contractReference) : ''}
    </СвСчФакт>
    <ТаблСчФакт>
      ${this.buildUpdItems(data.items)}
      <ВсегоОпл>
        <СтТовБезНДСВсего>${this.formatAmount(data.totalAmountWithoutVat)}</СтТовБезНДСВсего>
        <СумНалВсего>${this.formatAmount(data.totalVatAmount || 0)}</СумНалВсего>
        <СтТовУчНалВсего>${this.formatAmount(data.totalAmountWithVat)}</СтТовУчНалВсего>
      </ВсегоОпл>
    </ТаблСчФакт>
    <СвПродПер>
      <СвПер СодОпер="Товары переданы" ДатаПер="${this.formatDate(data.documentDate)}">
        ${data.principalOrderReference ? `<ОснПер НаsимОсн="Поручение принципала" НомОсн="${data.principalOrderReference.number}" ДатаОсн="${this.formatDate(data.principalOrderReference.date)}"/>` : ''}
      </СвПер>
    </СвПродПер>
    ${this.buildSignerInfo(data.seller)}
  </Документ>
</Файл>`;
  }

  /**
   * Строит XML для XmlTorg12
   */
  private buildXmlTorg12Xml(data: IDiadocXmlDocumentData): string {
    // XmlTorg12 использует тот же формат, что и Torg12, но с другим TypeNamedId
    return this.buildTorg12Xml(data);
  }

  /**
   * Строит XML для XmlAcceptanceCertificate
   */
  private buildXmlAcceptanceCertificateXml(data: IDiadocXmlDocumentData): string {
    // XmlAcceptanceCertificate использует тот же формат, что и AcceptanceCertificate
    return this.buildAcceptanceCertificateXml(data);
  }

  // ==================== Helper Methods for XML Building ====================

  private buildXmlHeader(): string {
    return '<?xml version="1.0" encoding="UTF-8"?>';
  }

  private buildDocumentInfo(data: IDiadocXmlDocumentData, description: string): string {
    return `<СвДокИнф НаимДок="${description}"/>`;
  }

  private buildSellerInfo(seller: IDiadocXmlOrganization): string {
    return `<Продавец>
      <ИдСв>
        <СвЮЛУч НаимОрг="${this.escapeXml(seller.fullName)}" ИННЮЛ="${seller.inn}"${seller.kpp ? ` КПП="${seller.kpp}"` : ''}/>
      </ИдСв>
      ${seller.address ? `<Адрес><АдрРФ>${this.escapeXml(seller.address)}</АдрРФ></Адрес>` : ''}
    </Продавец>`;
  }

  private buildBuyerInfo(buyer: IDiadocXmlOrganization): string {
    return `<Покупатель>
      <ИдСв>
        <СвЮЛУч НаsимОрг="${this.escapeXml(buyer.fullName)}" ИННЮЛ="${buyer.inn}"${buyer.kpp ? ` КПП="${buyer.kpp}"` : ''}/>
      </ИдСв>
      ${buyer.address ? `<Адрес><АдрРФ>${this.escapeXml(buyer.address)}</АдрРФ></Адрес>` : ''}
    </Покупатель>`;
  }

  private buildContractReference(contractRef: { number: string; date: Date }): string {
    return `<СвДогПрод НомДог="${this.escapeXml(contractRef.number)}" ДатаДог="${this.formatDate(contractRef.date)}"/>`;
  }

  private buildInvoiceItems(items: IDiadocXmlInvoiceItem[]): string {
    return items.map((item, index) => `
      <СведТов НомСтр="${index + 1}">
        <НаимТов>${this.escapeXml(item.name)}</НаимТов>
        ${item.unitCode ? `<ОКЕИ_Тов>${item.unitCode}</ОКЕИ_Тов>` : ''}
        ${item.quantity ? `<КолТов>${item.quantity}</КолТов>` : ''}
        ${item.price ? `<ЦенаТов>${this.formatAmount(item.price)}</ЦенаТов>` : ''}
        <СтТовБезНДС>${this.formatAmount(item.amountWithoutVat)}</СтТовБезНДС>
        ${item.vatRate !== undefined ? `<НалСт>${item.vatRate === 'без НДС' ? 'без НДС' : item.vatRate + '%'}</НалСт>` : ''}
        ${item.vatAmount !== undefined ? `<СумНал>${this.formatAmount(item.vatAmount)}</СумНал>` : ''}
        <СтТовУчНал>${this.formatAmount(item.amountWithVat)}</СтТовУчНал>
        ${item.productCode ? `<КодТов>${item.productCode}</КодТов>` : ''}
      </СведТов>`).join('\n');
  }

  private buildTorg12Items(items: IDiadocXmlInvoiceItem[]): string {
    return items.map((item, index) => `
      <ТовНакл НомСтр="${index + 1}">
        <НаимТов>${this.escapeXml(item.name)}</НаимТов>
        ${item.unitName ? `<ЕдИзм>${this.escapeXml(item.unitName)}</ЕдИзм>` : ''}
        ${item.quantity ? `<Колsво>${item.quantity}</Колsво>` : ''}
        ${item.price ? `<Цена>${this.formatAmount(item.price)}</Цена>` : ''}
        <СумБезНДС>${this.formatAmount(item.amountWithoutVat)}</СумБезНДС>
        ${item.vatAmount !== undefined ? `<СумНДС>${this.formatAmount(item.vatAmount)}</СумНДС>` : ''}
        <СумВсего>${this.formatAmount(item.amountWithVat)}</СумВсего>
      </ТовНакл>`).join('\n');
  }

  private buildServiceItems(items: IDiadocXmlInvoiceItem[]): string {
    return items.map((item, index) => `
      <РабУсл НомСтр="${index + 1}">
        <НаимРабУсл>${this.escapeXml(item.name)}</НаимРабУсл>
        ${item.quantity ? `<Количество>${item.quantity}</Количество>` : ''}
        ${item.price ? `<Цена>${this.formatAmount(item.price)}</Цена>` : ''}
        <СумБезНДС>${this.formatAmount(item.amountWithoutVat)}</СумБезНДС>
        ${item.vatAmount !== undefined ? `<СумНДС>${this.formatAmount(item.vatAmount)}</СумНДС>` : ''}
        <СумВсего>${this.formatAmount(item.amountWithVat)}</СумВсего>
      </РабУсл>`).join('\n');
  }

  private buildUpdItems(items: IDiadocXmlInvoiceItem[]): string {
    return this.buildInvoiceItems(items);
  }

  private buildSignerInfo(organization: IDiadocXmlOrganization): string {
    return `<Подписант>
      <ЮЛ ИННЮЛ="${organization.inn}"${organization.kpp ? ` КПП="${organization.kpp}"` : ''} НаимОрг="${this.escapeXml(organization.fullName)}">
        <ФИО Фамилия="Подписант" Имя="Уполномоченный" Отчество=""/>
      </ЮЛ>
    </Подписант>`;
  }

  // ==================== Data Extraction Methods ====================

  /**
   * Извлекает данные организации продавца (агент/платформа)
   */
  private extractSellerOrganization(formPayment: IFormPayment): IDiadocXmlOrganization {
    // Продавец = агент (или организация провайдера)
    const agent = formPayment.agent as { inn?: string; kpp?: string; name?: string; fullName?: string; address?: string } | undefined;

    if (agent) {
      return {
        inn: agent.inn || '',
        kpp: agent.kpp,
        fullName: agent.fullName || agent.name || 'Агент',
        shortName: agent.name,
        address: agent.address,
      };
    }

    // Fallback на провайдера
    const providerOrg = formPayment.providerOrganization as { inn?: string; kpp?: string; name?: string; fullName?: string; address?: string } | undefined;
    if (providerOrg) {
      return {
        inn: providerOrg.inn || '',
        kpp: providerOrg.kpp,
        fullName: providerOrg.fullName || providerOrg.name || 'Провайдер',
        shortName: providerOrg.name,
        address: providerOrg.address,
      };
    }

    throw new BadRequestException('Agent or provider organization is required for XML document generation');
  }

  /**
   * Извлекает данные организации покупателя (клиент)
   */
  private extractBuyerOrganization(formPayment: IFormPayment): IDiadocXmlOrganization {
    const organization = formPayment.organization as { inn?: string; kpp?: string; name?: string; fullName?: string; address?: string; legalAddress?: string } | undefined;

    if (organization) {
      return {
        inn: organization.inn || '',
        kpp: organization.kpp,
        fullName: organization.fullName || organization.name || 'Покупатель',
        shortName: organization.name,
        address: organization.legalAddress || organization.address,
        legalAddress: organization.legalAddress,
      };
    }

    throw new BadRequestException('Client organization is required for XML document generation');
  }

  /**
   * Извлекает товарные позиции из инвойсов FormPayment
   */
  private extractInvoiceItems(formPayment: IFormPayment): IDiadocXmlInvoiceItem[] {
    const invoices = formPayment.invoices || [];
    const items: IDiadocXmlInvoiceItem[] = [];
    let itemNumber = 0;

    for (const invoice of invoices) {
      itemNumber++;
      const amount = formPayment.totals?.amount || 0;

      items.push({
        number: itemNumber,
        name: this.getInvoiceItemName(invoice, formPayment),
        unitCode: '796', // штуки по умолчанию
        unitName: 'шт',
        quantity: 1,
        price: amount / 100, // Конвертируем из копеек
        amountWithoutVat: amount / 100,
        vatRate: 'без НДС',
        vatAmount: 0,
        amountWithVat: amount / 100,
        productCode: this.getProductCode(invoice),
      });
    }

    // Если нет инвойсов, создаём одну позицию на основе суммы
    if (items.length === 0 && formPayment.totals?.amount) {
      const amount = formPayment.totals.amount / 100;
      items.push({
        number: 1,
        name: 'Услуги по агентскому договору',
        unitCode: '796',
        unitName: 'шт',
        quantity: 1,
        price: amount,
        amountWithoutVat: amount,
        vatRate: 'без НДС',
        vatAmount: 0,
        amountWithVat: amount,
      });
    }

    return items;
  }

  /**
   * Получает название товарной позиции из инвойса
   */
  private getInvoiceItemName(invoice: IFormPaymentInvoice, formPayment: IFormPayment): string {
    if (invoice.invoiceNumber) {
      return `Услуги по инвойсу ${invoice.invoiceNumber}`;
    }
    if (invoice.contractNumber) {
      return `Услуги по договору ${invoice.contractNumber}`;
    }
    return `Услуги по заявке №${formPayment.uid || formPayment._id}`;
  }

  /**
   * Получает код товара (HS Code)
   */
  private getProductCode(invoice: IFormPaymentInvoice): string | undefined {
    if (invoice.hsCode) {
      return invoice.hsCode;
    }
    if (invoice.hsCodes && invoice.hsCodes.length > 0) {
      return invoice.hsCodes[0].code;
    }
    return undefined;
  }

  /**
   * Генерирует номер документа
   */
  private generateDocumentNumber(formPayment: IFormPayment): string {
    const uid = formPayment.uid || formPayment._id;
    const date = new Date();
    return `${uid}-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  }

  /**
   * Получает код валюты (ISO 4217)
   */
  private getCurrencyCode(formPayment: IFormPayment): string {
    const currency = formPayment.currency?.client || formPayment.currency?.counterparty;
    const currencyMap: Record<string, string> = {
      RUB: '643',
      USD: '840',
      EUR: '978',
      CNY: '156',
      GBP: '826',
      CHF: '756',
      JPY: '392',
    };
    return currencyMap[currency || 'RUB'] || '643';
  }

  /**
   * Получает название валюты
   */
  private getCurrencyName(formPayment: IFormPayment): string {
    const currency = formPayment.currency?.client || formPayment.currency?.counterparty;
    const currencyNames: Record<string, string> = {
      RUB: 'Российский рубль',
      USD: 'Доллар США',
      EUR: 'Евро',
      CNY: 'Китайский юань',
      GBP: 'Фунт стерлингов',
      CHF: 'Швейцарский франк',
      JPY: 'Японская иена',
    };
    return currencyNames[currency || 'RUB'] || 'Российский рубль';
  }

  /**
   * Рассчитывает итоговые суммы
   */
  private calculateTotals(items: IDiadocXmlInvoiceItem[]): {
    totalAmountWithoutVat: number;
    totalVatAmount: number;
    totalAmountWithVat: number;
  } {
    let totalAmountWithoutVat = 0;
    let totalVatAmount = 0;
    let totalAmountWithVat = 0;

    for (const item of items) {
      totalAmountWithoutVat += item.amountWithoutVat;
      totalVatAmount += item.vatAmount || 0;
      totalAmountWithVat += item.amountWithVat;
    }

    return { totalAmountWithoutVat, totalVatAmount, totalAmountWithVat };
  }

  /**
   * Извлекает ссылку на договор
   */
  private extractContractReference(formPayment: IFormPayment): { number: string; date: Date } | undefined {
    const invoices = formPayment.invoices || [];
    for (const invoice of invoices) {
      if (invoice.contractNumber && invoice.contractDate) {
        return {
          number: invoice.contractNumber,
          date: new Date(invoice.contractDate),
        };
      }
    }
    return undefined;
  }

  /**
   * Извлекает ссылку на поручение принципала
   */
  private extractPrincipalOrderReference(formPayment: IFormPayment): { number: string; date: Date } | undefined {
    if (formPayment.signingOrderCreateDate) {
      return {
        number: `ПП-${formPayment.uid || formPayment._id}`,
        date: new Date(formPayment.signingOrderCreateDate),
      };
    }
    return undefined;
  }

  // ==================== Utility Methods ====================

  /**
   * Генерирует идентификатор файла
   */
  private generateFileId(data: IDiadocXmlDocumentData): string {
    const date = this.formatDate(data.documentDate).replace(/\./g, '');
    const sellerInn = data.seller.inn;
    const buyerInn = data.buyer.inn;
    return `ON_SFAKT_${sellerInn}_${buyerInn}_${date}_${Date.now()}`;
  }

  /**
   * Форматирует дату в формат ДД.ММ.ГГГГ
   */
  private formatDate(date: Date): string {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  }

  /**
   * Форматирует время в формат ЧЧ.ММ.СС
   */
  private formatTime(date: Date): string {
    const d = new Date(date);
    return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}.${String(d.getSeconds()).padStart(2, '0')}`;
  }

  /**
   * Форматирует дату для имени файла (YYYYMMDD)
   */
  private formatDateForFileName(date: Date): string {
    const d = new Date(date);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * Форматирует сумму (2 знака после запятой)
   */
  private formatAmount(amount: number): string {
    return amount.toFixed(2);
  }

  /**
   * Экранирует специальные символы XML
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
