"""
Custom Dashboard Components Framework
Полный контроль над интерфейсом Streamlit
"""

import streamlit as st
import streamlit.components.v1 as components

def load_custom_css():
    """Загружает кастомный CSS фреймворк"""
    try:
        with open('custom_dashboard_framework.css', 'r', encoding='utf-8') as f:
            css_content = f.read()
        st.markdown(f'<style>{css_content}</style>', unsafe_allow_html=True)
        return True
    except Exception as e:
        st.error(f"Ошибка загрузки CSS: {e}")
        return False

def custom_dashboard_container():
    """Создает основной контейнер дашборда"""
    st.markdown('<div class="custom-dashboard">', unsafe_allow_html=True)

def custom_navigation(brand="AMG Dashboard", menu_items=None):
    """Создает кастомную навигацию"""
    if menu_items is None:
        menu_items = ["Главная", "Аналитика", "Отчеты", "Настройки"]
    
    menu_html = ""
    for item in menu_items:
        active_class = "active" if item == "Главная" else ""
        menu_html += f'<li class="custom-nav-item"><a href="#" class="custom-nav-link {active_class}">{item}</a></li>'
    
    st.markdown(f"""
    <nav class="custom-nav">
        <div class="custom-nav-content">
            <a href="#" class="custom-nav-brand">{brand}</a>
            <ul class="custom-nav-menu">
                {menu_html}
            </ul>
        </div>
    </nav>
    """, unsafe_allow_html=True)

def custom_sidebar():
    """Создает кастомный сайдбар"""
    st.markdown("""
    <div class="custom-sidebar">
        <div class="custom-sidebar-section">
            <div class="custom-sidebar-title">
                <span>⚙️</span> Настройки
            </div>
            
            <div class="custom-sidebar-card">
                <div class="custom-sidebar-card-title">
                    <span>✅</span> Автоматическое подключение
                </div>
                <div class="custom-sidebar-card-subtitle">Docker окружение</div>
            </div>
            
            <div class="custom-sidebar-card">
                <div class="custom-sidebar-card-title">
                    <span>🔗</span> Параметры подключения
                </div>
                <div class="custom-sidebar-param">Хост: postgres</div>
                <div class="custom-sidebar-param">Порт: 5432</div>
                <div class="custom-sidebar-param">База: abs_core</div>
                <div class="custom-sidebar-param">Пользователь: lionss</div>
            </div>
            
            <div class="custom-sidebar-card">
                <div class="custom-sidebar-card-title">
                    <span>📅</span> Период анализа
                </div>
                <div class="custom-sidebar-card-subtitle">Последние 24 часа</div>
            </div>
            
            <button class="custom-btn custom-btn-danger">
                <span>🗑️</span> Очистить кэш
            </button>
            
            <div class="custom-sidebar-card">
                <div class="custom-sidebar-card-title">
                    <span>🗄️</span> Подключение к БД
                </div>
                <div class="custom-sidebar-card-subtitle">Автоматическое</div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

def custom_hero_section(title="AMG Banking Analytics", subtitle="Современная аналитическая панель для банковских данных"):
    """Создает геро секцию"""
    st.markdown(f"""
    <div class="custom-hero custom-fade-in">
        <h1 class="custom-hero-title">{title}</h1>
        <p class="custom-hero-subtitle">{subtitle}</p>
    </div>
    """, unsafe_allow_html=True)

def custom_status_banner(message="Подключение к БД установлено автоматически!", icon="✅"):
    """Создает статус баннер"""
    st.markdown(f"""
    <div class="custom-status-banner custom-fade-in">
        <span class="custom-status-icon">{icon}</span>
        <p class="custom-status-text">{message}</p>
    </div>
    """, unsafe_allow_html=True)

def custom_metric_card(title, subtitle, value, label, icon="📊"):
    """Создает карточку метрики"""
    st.markdown(f"""
    <div class="custom-metric-card custom-fade-in">
        <div class="custom-metric-header">
            <div class="custom-metric-title">{title}</div>
            <div class="custom-metric-subtitle">{subtitle}</div>
        </div>
        <div class="custom-metric-value">{value}</div>
        <div class="custom-metric-label">{label}</div>
    </div>
    """, unsafe_allow_html=True)

def custom_metrics_grid(metrics_data):
    """Создает сетку метрик"""
    st.markdown('<div class="custom-metrics-grid">', unsafe_allow_html=True)
    
    for metric in metrics_data:
        custom_metric_card(
            title=metric.get('title', ''),
            subtitle=metric.get('subtitle', ''),
            value=metric.get('value', ''),
            label=metric.get('label', ''),
            icon=metric.get('icon', '📊')
        )
    
    st.markdown('</div>', unsafe_allow_html=True)

def custom_section(title, icon="📊"):
    """Создает секцию с заголовком"""
    st.markdown(f"""
    <div class="custom-section">
        <div class="custom-section-header">
            <span class="custom-section-icon">{icon}</span>
            <h2 class="custom-section-title">{title}</h2>
        </div>
    """, unsafe_allow_html=True)

def custom_button(text, variant="primary", icon="", onclick=""):
    """Создает кастомную кнопку"""
    variant_class = f"custom-btn-{variant}" if variant != "default" else ""
    icon_html = f'<span>{icon}</span>' if icon else ""
    
    st.markdown(f"""
    <button class="custom-btn {variant_class}" onclick="{onclick}">
        {icon_html}
        {text}
    </button>
    """, unsafe_allow_html=True)

def custom_card(title, content, icon="📄"):
    """Создает карточку"""
    st.markdown(f"""
    <div class="custom-card custom-fade-in">
        <div class="custom-card-header">
            <span class="custom-card-icon">{icon}</span>
            <h3 class="custom-card-title">{title}</h3>
        </div>
        <div class="custom-card-content">
            {content}
        </div>
    </div>
    """, unsafe_allow_html=True)

def custom_cards_grid(cards_data):
    """Создает сетку карточек"""
    st.markdown('<div class="custom-cards-grid">', unsafe_allow_html=True)
    
    for card in cards_data:
        custom_card(
            title=card.get('title', ''),
            content=card.get('content', ''),
            icon=card.get('icon', '📄')
        )
    
    st.markdown('</div>', unsafe_allow_html=True)

def custom_table(headers, data):
    """Создает кастомную таблицу"""
    headers_html = "".join([f"<th>{header}</th>" for header in headers])
    
    rows_html = ""
    for row in data:
        cells_html = "".join([f"<td>{cell}</td>" for cell in row])
        rows_html += f"<tr>{cells_html}</tr>"
    
    st.markdown(f"""
    <div class="custom-table-container">
        <table class="custom-table">
            <thead>
                <tr>{headers_html}</tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
        </table>
    </div>
    """, unsafe_allow_html=True)

def custom_main_layout():
    """Создает основную структуру макета"""
    st.markdown('<div class="custom-main">', unsafe_allow_html=True)

def custom_content_area():
    """Создает контентную область"""
    st.markdown('<div class="custom-content">', unsafe_allow_html=True)

def close_custom_layout():
    """Закрывает все кастомные контейнеры"""
    st.markdown('</div></div></div>', unsafe_allow_html=True)

def custom_debug_info():
    """Создает секцию отладочной информации"""
    st.markdown("""
    <div class="custom-section">
        <details>
            <summary style="cursor: pointer; color: var(--secondary-text); font-weight: 500;">
                > Отладочная информация
            </summary>
            <div style="margin-top: var(--spacing-md); padding: var(--spacing-md); background: var(--secondary-bg); border-radius: var(--border-radius);">
                <p style="margin: 0; font-family: var(--font-mono); font-size: 0.875rem;">
                    Статус: Подключено<br>
                    Время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br>
                    Версия: 1.0.0
                </p>
            </div>
        </details>
    </div>
    """, unsafe_allow_html=True)

# Утилиты для форматирования
def format_number(num):
    """Форматирует число с разделителями"""
    if num is None:
        return "0"
    return f"{num:,}".replace(",", " ")

def format_currency(amount, currency="₽"):
    """Форматирует валюту"""
    if amount is None:
        return f"0 {currency}"
    return f"{format_number(amount)} {currency}"

def format_percentage(value, total):
    """Форматирует процент"""
    if total == 0:
        return "0%"
    return f"{(value / total * 100):.1f}%"
