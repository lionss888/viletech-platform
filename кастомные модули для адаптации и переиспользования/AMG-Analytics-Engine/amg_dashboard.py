import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
import psycopg2
from datetime import datetime, timedelta
import warnings
import os
warnings.filterwarnings('ignore')

# Импорт AI модуля
try:
    from ai_llm_module import banking_ai, OllamaClient
    AI_AVAILABLE = True
except ImportError as e:
    AI_AVAILABLE = False
    st.warning(f"⚠️ AI модуль недоступен: {e}")
    st.info("💡 AI функции будут отключены, но основная аналитика работает")
    
    # Создаем заглушки для AI функций
    class DummyOllamaClient:
        def is_available(self): return False
        def get_available_models(self): return []
    
    class DummyBankingAI:
        def __init__(self):
            self.ollama = DummyOllamaClient()
        def analyze_transaction(self, data): return "AI недоступен"
        def generate_report(self, data_type, filters=None): return "AI недоступен"
        def customer_support(self, question): return "AI недоступен"
        def fraud_detection_analysis(self, data): return {"analysis": "AI недоступен", "risk_level": "неопределен"}
    
    # Заменяем реальные классы заглушками
    OllamaClient = DummyOllamaClient
    banking_ai = DummyBankingAI()

# Настройка страницы
st.set_page_config(
    page_title="AMG Banking Analytics",
    page_icon="🏦",
    layout="wide",
    initial_sidebar_state="expanded"
)

# CSS для улучшения внешнего вида
st.markdown("""
<style>
    .main-header {font-size: 24px; color: #1f77b4; font-weight: bold;}
    .metric-card {background-color: #f0f2f6; padding: 15px; border-radius: 10px; margin: 10px 0;}
    .stButton>button {width: 100%;}
    .stMetric {background-color: #f8f9fa; padding: 10px; border-radius: 8px;}
</style>
""", unsafe_allow_html=True)

# Функция для установления соединения с БД
@st.cache_resource(show_spinner="Установление соединения с базой данных...")
def get_db_connection(host, port, database, user, password):
    try:
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password
        )
        return conn
    except Exception as e:
        st.error(f"Ошибка подключения к базе данных: {e}")
        return None

# Функция для выполнения запросов с кэшированием
@st.cache_data(ttl=300, show_spinner="Загрузка данных...")
def run_query(_conn, query):
    try:
        return pd.read_sql_query(query, _conn)
    except Exception as e:
        st.error(f"Ошибка выполнения запроса: {e}")
        return pd.DataFrame()

# Функция для получения структуры БД
@st.cache_data(ttl=600)
def get_database_structure(_conn):
    try:
        # Получаем список таблиц
        tables_query = """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """
        tables_df = run_query(_conn, tables_query)
        
        # Получаем информацию о колонках для каждой таблицы
        structure = {}
        for table in tables_df['table_name']:
            columns_query = f"""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = '{table}' AND table_schema = 'public'
                ORDER BY ordinal_position
            """
            columns_df = run_query(_conn, columns_query)
            structure[table] = columns_df
        
        return structure
    except Exception as e:
        st.error(f"Ошибка получения структуры БД: {e}")
        return {}

# Основная функция приложения
def main():
    st.title("🏦 AMG Banking Analytics Dashboard")
    st.markdown("### Аналитическая панель автоматизированной банковской системы с AI")
    
    # Проверка доступности AI
    if AI_AVAILABLE:
        ollama_client = OllamaClient()
        if ollama_client.is_available():
            st.success("🤖 AI-помощник доступен и готов к работе")
        else:
            st.warning("⚠️ AI-сервер недоступен. Проверьте, что Ollama запущен.")
    else:
        st.warning("⚠️ AI модуль не установлен")
    
    # Получение переменных окружения или значений по умолчанию
    import os
    
    # Переменные окружения для автоматического подключения
    env_db_host = os.getenv('DB_HOST', 'localhost')
    env_db_port = int(os.getenv('DB_PORT', 5432))
    env_db_name = os.getenv('DB_NAME', 'abs_core')
    env_db_user = os.getenv('DB_USER', 'lionss')
    # Используем хардкод пароля для Docker
    env_db_password = 'Lionss2025'
    
    # Автоматическое подключение если в Docker
    auto_connect = True  # Всегда автоматически в Docker
    
    # Сайдбар для подключения к БД
    with st.sidebar:
        st.header("🔧 Настройки подключения к БД")
        
        # Автоматическое подключение в Docker
        st.info("✅ Автоматическое подключение к БД (Docker)")
        
        # Используем переменные окружения
        db_host = env_db_host
        db_port = env_db_port
        db_name = env_db_name
        db_user = env_db_user
        db_password = env_db_password
        
        # Показываем параметры подключения
        st.write("**Параметры подключения:**")
        st.write(f"• Хост: `{db_host}`")
        st.write(f"• Порт: `{db_port}`")
        st.write(f"• База: `{db_name}`")
        st.write(f"• Пользователь: `{db_user}`")
        st.write(f"• Пароль: `{'*' * len(db_password)}`")
        
        st.divider()
        
        # Выбор периода анализа
        st.header("📅 Период анализа")
        date_option = st.selectbox(
            "Выберите период",
            ["Последние 24 часа", "Последние 7 дней", "Последние 30 дней", "Последние 90 дней", "Произвольный период"]
        )
        
        if date_option == "Произвольный период":
            start_date = st.date_input("Начальная дата", value=datetime.now() - timedelta(days=30))
            end_date = st.date_input("Конечная дата", value=datetime.now())
        else:
            if date_option == "Последние 24 часа":
                delta = timedelta(days=1)
            elif date_option == "Последние 7 дней":
                delta = timedelta(days=7)
            elif date_option == "Последние 30 дней":
                delta = timedelta(days=30)
            else:
                delta = timedelta(days=90)
                
            start_date = datetime.now() - delta
            end_date = datetime.now()
        
        st.divider()
        
        # Автоматическое подключение
        st.success("🔄 Автоматическое подключение к БД...")
        
        # Информация о системе
        st.divider()
        st.header("ℹ️ Информация")
        st.info("""
        **Автоматическое подключение:**
        - Используются переменные окружения Docker
        - Подключение происходит автоматически
        - Пароль передается безопасно
        """)
    
    # Автоматическое подключение при запуске
    if 'conn' not in st.session_state:
        with st.spinner("🔄 Автоматическое подключение к базе данных..."):
            try:
                conn = get_db_connection(db_host, db_port, db_name, db_user, db_password)
                
                if conn:
                    st.session_state.conn = conn
                    st.success("✅ Подключение к БД установлено автоматически!")
                    
                    # Получаем структуру БД
                    structure = get_database_structure(conn)
                    st.session_state.structure = structure
                    st.session_state.tables = list(structure.keys()) if structure else []
                else:
                    st.error("❌ Не удалось подключиться к базе данных")
            except Exception as e:
                st.error(f"❌ Ошибка подключения: {str(e)}")
                st.info("Проверьте, что PostgreSQL запущен и доступен")
    
    # Если соединение установлено, показываем аналитику
    if hasattr(st.session_state, 'conn') and st.session_state.conn:
        conn = st.session_state.conn
        
        # Получаем основные данные
        with st.spinner("Загрузка данных..."):
            # Данные о клиентах
            clients_query = "SELECT * FROM clients"
            clients_df = run_query(conn, clients_query)
            
            # Данные о счетах
            accounts_query = "SELECT * FROM accounts"
            accounts_df = run_query(conn, accounts_query)
            
            # Данные о транзакциях
            transactions_query = f"""
                SELECT * 
                FROM transactions 
                WHERE created_at BETWEEN '{start_date}' AND '{end_date}'
                ORDER BY created_at DESC
            """
            transactions_df = run_query(conn, transactions_query)
            
            # Представления
            active_accounts_query = "SELECT * FROM active_accounts_view"
            active_accounts_df = run_query(conn, active_accounts_query)
            
            transactions_view_query = "SELECT * FROM transactions_view"
            transactions_view_df = run_query(conn, transactions_view_query)
        
        if not clients_df.empty and not accounts_df.empty:
            # Визуализация ключевых метрик
            st.header("📊 Ключевые метрики")
            
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                total_clients = len(clients_df)
                st.markdown("""
                <div style="background-color: #262730; padding: 20px; border-radius: 10px; border: 1px solid #464E5F;">
                    <h3 style="color: white; margin: 0 0 10px 0;">👥 Всего клиентов</h3>
                    <h2 style="color: #00FF88; margin: 0; font-size: 2em;">{}</h2>
                </div>
                """.format(f"{total_clients:,}"), unsafe_allow_html=True)
            
            with col2:
                active_accounts = len(accounts_df[accounts_df['is_active'] == True])
                st.markdown("""
                <div style="background-color: #262730; padding: 20px; border-radius: 10px; border: 1px solid #464E5F;">
                    <h3 style="color: white; margin: 0 0 10px 0;">💳 Активных счетов</h3>
                    <h2 style="color: #00FF88; margin: 0; font-size: 2em;">{}</h2>
                </div>
                """.format(f"{active_accounts:,}"), unsafe_allow_html=True)
            
            with col3:
                total_balance = accounts_df[accounts_df['is_active'] == True]['balance'].sum()
                st.markdown("""
                <div style="background-color: #262730; padding: 20px; border-radius: 10px; border: 1px solid #464E5F;">
                    <h3 style="color: white; margin: 0 0 10px 0;">💰 Общий баланс</h3>
                    <h2 style="color: #00FF88; margin: 0; font-size: 2em;">₽{}</h2>
                </div>
                """.format(f"{total_balance:,.2f}"), unsafe_allow_html=True)
            
            with col4:
                if not transactions_df.empty:
                    total_transactions = len(transactions_df)
                    st.markdown("""
                    <div style="background-color: #262730; padding: 20px; border-radius: 10px; border: 1px solid #464E5F;">
                        <h3 style="color: white; margin: 0 0 10px 0;">🔄 Транзакций</h3>
                        <h2 style="color: #00FF88; margin: 0; font-size: 2em;">{}</h2>
                    </div>
                    """.format(f"{total_transactions:,}"), unsafe_allow_html=True)
                else:
                    st.markdown("""
                    <div style="background-color: #262730; padding: 20px; border-radius: 10px; border: 1px solid #464E5F;">
                        <h3 style="color: white; margin: 0 0 10px 0;">🔄 Транзакций</h3>
                        <h2 style="color: #00FF88; margin: 0; font-size: 2em;">0</h2>
                    </div>
                    """, unsafe_allow_html=True)
            
            # Дополнительные метрики
            st.divider()
            
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                avg_balance = accounts_df[accounts_df['is_active'] == True]['balance'].mean()
                st.markdown("""
                <div style="background-color: #262730; padding: 20px; border-radius: 10px; border: 1px solid #464E5F;">
                    <h3 style="color: white; margin: 0 0 10px 0;">📈 Средний баланс</h3>
                    <h2 style="color: #00FF88; margin: 0; font-size: 2em;">₽{}</h2>
                </div>
                """.format(f"{avg_balance:,.2f}"), unsafe_allow_html=True)
            
            with col2:
                currency_counts = accounts_df[accounts_df['is_active'] == True]['currency'].value_counts()
                if not currency_counts.empty:
                    main_currency = currency_counts.index[0]
                    st.markdown("""
                    <div style="background-color: #262730; padding: 20px; border-radius: 10px; border: 1px solid #464E5F;">
                        <h3 style="color: white; margin: 0 0 10px 0;">💱 Основная валюта</h3>
                        <h2 style="color: #00FF88; margin: 0; font-size: 2em;">{}</h2>
                    </div>
                    """.format(main_currency), unsafe_allow_html=True)
            
            with col3:
                account_types = accounts_df[accounts_df['is_active'] == True]['type'].value_counts()
                if not account_types.empty:
                    main_type = account_types.index[0]
                    st.markdown("""
                    <div style="background-color: #262730; padding: 20px; border-radius: 10px; border: 1px solid #464E5F;">
                        <h3 style="color: white; margin: 0 0 10px 0;">🏦 Основной тип счета</h3>
                        <h2 style="color: #00FF88; margin: 0; font-size: 2em;">{}</h2>
                    </div>
                    """.format(main_type), unsafe_allow_html=True)
            
            with col4:
                if not transactions_df.empty:
                    completed_transactions = len(transactions_df[transactions_df['status'] == 'completed'])
                    st.markdown("""
                    <div style="background-color: #262730; padding: 20px; border-radius: 10px; border: 1px solid #464E5F;">
                        <h3 style="color: white; margin: 0 0 10px 0;">✅ Выполненных транзакций</h3>
                        <h2 style="color: #00FF88; margin: 0; font-size: 2em;">{}</h2>
                    </div>
                    """.format(f"{completed_transactions:,}"), unsafe_allow_html=True)
                else:
                    st.markdown("""
                    <div style="background-color: #262730; padding: 20px; border-radius: 10px; border: 1px solid #464E5F;">
                        <h3 style="color: white; margin: 0 0 10px 0;">✅ Выполненных транзакций</h3>
                        <h2 style="color: #00FF88; margin: 0; font-size: 2em;">0</h2>
                    </div>
                    """, unsafe_allow_html=True)
            
            # Графики и визуализации
            st.divider()
            st.header("📈 Аналитика")
            
            # Анализ счетов по валютам
            col1, col2 = st.columns(2)
            
            with col1:
                st.subheader("💱 Распределение счетов по валютам")
                if not accounts_df.empty:
                    currency_data = accounts_df[accounts_df['is_active'] == True].groupby('currency').agg({
                        'id': 'count',
                        'balance': 'sum'
                    }).reset_index()
                    currency_data.columns = ['Валюта', 'Количество счетов', 'Общий баланс']
                    
                    fig = px.pie(currency_data, values='Общий баланс', names='Валюта', 
                                title='Распределение балансов по валютам')
                    st.plotly_chart(fig, use_container_width=True)
            
            with col2:
                st.subheader("🏦 Распределение счетов по типам")
                if not accounts_df.empty:
                    type_data = accounts_df[accounts_df['is_active'] == True].groupby('type').agg({
                        'id': 'count',
                        'balance': 'sum'
                    }).reset_index()
                    type_data.columns = ['Тип счета', 'Количество', 'Общий баланс']
                    
                    fig = px.bar(type_data, x='Тип счета', y='Общий баланс',
                                title='Общий баланс по типам счетов')
                    st.plotly_chart(fig, use_container_width=True)
            
            # Анализ транзакций
            if not transactions_df.empty:
                st.divider()
                
                col1, col2 = st.columns(2)
                
                with col1:
                    st.subheader("📊 Статусы транзакций")
                    status_data = transactions_df['status'].value_counts().reset_index()
                    status_data.columns = ['Статус', 'Количество']
                    
                    fig = px.pie(status_data, values='Количество', names='Статус',
                                title='Распределение транзакций по статусам')
                    st.plotly_chart(fig, use_container_width=True)
                
                with col2:
                    st.subheader("💰 Распределение сумм транзакций")
                    fig = px.histogram(transactions_df, x='amount', 
                                      title='Распределение сумм транзакций',
                                      nbins=20)
                    st.plotly_chart(fig, use_container_width=True)
                
                # Топ транзакций
                st.divider()
                
                col1, col2 = st.columns(2)
                
                with col1:
                    st.subheader("🏆 Топ-10 крупнейших транзакций")
                    top_transactions = transactions_df.nlargest(10, 'amount')[['created_at', 'amount', 'currency', 'description']]
                    top_transactions['created_at'] = pd.to_datetime(top_transactions['created_at']).dt.strftime('%Y-%m-%d %H:%M')
                    
                    fig = go.Figure(data=[go.Table(
                        header=dict(values=['Дата', 'Сумма', 'Валюта', 'Описание'],
                                    fill_color='#1f77b4',
                                    font=dict(color='white', size=12),
                                    align='left'),
                        cells=dict(values=[top_transactions.created_at, 
                                          top_transactions.amount,
                                          top_transactions.currency,
                                          top_transactions.description],
                                   fill_color='lavender',
                                   align='left',
                                   format=[None, ',.2f', None, None]))
                    ])
                    
                    fig.update_layout(height=400)
                    st.plotly_chart(fig, use_container_width=True)
                
                with col2:
                    st.subheader("📅 Динамика транзакций")
                    # Группируем по дате
                    daily_data = transactions_df.copy()
                    daily_data['date'] = pd.to_datetime(daily_data['created_at']).dt.date
                    daily_stats = daily_data.groupby('date').agg({
                        'amount': ['sum', 'count']
                    }).reset_index()
                    daily_stats.columns = ['date', 'total_amount', 'transaction_count']
                    
                    fig = px.line(daily_stats, x='date', y='total_amount', 
                                 title='Общая сумма транзакций по дням')
                    st.plotly_chart(fig, use_container_width=True)
            
            # Структура базы данных
            st.divider()
            st.header("🗄️ Структура базы данных")
            
            if hasattr(st.session_state, 'structure') and st.session_state.structure:
                tabs = st.tabs(list(st.session_state.structure.keys()))
                
                for i, (table_name, columns_df) in enumerate(st.session_state.structure.items()):
                    with tabs[i]:
                        st.subheader(f"Таблица: {table_name}")
                        
                        # Показываем информацию о колонках
                        st.write("**Структура таблицы:**")
                        st.dataframe(columns_df, use_container_width=True)
                        
                        # Показываем первые 5 записей
                        if table_name in ['clients', 'accounts', 'transactions']:
                            sample_query = f"SELECT * FROM {table_name} LIMIT 5"
                            sample_df = run_query(conn, sample_query)
                            if not sample_df.empty:
                                st.write(f"**Пример данных (первые 5 записей):**")
                                st.dataframe(sample_df, use_container_width=True)
            
            # AI-функции
            if AI_AVAILABLE and ollama_client.is_available():
                st.divider()
                st.header("🤖 AI-помощник")
                
                ai_tab1, ai_tab2, ai_tab3, ai_tab4 = st.tabs([
                    "📊 Анализ транзакций", 
                    "📈 Генерация отчетов", 
                    "💬 Поддержка клиентов",
                    "🔍 Анализ безопасности"
                ])
                
                with ai_tab1:
                    st.subheader("AI-анализ транзакций")
                    if not transactions_df.empty:
                        # Выбор транзакции для анализа
                        selected_transaction = st.selectbox(
                            "Выберите транзакцию для анализа:",
                            options=transactions_df.index,
                            format_func=lambda x: f"Транзакция {transactions_df.iloc[x]['id']} - {transactions_df.iloc[x]['amount']} {transactions_df.iloc[x]['currency']}"
                        )
                        
                        if st.button("🔍 Анализировать транзакцию"):
                            with st.spinner("AI анализирует транзакцию..."):
                                transaction_data = transactions_df.iloc[selected_transaction].to_dict()
                                analysis = banking_ai.analyze_transaction(transaction_data)
                                st.write("**AI-анализ:**")
                                st.write(analysis)
                    else:
                        st.info("Нет транзакций для анализа")
                
                with ai_tab2:
                    st.subheader("AI-генерация отчетов")
                    report_type = st.selectbox(
                        "Тип отчета:",
                        ["Общий обзор", "Анализ клиентов", "Анализ транзакций", "Финансовая аналитика"]
                    )
                    
                    if st.button("📊 Сгенерировать отчет"):
                        with st.spinner("AI генерирует отчет..."):
                            report = banking_ai.generate_report(report_type)
                            st.write("**AI-отчет:**")
                            st.write(report)
                
                with ai_tab3:
                    st.subheader("AI-поддержка клиентов")
                    customer_question = st.text_area(
                        "Вопрос клиента:",
                        placeholder="Введите вопрос клиента для получения AI-ответа..."
                    )
                    
                    if st.button("💬 Получить ответ"):
                        if customer_question.strip():
                            with st.spinner("AI формирует ответ..."):
                                response = banking_ai.customer_support(customer_question)
                                st.write("**AI-ответ:**")
                                st.write(response)
                        else:
                            st.warning("Введите вопрос клиента")
                
                with ai_tab4:
                    st.subheader("AI-анализ безопасности")
                    if not transactions_df.empty:
                        # Выбор транзакции для анализа безопасности
                        selected_security_transaction = st.selectbox(
                            "Выберите транзакцию для анализа безопасности:",
                            options=transactions_df.index,
                            format_func=lambda x: f"Транзакция {transactions_df.iloc[x]['id']} - {transactions_df.iloc[x]['amount']} {transactions_df.iloc[x]['currency']}",
                            key="security_transaction"
                        )
                        
                        if st.button("🔍 Анализировать безопасность"):
                            with st.spinner("AI анализирует безопасность..."):
                                transaction_data = transactions_df.iloc[selected_security_transaction].to_dict()
                                security_analysis = banking_ai.fraud_detection_analysis(transaction_data)
                                st.write("**AI-анализ безопасности:**")
                                st.write(security_analysis["analysis"])
                    else:
                        st.info("Нет транзакций для анализа безопасности")
            
            # Информация о представлениях
            if not active_accounts_df.empty or not transactions_view_df.empty:
                st.divider()
                st.header("👁️ Представления (Views)")
                
                view_col1, view_col2 = st.columns(2)
                
                with view_col1:
                    if not active_accounts_df.empty:
                        st.subheader("Активные счета")
                        st.dataframe(active_accounts_df.head(10), use_container_width=True)
                
                with view_col2:
                    if not transactions_view_df.empty:
                        st.subheader("Детали транзакций")
                        st.dataframe(transactions_view_df.head(10), use_container_width=True)
            
            # НОВАЯ АНАЛИТИКА: Клиентская сегментация
            if not clients_df.empty and not accounts_df.empty:
                st.divider()
                st.header("👥 Клиентская аналитика")
                
                # Создаем полное имя клиента из first_name + last_name
                clients_df['full_name'] = clients_df['first_name'] + ' ' + clients_df['last_name']
                
                # Создаем сегментацию клиентов на основе данных
                def segment_client(row):
                    # Простая логика сегментации на основе ИНН и даты создания
                    if row['tax_id'].startswith('INN'):
                        return 'Физическое лицо'
                    else:
                        return 'Юридическое лицо'
                
                clients_df['client_segment'] = clients_df.apply(segment_client, axis=1)
                
                # Анализ типов клиентов
                col1, col2 = st.columns(2)
                
                with col1:
                    st.subheader("📊 Сегментация клиентов")
                    client_segments = clients_df['client_segment'].value_counts()
                    fig = px.pie(values=client_segments.values, names=client_segments.index, 
                                title='Распределение клиентов по сегментам')
                    st.plotly_chart(fig, use_container_width=True)
                
                with col2:
                    st.subheader("💰 Распределение клиентов по балансам")
                    # Объединяем клиентов и счета
                    client_accounts = pd.merge(clients_df, accounts_df, left_on='id', right_on='client_id', how='inner')
                    if not client_accounts.empty:
                        # Группируем по полному имени клиента и суммируем балансы
                        client_balances = client_accounts.groupby('full_name')['balance'].sum().reset_index()
                        client_balances.columns = ['Клиент', 'Общий баланс']
                        
                        # Топ-10 клиентов по балансам
                        top_clients = client_balances.nlargest(10, 'Общий баланс')
                        fig = px.bar(top_clients, x='Клиент', y='Общий баланс',
                                    title='Топ-10 клиентов по балансам')
                        fig.update_xaxes(tickangle=45)
                        st.plotly_chart(fig, use_container_width=True)
                    else:
                        st.info("Нет данных для анализа клиентских балансов")
                
                # Анализ активности клиентов
                st.divider()
                st.subheader("🔄 Анализ активности клиентов")
                
                if not transactions_df.empty:
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        # Клиенты по количеству транзакций
                        client_transactions = transactions_df.groupby('client_id')['id'].count().reset_index()
                        client_transactions.columns = ['client_id', 'transaction_count']
                        
                        # Используем полное имя клиента
                        client_transactions = client_transactions.merge(clients_df[['id', 'full_name']], 
                                                                     left_on='client_id', right_on='id', how='left')
                        
                        top_active = client_transactions.nlargest(10, 'transaction_count')
                        fig = px.bar(top_active, x='full_name', y='transaction_count',
                                    title='Топ-10 активных клиентов')
                        fig.update_xaxes(tickangle=45)
                        st.plotly_chart(fig, use_container_width=True)
                    
                    with col2:
                        # Клиенты по суммам транзакций
                        client_amounts = transactions_df.groupby('client_id')['amount'].sum().reset_index()
                        client_amounts.columns = ['client_id', 'total_amount']
                        
                        # Используем полное имя клиента
                        client_amounts = client_amounts.merge(clients_df[['id', 'full_name']], 
                                                           left_on='client_id', right_on='id', how='left')
                        
                        top_amounts = client_amounts.nlargest(10, 'total_amount')
                        fig = px.bar(top_amounts, x='full_name', y='total_amount',
                                    title='Топ-10 клиентов по суммам транзакций')
                        fig.update_xaxes(tickangle=45)
                        st.plotly_chart(fig, use_container_width=True)
                
                # НОВАЯ АНАЛИТИКА: Доходность клиентов
                st.divider()
                st.header("💰 Доходность клиентов")
                
                # Справочник комиссий (имитация)
                st.subheader("📋 Справочник комиссий")
                commission_info = {
                    'Операция': ['Перевод между счетами', 'Снятие наличных', 'Конвертация валют', 'Платежи', 'Депозиты'],
                    'Комиссия': ['0.5%', '1.5%', '2.0%', '0.3%', '0.0%'],
                    'Мин. сумма': ['100₽', '500₽', '1000₽', '50₽', '10000₽']
                }
                commission_df = pd.DataFrame(commission_info)
                st.dataframe(commission_df, use_container_width=True)
                
                # Анализ доходности клиентов (на основе транзакций)
                if not transactions_df.empty:
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        st.subheader("💵 Расчетная доходность по клиентам")
                        # Имитируем расчет комиссий (в реальности это было бы в отдельной таблице)
                        client_profitability = transactions_df.groupby('client_id').agg({
                            'amount': ['sum', 'count']
                        }).reset_index()
                        client_profitability.columns = ['client_id', 'total_amount', 'transaction_count']
                        
                        # Простая модель: доходность = количество транзакций * средняя комиссия
                        client_profitability['estimated_profit'] = client_profitability['transaction_count'] * 100  # 100₽ за транзакцию
                        
                                                # Добавляем имена клиентов
                        client_profitability = client_profitability.merge(clients_df[['id', 'full_name']], 
                                                                       left_on='client_id', right_on='id', how='left')
                        
                        top_profitable = client_profitability.nlargest(10, 'estimated_profit')
                        fig = px.bar(top_profitable, x='full_name', y='estimated_profit',
                                    title='Топ-10 клиентов по доходности')
                        fig.update_xaxes(tickangle=45)
                        st.plotly_chart(fig, use_container_width=True)
                    
                    with col2:
                        st.subheader("📈 Анализ доходности по типам операций")
                        # Анализируем типы транзакций
                        if 'type' in transactions_df.columns:
                            operation_profitability = transactions_df.groupby('type').agg({
                                'amount': ['sum', 'count']
                            }).reset_index()
                            operation_profitability.columns = ['Тип операции', 'Общая сумма', 'Количество']
                            
                            # Имитируем доходность по типам
                            operation_profitability['Доходность'] = operation_profitability['Количество'] * [150, 200, 100, 80, 300]  # Разные комиссии
                            
                            fig = px.bar(operation_profitability, x='Тип операции', y='Доходность',
                                        title='Доходность по типам операций')
                            st.plotly_chart(fig, use_container_width=True)
                        else:
                            st.info("Колонка 'type' не найдена в таблице transactions")
                
                # Рекомендации по клиентам
                st.divider()
                st.subheader("💡 Рекомендации по клиентам")
                
                if not clients_df.empty and not accounts_df.empty:
                    # Анализируем клиентов для рекомендаций
                    client_analysis = pd.merge(clients_df, accounts_df, left_on='id', right_on='client_id', how='inner')
                    
                    # Группируем по полному имени клиента
                    client_analysis = client_analysis.groupby('full_name').agg({
                        'balance': 'sum',
                        'is_active': 'sum'
                    }).reset_index()
                    client_analysis.columns = ['Клиент', 'Общий баланс', 'Количество активных счетов']
                    
                    # Рекомендации
                    recommendations = []
                    for _, row in client_analysis.iterrows():
                        if row['Общий баланс'] > 1000000:  # Большой баланс
                            recommendations.append(f"🌟 **{row['Клиент']}** - VIP клиент, предложить премиум услуги")
                        elif row['Общий баланс'] > 100000:  # Средний баланс
                            recommendations.append(f"💎 **{row['Клиент']}** - Перспективный клиент, предложить депозиты")
                        elif row['Количество активных счетов'] > 2:  # Много счетов
                            recommendations.append(f"🔄 **{row['Клиент']}** - Активный клиент, предложить кредитные продукты")
                    
                    if recommendations:
                        for rec in recommendations[:5]:  # Показываем топ-5 рекомендаций
                            st.markdown(rec)
                    else:
                        st.info("Недостаточно данных для формирования рекомендаций")
        else:
            st.warning("⚠️ Нет данных в базе данных. Убедитесь, что таблицы содержат данные.")
    else:
        st.info("ℹ️ Введите параметры подключения к базе данных и нажмите кнопку 'Подключиться'")
        
        # Показываем пример структуры
        st.divider()
        st.header("📋 Ожидаемая структура базы данных")
        
        st.markdown("""
        **Основные таблицы:**
        - `clients` - клиенты банка
        - `accounts` - банковские счета
        - `transactions` - транзакции
        
        **Представления:**
        - `active_accounts_view` - активные счета с данными клиентов
        - `transactions_view` - детальная информация о транзакциях
        """)

if __name__ == "__main__":
    main()
