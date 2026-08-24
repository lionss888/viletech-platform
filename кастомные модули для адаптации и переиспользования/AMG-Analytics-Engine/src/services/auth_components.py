#!/usr/bin/env python3
"""
AMG Banking Core - Компоненты аутентификации
Компоненты в стиле Monexa для Streamlit
"""

import streamlit as st
import streamlit.components.v1 as components

def monexa_login_form():
    """Форма входа в стиле Monexa"""
    
    # CSS стили в стиле Monexa для светлой темы
    st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    .monexa-container {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        max-width: 400px;
        margin: 0 auto;
        padding: 2rem;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        border: 1px solid #e5e7eb;
    }
    
    .monexa-header {
        text-align: center;
        margin-bottom: 2rem;
    }
    
    .monexa-logo {
        font-size: 2rem;
        font-weight: 700;
        color: #000000;
        margin-bottom: 0.5rem;
    }
    
    .monexa-subtitle {
        color: #666666;
        font-size: 1rem;
    }
    
    .monexa-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    
    .monexa-input {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        font-size: 1rem;
        transition: all 0.25s ease;
        outline: none;
        box-sizing: border-box;
    }
    
    .monexa-input:focus {
        border-color: #000000;
        box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
    }
    
    .monexa-input:hover:not(:focus) {
        border-color: #d1d5db;
    }
    
    .monexa-button {
        width: 100%;
        padding: 0.75rem 1.5rem;
        background: #000000;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.25s ease;
        margin-top: 1rem;
    }
    
    .monexa-button:hover {
        background: #333333;
    }
    
    .monexa-button:active {
        transform: translateY(0);
    }
    
    .monexa-error {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #dc2626;
        padding: 0.75rem;
        border-radius: 8px;
        font-size: 0.875rem;
        margin-bottom: 1rem;
    }
    
    .monexa-success {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #16a34a;
        padding: 0.75rem;
        border-radius: 8px;
        font-size: 0.875rem;
        margin-bottom: 1rem;
    }
    
    .monexa-footer {
        text-align: center;
        margin-top: 1.5rem;
        color: #6b7280;
        font-size: 0.875rem;
    }
    
    .monexa-link {
        color: #2563eb;
        text-decoration: none;
    }
    
    .monexa-link:hover {
        text-decoration: underline;
    }
    
    /* Стили для Streamlit элементов формы */
    .stTextInput > div > div > input {
        background: #ffffff !important;
        border: 2px solid #e5e7eb !important;
        border-radius: 8px !important;
        color: #000000 !important;
        font-family: 'Inter', sans-serif !important;
    }
    
    .stTextInput > div > div > input:focus {
        border-color: #000000 !important;
        box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1) !important;
    }
    
    .stTextInput > div > div > input::placeholder {
        color: #9ca3af !important;
    }
    
    .stTextInput > div > div > label {
        color: #374151 !important;
        font-weight: 500 !important;
        font-family: 'Inter', sans-serif !important;
    }
    
    .stButton > button {
        background: #000000 !important;
        color: white !important;
        border: none !important;
        border-radius: 8px !important;
        font-weight: 500 !important;
        font-family: 'Inter', sans-serif !important;
        padding: 0.75rem 1.5rem !important;
        transition: all 0.25s ease !important;
    }
    
    .stButton > button:hover {
        background: #333333 !important;
    }
    </style>
    """, unsafe_allow_html=True)
    
    # Заголовок формы
    st.markdown("""
    <div class="monexa-header">
        <div class="monexa-logo">🏦 AMG Banking</div>
        <div class="monexa-subtitle">Аналитическая панель</div>
    </div>
    """, unsafe_allow_html=True)
    
    # Streamlit форма входа
    with st.form("login_form", clear_on_submit=False):
        username = st.text_input("Имя пользователя", key="username_input")
        password = st.text_input("Пароль", type="password", key="password_input")
        
        submit_button = st.form_submit_button("Войти в систему", type="primary")
        
        if submit_button:
            return {"username": username, "password": password}
    
    return None

def monexa_navigation():
    """Навигация в стиле Monexa"""
    
    nav_css = """
    <style>
    .monexa-nav {
        background: #ffffff;
        border-bottom: 1px solid #e5e5e5;
        padding: 1rem 0;
        position: sticky;
        top: 0;
        z-index: 1000;
    }
    
    .monexa-nav-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    
    .monexa-nav-logo {
        font-size: 1.5rem;
        font-weight: 700;
        color: #000000;
    }
    
    .monexa-nav-menu {
        display: flex;
        gap: 2rem;
        align-items: center;
    }
    
    .monexa-nav-link {
        color: #333333;
        text-decoration: none;
        font-weight: 500;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        transition: all 0.25s ease;
    }
    
    .monexa-nav-link:hover {
        background: #f5f5f5;
        color: #333333;
    }
    
    .monexa-nav-link.active {
        background: #f5f5f5;
        color: #333333;
    }
    
    .monexa-user-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #6b7280;
        font-size: 0.875rem;
    }
    
    .monexa-logout-btn {
        background: #000000;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.25s ease;
    }
    
    .monexa-logout-btn:hover {
        background: #333333;
    }
    </style>
    """
    
    nav_html = f"""
    {nav_css}
    <div class="monexa-nav">
        <div class="monexa-nav-container">
            <div class="monexa-nav-logo">🏦 AMG Banking Analytics</div>
            <div class="monexa-nav-menu">
                <a href="#" class="monexa-nav-link active">Дашборд</a>
                <a href="#" class="monexa-nav-link">Клиенты</a>
                <a href="#" class="monexa-nav-link">Транзакции</a>
                <a href="#" class="monexa-nav-link">Аналитика</a>
                <a href="#" class="monexa-nav-link">ETL</a>
                <div class="monexa-user-info">
                    <span>👤 lionss</span>
                    <button class="monexa-logout-btn" onclick="logout()">Выйти</button>
                </div>
            </div>
        </div>
    </div>
    
    <script>
    function logout() {{
        window.parent.postMessage({{
            type: 'logout'
        }}, '*');
    }}
    </script>
    """
    
    return components.html(nav_html, height=80)

def monexa_hero_section():
    """Главная секция в стиле Monexa"""
    
    hero_css = """
    <style>
    .monexa-hero {
        background: #ffffff;
        color: #333333;
        padding: 4rem 0;
        text-align: center;
        position: relative;
        overflow: hidden;
    }
    
    .monexa-hero::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><polygon fill="rgba(255,255,255,0.1)" points="0,1000 1000,0 1000,1000"/></svg>');
        background-size: cover;
    }
    
    .monexa-hero-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem;
        position: relative;
        z-index: 2;
    }
    
    .monexa-hero-title {
        font-size: 3.5rem;
        font-weight: 700;
        margin-bottom: 1.5rem;
        line-height: 1.1;
        color: #000000;
    }
    
    .monexa-hero-subtitle {
        font-size: 1.25rem;
        margin-bottom: 2rem;
        color: #666666;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
    }
    
    .monexa-hero-stats {
        display: flex;
        justify-content: center;
        gap: 3rem;
        margin-top: 3rem;
    }
    
    .monexa-stat {
        text-align: center;
    }
    
    .monexa-stat-number {
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
        color: #000000;
    }
    
    .monexa-stat-label {
        font-size: 0.875rem;
        color: #666666;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    
    @media (max-width: 768px) {
        .monexa-hero-title {
            font-size: 2.5rem;
        }
        .monexa-hero-stats {
            flex-direction: column;
            gap: 1.5rem;
        }
    }
    </style>
    """
    
    hero_html = f"""
    {hero_css}
    <div class="monexa-hero">
        <div class="monexa-hero-content">
            <h1 class="monexa-hero-title">AMG Banking Analytics</h1>
            <p class="monexa-hero-subtitle">
                Современная аналитическая панель для автоматизированной банковской системы. 
                Полный контроль над данными, транзакциями и клиентами.
            </p>
            <div class="monexa-hero-stats">
                <div class="monexa-stat">
                    <div class="monexa-stat-number">50</div>
                    <div class="monexa-stat-label">Клиентов</div>
                </div>
                <div class="monexa-stat">
                    <div class="monexa-stat-number">100</div>
                    <div class="monexa-stat-label">Счетов</div>
                </div>
                <div class="monexa-stat">
                    <div class="monexa-stat-number">100</div>
                    <div class="monexa-stat-label">Транзакций</div>
                </div>
                <div class="monexa-stat">
                    <div class="monexa-stat-number">24/7</div>
                    <div class="monexa-stat-label">Мониторинг</div>
                </div>
            </div>
        </div>
    </div>
    """
    
    return components.html(hero_html, height=400)

def monexa_card(title, content, icon="📊"):
    """Карточка в стиле Monexa"""
    
    card_css = """
    <style>
    .monexa-card {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        padding: 1.5rem;
        border: 1px solid #e5e7eb;
        transition: all 0.25s ease;
    }
    
    .monexa-card:hover {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
    }
    
    .monexa-card-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
    }
    
    .monexa-card-icon {
        font-size: 1.5rem;
    }
    
    .monexa-card-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: #111827;
        margin: 0;
    }
    
    .monexa-card-content {
        color: #6b7280;
        line-height: 1.6;
    }
    </style>
    """
    
    card_html = f"""
    {card_css}
    <div class="monexa-card">
        <div class="monexa-card-header">
            <div class="monexa-card-icon">{icon}</div>
            <h3 class="monexa-card-title">{title}</h3>
        </div>
        <div class="monexa-card-content">
            {content}
        </div>
    </div>
    """
    
    return components.html(card_html, height=200)
