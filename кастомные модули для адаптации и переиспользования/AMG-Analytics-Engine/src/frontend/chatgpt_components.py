import streamlit as st
import streamlit.components.v1 as components

def chatgpt_navigation():
    """Навигация в стиле ChatGPT"""
    st.markdown("""
    <style>
    .chatgpt-nav {
        background: #ffffff;
        border-bottom: 1px solid #e2e8f0;
        padding: 1rem 0;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        margin-bottom: 2rem;
    }
    .chatgpt-nav-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 1.5rem;
    }
    .chatgpt-nav-logo {
        color: #2d3748;
        font-size: 1.25rem;
        font-weight: 600;
        text-decoration: none;
        transition: all 0.2s ease-in-out;
    }
    .chatgpt-nav-logo:hover {
        color: #10a37f;
    }
    .chatgpt-nav-menu {
        display: flex;
        gap: 2rem;
        align-items: center;
    }
    .chatgpt-nav-link {
        color: #4a5568;
        text-decoration: none;
        font-weight: 500;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        transition: all 0.2s ease-in-out;
    }
    .chatgpt-nav-link:hover {
        color: #2d3748;
        background: #f7f7f8;
    }
    .chatgpt-nav-link.active {
        color: #10a37f;
        background: rgba(16, 163, 127, 0.1);
    }
    </style>
    """, unsafe_allow_html=True)
    
    st.markdown("""
    <div class="chatgpt-nav">
        <div class="chatgpt-nav-container">
            <a href="#" class="chatgpt-nav-logo">AMG Dashboard</a>
            <div class="chatgpt-nav-menu">
                <a href="#" class="chatgpt-nav-link active">Главная</a>
                <a href="#" class="chatgpt-nav-link">Аналитика</a>
                <a href="#" class="chatgpt-nav-link">Отчеты</a>
                <a href="#" class="chatgpt-nav-link">Настройки</a>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

def chatgpt_card(title, subtitle="", content="", metric_value=None, metric_label=""):
    """Карточка в стиле ChatGPT"""
    st.markdown("""
    <style>
    .chatgpt-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        transition: all 0.2s ease-in-out;
        margin-bottom: 1.5rem;
    }
    .chatgpt-card:hover {
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        transform: translateY(-2px);
    }
    .chatgpt-card-header {
        margin-bottom: 1rem;
    }
    .chatgpt-card-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: #2d3748;
        margin: 0 0 0.5rem 0;
    }
    .chatgpt-card-subtitle {
        font-size: 0.875rem;
        color: #718096;
        margin: 0;
    }
    .chatgpt-card-content {
        color: #4a5568;
    }
    .chatgpt-metric {
        font-size: 2rem;
        font-weight: 700;
        color: #10a37f;
        margin: 0.5rem 0;
    }
    .chatgpt-metric-label {
        font-size: 0.875rem;
        color: #718096;
        margin: 0;
    }
    </style>
    """, unsafe_allow_html=True)
    
    metric_html = ""
    if metric_value is not None:
        metric_html = f"""
        <div class="chatgpt-metric">{metric_value}</div>
        <div class="chatgpt-metric-label">{metric_label}</div>
        """
    
    st.markdown(f"""
    <div class="chatgpt-card">
        <div class="chatgpt-card-header">
            <h3 class="chatgpt-card-title">{title}</h3>
            {f'<p class="chatgpt-card-subtitle">{subtitle}</p>' if subtitle else ''}
        </div>
        <div class="chatgpt-card-content">
            {content}
            {metric_html}
        </div>
    </div>
    """, unsafe_allow_html=True)

def chatgpt_button(text, type="primary", key=None):
    """Кнопка в стиле ChatGPT"""
    st.markdown("""
    <style>
    .chatgpt-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        font-size: 0.875rem;
        text-decoration: none;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease-in-out;
        white-space: nowrap;
    }
    .chatgpt-btn-primary {
        background: #10a37f;
        color: #ffffff;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }
    .chatgpt-btn-primary:hover {
        background: #0d8a6f;
        transform: translateY(-1px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .chatgpt-btn-secondary {
        background: #ffffff;
        color: #2d3748;
        border: 1px solid #cbd5e0;
    }
    .chatgpt-btn-secondary:hover {
        background: #f7f7f8;
        border-color: #a0aec0;
    }
    </style>
    """, unsafe_allow_html=True)
    
    btn_class = f"chatgpt-btn-{type}"
    return st.button(text, key=key, help=f"Кнопка {type}")

def chatgpt_title(text, level=1):
    """Заголовок в стиле ChatGPT"""
    st.markdown("""
    <style>
    .chatgpt-title-1 {
        font-size: 1.875rem;
        font-weight: 700;
        color: #2d3748;
        line-height: 1.2;
        margin: 0 0 1rem 0;
    }
    .chatgpt-title-2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #2d3748;
        line-height: 1.3;
        margin: 0 0 0.75rem 0;
    }
    .chatgpt-title-3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #2d3748;
        line-height: 1.4;
        margin: 0 0 0.5rem 0;
    }
    </style>
    """, unsafe_allow_html=True)
    
    title_class = f"chatgpt-title-{level}"
    st.markdown(f'<h{level} class="{title_class}">{text}</h{level}>', unsafe_allow_html=True)

def chatgpt_text(text, size="base"):
    """Текст в стиле ChatGPT"""
    st.markdown("""
    <style>
    .chatgpt-text-large {
        font-size: 1.125rem;
        color: #2d3748;
        line-height: 1.6;
    }
    .chatgpt-text-base {
        font-size: 1rem;
        color: #4a5568;
        line-height: 1.6;
    }
    .chatgpt-text-small {
        font-size: 0.875rem;
        color: #718096;
        line-height: 1.5;
    }
    </style>
    """, unsafe_allow_html=True)
    
    text_class = f"chatgpt-text-{size}"
    st.markdown(f'<p class="{text_class}">{text}</p>', unsafe_allow_html=True)

def chatgpt_grid(columns=2):
    """Сетка в стиле ChatGPT"""
    st.markdown("""
    <style>
    .chatgpt-grid {
        display: grid;
        gap: 1.5rem;
    }
    .chatgpt-grid-2 {
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }
    .chatgpt-grid-3 {
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    }
    .chatgpt-grid-4 {
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }
    @media (max-width: 768px) {
        .chatgpt-grid-2,
        .chatgpt-grid-3,
        .chatgpt-grid-4 {
            grid-template-columns: 1fr;
        }
    }
    </style>
    """, unsafe_allow_html=True)
    
    grid_class = f"chatgpt-grid-{columns}"
    st.markdown(f'<div class="chatgpt-grid {grid_class}">', unsafe_allow_html=True)

def chatgpt_container():
    """Контейнер в стиле ChatGPT"""
    st.markdown("""
    <style>
    .chatgpt-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        background: #ffffff;
        color: #2d3748;
        line-height: 1.6;
        min-height: 100vh;
    }
    .chatgpt-container-max {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 1.5rem;
    }
    @media (max-width: 768px) {
        .chatgpt-container-max {
            padding: 0 1rem;
        }
    }
    </style>
    """, unsafe_allow_html=True)
    
    st.markdown('<div class="chatgpt-container">', unsafe_allow_html=True)
    st.markdown('<div class="chatgpt-container-max">', unsafe_allow_html=True)

def chatgpt_status(text, type="success"):
    """Статус в стиле ChatGPT"""
    st.markdown("""
    <style>
    .chatgpt-status-success {
        color: #10a37f;
        background: rgba(16, 163, 127, 0.1);
        padding: 0.5rem 1rem;
        border-radius: 8px;
        font-size: 0.875rem;
        margin: 1rem 0;
    }
    .chatgpt-status-error {
        color: #e53e3e;
        background: rgba(229, 62, 62, 0.1);
        padding: 0.5rem 1rem;
        border-radius: 8px;
        font-size: 0.875rem;
        margin: 1rem 0;
    }
    .chatgpt-status-warning {
        color: #d69e2e;
        background: rgba(214, 158, 46, 0.1);
        padding: 0.5rem 1rem;
        border-radius: 8px;
        font-size: 0.875rem;
        margin: 1rem 0;
    }
    </style>
    """, unsafe_allow_html=True)
    
    status_class = f"chatgpt-status-{type}"
    st.markdown(f'<div class="{status_class}">{text}</div>', unsafe_allow_html=True)

def chatgpt_form_input(label, key, placeholder="", type="text"):
    """Поле ввода в стиле ChatGPT"""
    st.markdown("""
    <style>
    .chatgpt-form-group {
        margin-bottom: 1.5rem;
    }
    .chatgpt-label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        color: #2d3748;
        margin-bottom: 0.5rem;
    }
    .chatgpt-input {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 1px solid #cbd5e0;
        border-radius: 8px;
        font-size: 1rem;
        color: #2d3748;
        background: #ffffff;
        transition: all 0.2s ease-in-out;
    }
    .chatgpt-input:focus {
        outline: none;
        border-color: #10a37f;
        box-shadow: 0 0 0 3px rgba(16, 163, 127, 0.1);
    }
    .chatgpt-input::placeholder {
        color: #718096;
    }
    </style>
    """, unsafe_allow_html=True)
    
    st.markdown(f'<label class="chatgpt-label">{label}</label>', unsafe_allow_html=True)
    return st.text_input("", key=key, placeholder=placeholder, label_visibility="collapsed")

def chatgpt_hero_section(title, subtitle=""):
    """Главная секция в стиле ChatGPT"""
    st.markdown("""
    <style>
    .chatgpt-hero {
        background: #ffffff;
        padding: 3rem 0;
        text-align: center;
        margin-bottom: 3rem;
    }
    .chatgpt-hero-title {
        font-size: 2.5rem;
        font-weight: 700;
        color: #2d3748;
        margin: 0 0 1rem 0;
        line-height: 1.2;
    }
    .chatgpt-hero-subtitle {
        font-size: 1.25rem;
        color: #4a5568;
        margin: 0;
        line-height: 1.6;
        max-width: 600px;
        margin: 0 auto;
    }
    @media (max-width: 768px) {
        .chatgpt-hero-title {
            font-size: 2rem;
        }
        .chatgpt-hero-subtitle {
            font-size: 1.125rem;
        }
    }
    </style>
    """, unsafe_allow_html=True)
    
    subtitle_html = f'<p class="chatgpt-hero-subtitle">{subtitle}</p>' if subtitle else ""
    
    st.markdown(f"""
    <div class="chatgpt-hero">
        <h1 class="chatgpt-hero-title">{title}</h1>
        {subtitle_html}
    </div>
    """, unsafe_allow_html=True)
