"""
AMG Banking Analytics Dashboard
Полностью кастомный интерфейс с использованием собственного CSS-фреймворка
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from auth_module import init_auth_session, check_authentication, login_user, logout_user, get_current_user, AuthManager
from custom_dashboard_components import *

# Конфигурация страницы
st.set_page_config(
    page_title="AMG Banking Analytics",
    page_icon="🏦",
    layout="wide",
    initial_sidebar_state="collapsed"
)

def get_database_connection():
    """Получение подключения к базе данных"""
    try:
        connection = psycopg2.connect(
            host=os.getenv('POSTGRES_HOST', 'postgres'),
            port=os.getenv('POSTGRES_PORT', '5432'),
            database=os.getenv('POSTGRES_DB', 'abs_core'),
            user=os.getenv('POSTGRES_USER', 'lionss'),
            password=os.getenv('POSTGRES_PASSWORD', 'lionss')
        )
        return connection
    except Exception as e:
        st.error(f"Ошибка подключения к БД: {e}")
        return None

def get_analytics_data():
    """Получение аналитических данных"""
    connection = get_database_connection()
    if not connection:
        return None, None, None, None, None, None
    
    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            # Основные метрики
            cursor.execute("""
                SELECT 
                    COUNT(DISTINCT c.id) as total_clients,
                    COUNT(DISTINCT a.id) as total_accounts,
                    COUNT(DISTINCT CASE WHEN a.is_active = true THEN a.id END) as active_accounts,
                    COALESCE(SUM(CASE WHEN a.is_active = true THEN a.balance ELSE 0 END), 0) as total_balance,
                    COALESCE(AVG(CASE WHEN a.is_active = true THEN a.balance ELSE NULL END), 0) as avg_balance,
                    COUNT(DISTINCT t.id) as total_transactions
                FROM clients c
                LEFT JOIN accounts a ON c.id = a.client_id
                LEFT JOIN transactions t ON a.id = t.account_id
            """)
            metrics = cursor.fetchone()
            
            # Распределение по валютам
            cursor.execute("""
                SELECT 
                    currency,
                    COUNT(*) as account_count,
                    SUM(balance) as total_balance
                FROM accounts 
                WHERE is_active = true
                GROUP BY currency
                ORDER BY account_count DESC
            """)
            currency_data = cursor.fetchall()
            
            # Распределение по типам счетов
            cursor.execute("""
                SELECT 
                    account_type,
                    COUNT(*) as account_count,
                    SUM(balance) as total_balance
                FROM accounts 
                WHERE is_active = true
                GROUP BY account_type
                ORDER BY account_count DESC
            """)
            account_types_data = cursor.fetchall()
            
            # Активные счета
            cursor.execute("""
                SELECT 
                    a.id, a.account_number, a.account_type, a.currency, 
                    a.balance, a.opened_date, c.first_name, c.last_name
                FROM accounts a
                JOIN clients c ON a.client_id = c.id
                WHERE a.is_active = true
                ORDER BY a.balance DESC
                LIMIT 10
            """)
            active_accounts = cursor.fetchall()
            
            # Последние транзакции
            cursor.execute("""
                SELECT 
                    t.id, t.amount, t.currency, t.description, 
                    t.status, t.created_at, t.executed_at
                FROM transactions t
                ORDER BY t.created_at DESC
                LIMIT 10
            """)
            transactions = cursor.fetchall()
            
            return metrics, currency_data, account_types_data, active_accounts, transactions, connection
            
    except Exception as e:
        st.error(f"Ошибка получения данных: {e}")
        return None, None, None, None, None, connection

def create_currency_chart(currency_data):
    """Создание графика распределения по валютам"""
    if not currency_data:
        return None
    
    df = pd.DataFrame(currency_data)
    fig = px.pie(
        df, 
        values='account_count', 
        names='currency',
        title='Распределение счетов по валютам',
        color_discrete_sequence=px.colors.qualitative.Set3
    )
    fig.update_traces(textposition='inside', textinfo='percent+label')
    fig.update_layout(showlegend=False)
    return fig

def create_account_types_chart(account_types_data):
    """Создание графика распределения по типам счетов"""
    if not account_types_data:
        return None
    
    df = pd.DataFrame(account_types_data)
    fig = px.bar(
        df,
        x='account_type',
        y='total_balance',
        title='Распределение счетов по типам',
        color='account_type',
        color_discrete_sequence=px.colors.qualitative.Set3
    )
    fig.update_layout(xaxis_title='Тип счета', yaxis_title='Общий баланс')
    return fig

def login_form(auth_manager):
    """Форма входа"""
    st.markdown("""
    <div class="custom-hero">
        <h1 class="custom-hero-title">AMG Banking Analytics</h1>
        <p class="custom-hero-subtitle">Войдите в систему для доступа к аналитике</p>
    </div>
    """, unsafe_allow_html=True)
    
    with st.form("login_form"):
        username = st.text_input("Имя пользователя")
        password = st.text_input("Пароль", type="password")
        submit_button = st.form_submit_button("Войти")
        
        if submit_button:
            if login_user(auth_manager, username, password):
                st.success("Вход выполнен успешно!")
                st.rerun()
            else:
                st.error("Неверное имя пользователя или пароль")

def logout_button(auth_manager):
    """Кнопка выхода"""
    if st.sidebar.button("Выйти"):
        logout_user(auth_manager)
        st.rerun()

def main():
    """Основная функция приложения"""
    
    # Загружаем кастомный CSS
    if not load_custom_css():
        st.error("Не удалось загрузить стили")
        return
    
    # Инициализация сессии аутентификации
    init_auth_session()
    
    # Создаем менеджер аутентификации
    db_connection = get_database_connection()
    if not db_connection:
        st.error("Не удалось подключиться к базе данных")
        return
    
    auth_manager = AuthManager(db_connection)
    
    # Проверка аутентификации
    if not check_authentication(auth_manager):
        login_form(auth_manager)
        return
    
    # Создаем основной контейнер
    custom_dashboard_container()
    
    # Навигация
    custom_navigation()
    
    # Основная структура
    custom_main_layout()
    
    # Сайдбар
    custom_sidebar()
    
    # Контентная область
    custom_content_area()
    
    # Получаем данные
    metrics, currency_data, account_types_data, active_accounts, transactions, connection = get_analytics_data()
    
    if metrics:
        # Геро секция
        custom_hero_section()
        
        # Статус баннер
        custom_status_banner()
        
        # Отладочная информация
        custom_debug_info()
        
        # Ключевые метрики
        custom_section("Ключевые метрики", "📊")
        
        # Подготавливаем данные метрик
        metrics_data = [
            {
                'title': 'Всего клиентов',
                'subtitle': 'Общее количество клиентов',
                'value': format_number(metrics['total_clients']),
                'label': 'клиентов',
                'icon': '👥'
            },
            {
                'title': 'Активных счетов',
                'subtitle': 'Количество активных счетов',
                'value': format_number(metrics['active_accounts']),
                'label': 'счетов',
                'icon': '💳'
            },
            {
                'title': 'Общий баланс',
                'subtitle': 'Сумма всех активных счетов',
                'value': format_currency(metrics['total_balance']),
                'label': 'рублей',
                'icon': '💰'
            },
            {
                'title': 'Транзакций',
                'subtitle': 'Общее количество транзакций',
                'value': format_number(metrics['total_transactions']),
                'label': 'операций',
                'icon': '📈'
            }
        ]
        
        # Отображаем метрики
        custom_metrics_grid(metrics_data)
        
        # Дополнительные метрики
        custom_section("Дополнительные метрики", "📋")
        
        additional_metrics = [
            {
                'title': 'Средний баланс',
                'subtitle': 'Средний баланс по счетам',
                'value': format_currency(metrics['avg_balance']),
                'label': 'рублей',
                'icon': '📊'
            }
        ]
        
        custom_metrics_grid(additional_metrics)
        
        # Аналитика
        custom_section("Аналитика", "📊")
        
        # Графики
        col1, col2 = st.columns(2)
        
        with col1:
            if currency_data:
                currency_fig = create_currency_chart(currency_data)
                if currency_fig:
                    st.plotly_chart(currency_fig, use_container_width=True)
        
        with col2:
            if account_types_data:
                account_types_fig = create_account_types_chart(account_types_data)
                if account_types_fig:
                    st.plotly_chart(account_types_fig, use_container_width=True)
        
        # Таблицы данных
        if active_accounts:
            custom_section("Активные счета", "💳")
            
            # Подготавливаем данные для таблицы
            accounts_df = pd.DataFrame(active_accounts)
            if not accounts_df.empty:
                st.dataframe(
                    accounts_df,
                    column_config={
                        "balance": st.column_config.NumberColumn(
                            "Баланс",
                            format="%.2f ₽"
                        ),
                        "opened_date": st.column_config.DateColumn("Дата открытия")
                    },
                    hide_index=True,
                    use_container_width=True
                )
        
        if transactions:
            custom_section("Последние транзакции", "💸")
            
            # Подготавливаем данные для таблицы
            transactions_df = pd.DataFrame(transactions)
            if not transactions_df.empty:
                st.dataframe(
                    transactions_df,
                    column_config={
                        "amount": st.column_config.NumberColumn(
                            "Сумма",
                            format="%.2f"
                        ),
                        "created_at": st.column_config.DatetimeColumn("Дата создания"),
                        "executed_at": st.column_config.DatetimeColumn("Дата выполнения")
                    },
                    hide_index=True,
                    use_container_width=True
                )
    
    else:
        # Если нет данных, показываем сообщение
        custom_section("Ошибка данных", "⚠️")
        st.error("Не удалось получить данные из базы данных")
    
    # Закрываем контейнеры
    close_custom_layout()
    
    # Кнопка выхода
    logout_button(auth_manager)
    
    # Закрываем соединение с БД
    if connection:
        connection.close()

if __name__ == "__main__":
    main()
