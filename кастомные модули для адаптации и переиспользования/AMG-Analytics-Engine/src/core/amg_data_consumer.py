#!/usr/bin/env python3
"""
AMG Banking Core - Унифицированный потребитель данных
Стандартизированный интерфейс для работы с данными банковской системы
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Callable
import logging
from dataclasses import dataclass, field
from abc import ABC, abstractmethod
import json
from enum import Enum

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataType(Enum):
    """Типы данных"""
    CLIENTS = "clients"
    ACCOUNTS = "accounts"
    TRANSACTIONS = "transactions"
    ACTIVE_ACCOUNTS = "active_accounts"
    TRANSACTIONS_VIEW = "transactions_view"
    METRICS = "metrics"

class DataFormat(Enum):
    """Форматы данных"""
    PANDAS = "pandas"
    DICT = "dict"
    JSON = "json"
    LIST = "list"

@dataclass
class DataRequest:
    """Запрос на получение данных"""
    data_type: DataType
    filters: Dict[str, Any] = field(default_factory=dict)
    limit: Optional[int] = None
    offset: Optional[int] = None
    order_by: Optional[str] = None
    format: DataFormat = DataFormat.PANDAS

@dataclass
class DataResponse:
    """Ответ с данными"""
    success: bool
    data: Any
    metadata: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)

class DataValidator:
    """Валидатор данных"""
    
    @staticmethod
    def validate_client_data(df: pd.DataFrame) -> List[str]:
        """Валидация данных клиентов"""
        errors = []
        
        if df.empty:
            errors.append("Данные клиентов пусты")
            return errors
        
        # Проверка обязательных полей
        required_fields = ['first_name', 'last_name', 'tax_id']
        for field in required_fields:
            if field not in df.columns:
                errors.append(f"Отсутствует обязательное поле: {field}")
        
        # Проверка уникальности ИНН
        if 'tax_id' in df.columns:
            duplicates = df['tax_id'].duplicated().sum()
            if duplicates > 0:
                errors.append(f"Найдено {duplicates} дублирующихся ИНН")
        
        # Проверка на пустые значения
        for field in required_fields:
            if field in df.columns:
                null_count = df[field].isnull().sum()
                if null_count > 0:
                    errors.append(f"Поле {field} содержит {null_count} пустых значений")
        
        return errors
    
    @staticmethod
    def validate_account_data(df: pd.DataFrame) -> List[str]:
        """Валидация данных счетов"""
        errors = []
        
        if df.empty:
            errors.append("Данные счетов пусты")
            return errors
        
        # Проверка обязательных полей
        required_fields = ['account_number', 'client_id', 'type', 'currency', 'balance']
        for field in required_fields:
            if field not in df.columns:
                errors.append(f"Отсутствует обязательное поле: {field}")
        
        # Проверка уникальности номеров счетов
        if 'account_number' in df.columns:
            duplicates = df['account_number'].duplicated().sum()
            if duplicates > 0:
                errors.append(f"Найдено {duplicates} дублирующихся номеров счетов")
        
        # Проверка баланса
        if 'balance' in df.columns:
            negative_balance = (df['balance'] < 0).sum()
            if negative_balance > 0:
                errors.append(f"Найдено {negative_balance} счетов с отрицательным балансом")
        
        return errors
    
    @staticmethod
    def validate_transaction_data(df: pd.DataFrame) -> List[str]:
        """Валидация данных транзакций"""
        errors = []
        
        if df.empty:
            errors.append("Данные транзакций пусты")
            return errors
        
        # Проверка обязательных полей
        required_fields = ['debit_account_id', 'credit_account_id', 'amount', 'currency']
        for field in required_fields:
            if field not in df.columns:
                errors.append(f"Отсутствует обязательное поле: {field}")
        
        # Проверка суммы транзакций
        if 'amount' in df.columns:
            zero_amount = (df['amount'] <= 0).sum()
            if zero_amount > 0:
                errors.append(f"Найдено {zero_amount} транзакций с нулевой или отрицательной суммой")
        
        return errors

class DataTransformer:
    """Трансформатор данных"""
    
    @staticmethod
    def transform_to_dict(df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Преобразование DataFrame в список словарей"""
        return df.to_dict('records')
    
    @staticmethod
    def transform_to_json(df: pd.DataFrame) -> str:
        """Преобразование DataFrame в JSON строку"""
        return df.to_json(orient='records', indent=2, force_ascii=False)
    
    @staticmethod
    def transform_to_list(df: pd.DataFrame) -> List[List[Any]]:
        """Преобразование DataFrame в список списков"""
        return [df.columns.tolist()] + df.values.tolist()
    
    @staticmethod
    def apply_filters(df: pd.DataFrame, filters: Dict[str, Any]) -> pd.DataFrame:
        """Применение фильтров к данным"""
        filtered_df = df.copy()
        
        for field, value in filters.items():
            if field in filtered_df.columns:
                if isinstance(value, (list, tuple)):
                    filtered_df = filtered_df[filtered_df[field].isin(value)]
                elif isinstance(value, dict):
                    if 'min' in value:
                        filtered_df = filtered_df[filtered_df[field] >= value['min']]
                    if 'max' in value:
                        filtered_df = filtered_df[filtered_df[field] <= value['max']]
                    if 'contains' in value:
                        filtered_df = filtered_df[filtered_df[field].str.contains(value['contains'], na=False)]
                else:
                    filtered_df = filtered_df[filtered_df[field] == value]
        
        return filtered_df
    
    @staticmethod
    def apply_sorting(df: pd.DataFrame, order_by: Optional[str]) -> pd.DataFrame:
        """Применение сортировки"""
        if order_by:
            ascending = True
            if order_by.startswith('-'):
                order_by = order_by[1:]
                ascending = False
            
            if order_by in df.columns:
                return df.sort_values(by=order_by, ascending=ascending)
        
        return df

class DataAggregator:
    """Агрегатор данных"""
    
    @staticmethod
    def aggregate_by_currency(df: pd.DataFrame) -> pd.DataFrame:
        """Агрегация по валютам"""
        if 'currency' not in df.columns or 'balance' not in df.columns:
            return pd.DataFrame()
        
        return df.groupby('currency').agg({
            'balance': ['sum', 'mean', 'count'],
            'id': 'count'
        }).round(2)
    
    @staticmethod
    def aggregate_by_account_type(df: pd.DataFrame) -> pd.DataFrame:
        """Агрегация по типам счетов"""
        if 'type' not in df.columns or 'balance' not in df.columns:
            return pd.DataFrame()
        
        return df.groupby('type').agg({
            'balance': ['sum', 'mean', 'count'],
            'id': 'count'
        }).round(2)
    
    @staticmethod
    def aggregate_transactions_by_date(df: pd.DataFrame) -> pd.DataFrame:
        """Агрегация транзакций по датам"""
        if 'created_at' not in df.columns or 'amount' not in df.columns:
            return pd.DataFrame()
        
        df_copy = df.copy()
        df_copy['date'] = pd.to_datetime(df_copy['created_at']).dt.date
        
        return df_copy.groupby('date').agg({
            'amount': ['sum', 'count', 'mean'],
            'id': 'count'
        }).round(2)
    
    @staticmethod
    def get_top_clients(df: pd.DataFrame, top_n: int = 10) -> pd.DataFrame:
        """Получение топ клиентов по балансу"""
        if 'balance' not in df.columns:
            return pd.DataFrame()
        
        return df.nlargest(top_n, 'balance')[['first_name', 'last_name', 'balance', 'currency']]

class DataConsumer:
    """Унифицированный потребитель данных"""
    
    def __init__(self, connector):
        self.connector = connector
        self.validator = DataValidator()
        self.transformer = DataTransformer()
        self.aggregator = DataAggregator()
    
    def get_data(self, request: DataRequest) -> DataResponse:
        """Получение данных согласно запросу"""
        try:
            # Получение данных из коннектора
            raw_data = self._fetch_data(request.data_type)
            
            if raw_data.empty:
                return DataResponse(
                    success=False,
                    data=None,
                    error="Данные не найдены"
                )
            
            # Валидация данных
            validation_errors = self._validate_data(request.data_type, raw_data)
            if validation_errors:
                return DataResponse(
                    success=False,
                    data=None,
                    error=f"Ошибки валидации: {', '.join(validation_errors)}"
                )
            
            # Применение фильтров
            filtered_data = self.transformer.apply_filters(raw_data, request.filters)
            
            # Применение сортировки
            sorted_data = self.transformer.apply_sorting(filtered_data, request.order_by)
            
            # Применение лимитов
            if request.limit:
                sorted_data = sorted_data.head(request.limit)
            
            if request.offset:
                sorted_data = sorted_data.iloc[request.offset:]
            
            # Преобразование в нужный формат
            formatted_data = self._format_data(sorted_data, request.format)
            
            # Создание метаданных
            metadata = {
                "total_records": len(raw_data),
                "filtered_records": len(sorted_data),
                "data_type": request.data_type.value,
                "format": request.format.value,
                "filters_applied": bool(request.filters),
                "timestamp": datetime.now().isoformat()
            }
            
            return DataResponse(
                success=True,
                data=formatted_data,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"❌ Ошибка получения данных: {e}")
            return DataResponse(
                success=False,
                data=None,
                error=str(e)
            )
    
    def _fetch_data(self, data_type: DataType) -> pd.DataFrame:
        """Получение данных из коннектора"""
        if data_type == DataType.CLIENTS:
            return self.connector.get_clients()
        elif data_type == DataType.ACCOUNTS:
            return self.connector.get_accounts()
        elif data_type == DataType.TRANSACTIONS:
            return self.connector.get_transactions()
        elif data_type == DataType.ACTIVE_ACCOUNTS:
            return self.connector.get_active_accounts_view()
        elif data_type == DataType.TRANSACTIONS_VIEW:
            return self.connector.get_transactions_view()
        elif data_type == DataType.METRICS:
            metrics = self.connector.get_metrics()
            return pd.DataFrame([metrics])
        else:
            raise ValueError(f"Неизвестный тип данных: {data_type}")
    
    def _validate_data(self, data_type: DataType, df: pd.DataFrame) -> List[str]:
        """Валидация данных"""
        if data_type == DataType.CLIENTS:
            return self.validator.validate_client_data(df)
        elif data_type == DataType.ACCOUNTS:
            return self.validator.validate_account_data(df)
        elif data_type == DataType.TRANSACTIONS:
            return self.validator.validate_transaction_data(df)
        else:
            return []
    
    def _format_data(self, df: pd.DataFrame, format_type: DataFormat) -> Any:
        """Форматирование данных"""
        if format_type == DataFormat.PANDAS:
            return df
        elif format_type == DataFormat.DICT:
            return self.transformer.transform_to_dict(df)
        elif format_type == DataFormat.JSON:
            return self.transformer.transform_to_json(df)
        elif format_type == DataFormat.LIST:
            return self.transformer.transform_to_list(df)
        else:
            return df
    
    def get_aggregated_data(self, data_type: DataType, aggregation_type: str, **kwargs) -> DataResponse:
        """Получение агрегированных данных"""
        try:
            # Получение базовых данных
            request = DataRequest(data_type=data_type)
            response = self.get_data(request)
            
            if not response.success:
                return response
            
            df = response.data
            
            # Применение агрегации
            if aggregation_type == "by_currency":
                aggregated_data = self.aggregator.aggregate_by_currency(df)
            elif aggregation_type == "by_account_type":
                aggregated_data = self.aggregator.aggregate_by_account_type(df)
            elif aggregation_type == "by_date":
                aggregated_data = self.aggregator.aggregate_transactions_by_date(df)
            elif aggregation_type == "top_clients":
                top_n = kwargs.get('top_n', 10)
                aggregated_data = self.aggregator.get_top_clients(df, top_n)
            else:
                return DataResponse(
                    success=False,
                    data=None,
                    error=f"Неизвестный тип агрегации: {aggregation_type}"
                )
            
            metadata = {
                "aggregation_type": aggregation_type,
                "original_records": len(df),
                "aggregated_records": len(aggregated_data),
                "timestamp": datetime.now().isoformat()
            }
            
            return DataResponse(
                success=True,
                data=aggregated_data,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"❌ Ошибка агрегации данных: {e}")
            return DataResponse(
                success=False,
                data=None,
                error=str(e)
            )

# Примеры использования
def example_usage():
    """Пример использования унифицированного потребителя данных"""
    
    from amg_connector import AMGConnector, ConnectionConfig
    
    # Создание коннектора
    config = ConnectionConfig()
    connector = AMGConnector(config)
    
    # Создание потребителя данных
    consumer = DataConsumer(connector)
    
    try:
        # 1. Получение клиентов в формате словарей
        request = DataRequest(
            data_type=DataType.CLIENTS,
            format=DataFormat.DICT,
            limit=5
        )
        response = consumer.get_data(request)
        
        if response.success:
            print(f"✅ Клиенты получены: {len(response.data)} записей")
            print(f"Метаданные: {response.metadata}")
        else:
            print(f"❌ Ошибка: {response.error}")
        
        # 2. Получение счетов с фильтрами
        request = DataRequest(
            data_type=DataType.ACCOUNTS,
            filters={"is_active": True, "currency": "RUB"},
            format=DataFormat.PANDAS
        )
        response = consumer.get_data(request)
        
        if response.success:
            print(f"✅ Активные рублевые счета: {len(response.data)} записей")
        
        # 3. Получение агрегированных данных
        response = consumer.get_aggregated_data(
            DataType.ACCOUNTS,
            "by_currency"
        )
        
        if response.success:
            print(f"✅ Агрегация по валютам:")
            print(response.data)
        
        # 4. Получение топ клиентов
        response = consumer.get_aggregated_data(
            DataType.ACCOUNTS,
            "top_clients",
            top_n=5
        )
        
        if response.success:
            print(f"✅ Топ-5 клиентов:")
            print(response.data)
        
    finally:
        connector.close()

if __name__ == "__main__":
    example_usage()
