import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';
import { AllCurrencies } from '../lib/enums/common.enums';

/**
 * Миграция для обновления валют THB и CHF в стаканах ликвидности
 * - Если валюта существует в старой структуре (просто число) - преобразует в новую структуру
 * - Если валюта отсутствует - добавляет с новой структурой
 */
export class MigrateThbChfToNewStructure extends MigrationClass {
    constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
        super(client, connection);
    }

    private get liquidityCollection() {
        return this.connection.collection('liquidity');
    }

    /**
     * Проверяет, является ли значение старой структурой (просто число)
     */
    private isOldStructure(value: any): boolean {
        return typeof value === 'number';
    }

    /**
     * Проверяет, является ли значение новой структурой для import
     */
    private isNewImportStructure(value: any): boolean {
        return (
            value !== null &&
            typeof value === 'object' &&
            typeof value.amount === 'number' &&
            !Array.isArray(value)
        );
    }

    /**
     * Проверяет, является ли значение новой структурой для export/commitments
     */
    private isNewExportCommitmentsStructure(value: any): boolean {
        return (
            value !== null &&
            typeof value === 'object' &&
            typeof value.amount === 'number' &&
            Array.isArray(value.providerOrganization)
        );
    }

    /**
     * Преобразует старое значение в новую структуру для import
     */
    private convertToNewImportStructure(oldValue: number): { amount: number } {
        return { amount: oldValue };
    }

    /**
     * Преобразует старое значение в новую структуру для export/commitments
     */
    private convertToNewExportCommitmentsStructure(oldValue: number): { amount: number; providerOrganization: [] } {
        return { amount: oldValue, providerOrganization: [] };
    }

    async up() {
        const currencies = [AllCurrencies.THB, AllCurrencies.CHF];

        // Получаем все документы liquidity
        const liquidityDocs = await this.liquidityCollection.find({}).toArray();

        for (const doc of liquidityDocs) {
            const updates: any = {};

            // Обрабатываем import
            if (doc.import) {
                for (const currency of currencies) {
                    const currencyPath = `import.${currency}`;
                    const currentValue = doc.import[currency];

                    if (currentValue === undefined) {
                        // Валюта отсутствует - добавляем с новой структурой
                        if (!updates.$set) updates.$set = {};
                        updates.$set[currencyPath] = { amount: 0 };
                    } else if (this.isOldStructure(currentValue)) {
                        // Валюта в старой структуре - преобразуем
                        if (!updates.$set) updates.$set = {};
                        updates.$set[currencyPath] = this.convertToNewImportStructure(currentValue as number);
                    } else if (!this.isNewImportStructure(currentValue)) {
                        // Неизвестная структура - перезаписываем на новую с нулевым значением
                        if (!updates.$set) updates.$set = {};
                        updates.$set[currencyPath] = { amount: 0 };
                    }
                    // Если уже в новой структуре - ничего не делаем
                }
            } else {
                // Если import отсутствует, создаем его
                if (!updates.$set) updates.$set = {};
                updates.$set.import = { totalAmount: 0 };
                for (const currency of currencies) {
                    updates.$set[`import.${currency}`] = { amount: 0 };
                }
            }

            // Обрабатываем export
            if (doc.export) {
                for (const currency of currencies) {
                    const currencyPath = `export.${currency}`;
                    const currentValue = doc.export[currency];

                    if (currentValue === undefined) {
                        // Валюта отсутствует - добавляем с новой структурой
                        if (!updates.$set) updates.$set = {};
                        updates.$set[currencyPath] = { amount: 0, providerOrganization: [] };
                    } else if (this.isOldStructure(currentValue)) {
                        // Валюта в старой структуре - преобразуем
                        if (!updates.$set) updates.$set = {};
                        updates.$set[currencyPath] = this.convertToNewExportCommitmentsStructure(currentValue as number);
                    } else if (!this.isNewExportCommitmentsStructure(currentValue)) {
                        // Неизвестная структура - перезаписываем на новую с нулевым значением
                        if (!updates.$set) updates.$set = {};
                        updates.$set[currencyPath] = { amount: 0, providerOrganization: [] };
                    }
                    // Если уже в новой структуре - ничего не делаем
                }
            } else {
                // Если export отсутствует, создаем его
                if (!updates.$set) updates.$set = {};
                updates.$set.export = { totalAmount: 0 };
                for (const currency of currencies) {
                    updates.$set[`export.${currency}`] = { amount: 0, providerOrganization: [] };
                }
            }

            // Обрабатываем commitments
            if (doc.commitments) {
                for (const currency of currencies) {
                    const currencyPath = `commitments.${currency}`;
                    const currentValue = doc.commitments[currency];

                    if (currentValue === undefined) {
                        // Валюта отсутствует - добавляем с новой структурой
                        if (!updates.$set) updates.$set = {};
                        updates.$set[currencyPath] = { amount: 0, providerOrganization: [] };
                    } else if (this.isOldStructure(currentValue)) {
                        // Валюта в старой структуре - преобразуем
                        if (!updates.$set) updates.$set = {};
                        updates.$set[currencyPath] = this.convertToNewExportCommitmentsStructure(currentValue as number);
                    } else if (!this.isNewExportCommitmentsStructure(currentValue)) {
                        // Неизвестная структура - перезаписываем на новую с нулевым значением
                        if (!updates.$set) updates.$set = {};
                        updates.$set[currencyPath] = { amount: 0, providerOrganization: [] };
                    }
                    // Если уже в новой структуре - ничего не делаем
                }
            } else {
                // Если commitments отсутствует, создаем его
                if (!updates.$set) updates.$set = {};
                updates.$set.commitments = { totalAmount: 0 };
                for (const currency of currencies) {
                    updates.$set[`commitments.${currency}`] = { amount: 0, providerOrganization: [] };
                }
            }

            // Применяем обновления, если они есть
            if (Object.keys(updates).length > 0) {
                await this.liquidityCollection.updateOne({ _id: doc._id }, updates);
            }
        }
    }
}

