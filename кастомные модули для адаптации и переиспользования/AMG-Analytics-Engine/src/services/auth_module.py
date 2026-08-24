#!/usr/bin/env python3
"""
AMG Banking Core - Модуль аутентификации
Полноценная система аутентификации с базой данных
"""

import streamlit as st
import psycopg2
import bcrypt
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

class AuthManager:
    """Менеджер аутентификации пользователей"""
    
    def __init__(self, db_connection):
        self.conn = db_connection
        self.setup_database()
    
    def setup_database(self):
        """Создание таблиц пользователей если их нет"""
        try:
            cursor = self.conn.cursor()
            
            # Создание таблицы пользователей
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    email VARCHAR(100),
                    full_name VARCHAR(100),
                    role VARCHAR(20) DEFAULT 'user',
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Создание таблицы сессий
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    session_token VARCHAR(255) UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    is_active BOOLEAN DEFAULT true
                )
            """)
            
            # Создание индексов
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token)
            """)
            
            # Вставка демо пользователя если его нет
            cursor.execute("""
                INSERT INTO users (username, password_hash, email, full_name, role) 
                VALUES (
                    'lionss', 
                    %s,
                    'lionss@amg-banking.com',
                    'Lionss User',
                    'admin'
                ) ON CONFLICT (username) DO NOTHING
            """, (self.hash_password('Development2025'),))
            
            self.conn.commit()
            cursor.close()
            
        except Exception as e:
            st.error(f"Ошибка настройки базы данных: {e}")
    
    def hash_password(self, password: str) -> str:
        """Хеширование пароля с bcrypt"""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Проверка пароля"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Аутентификация пользователя"""
        try:
            cursor = self.conn.cursor()
            
            cursor.execute("""
                SELECT id, username, password_hash, email, full_name, role, is_active
                FROM users 
                WHERE username = %s AND is_active = true
            """, (username,))
            
            user_data = cursor.fetchone()
            cursor.close()
            
            if user_data and self.verify_password(password, user_data[2]):
                # Обновляем время последнего входа
                cursor = self.conn.cursor()
                cursor.execute("""
                    UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = %s
                """, (user_data[0],))
                self.conn.commit()
                cursor.close()
                
                return {
                    'id': user_data[0],
                    'username': user_data[1],
                    'email': user_data[3],
                    'full_name': user_data[4],
                    'role': user_data[5]
                }
            
            return None
            
        except Exception as e:
            st.error(f"Ошибка аутентификации: {e}")
            return None
    
    def create_session(self, user_id: int) -> str:
        """Создание новой сессии"""
        try:
            cursor = self.conn.cursor()
            
            # Генерируем токен сессии
            token = secrets.token_urlsafe(32)
            expires_at = datetime.now() + timedelta(hours=24)
            
            cursor.execute("""
                INSERT INTO user_sessions (user_id, session_token, expires_at)
                VALUES (%s, %s, %s)
            """, (user_id, token, expires_at))
            
            self.conn.commit()
            cursor.close()
            
            return token
            
        except Exception as e:
            st.error(f"Ошибка создания сессии: {e}")
            return None
    
    def validate_session(self, token: str) -> Optional[Dict[str, Any]]:
        """Проверка валидности сессии"""
        try:
            cursor = self.conn.cursor()
            
            cursor.execute("""
                SELECT us.user_id, u.username, u.email, u.full_name, u.role
                FROM user_sessions us
                JOIN users u ON us.user_id = u.id
                WHERE us.session_token = %s 
                AND us.expires_at > CURRENT_TIMESTAMP 
                AND us.is_active = true
                AND u.is_active = true
            """, (token,))
            
            user_data = cursor.fetchone()
            cursor.close()
            
            if user_data:
                return {
                    'id': user_data[0],
                    'username': user_data[1],
                    'email': user_data[2],
                    'full_name': user_data[3],
                    'role': user_data[4]
                }
            
            return None
            
        except Exception as e:
            st.error(f"Ошибка проверки сессии: {e}")
            return None
    
    def logout_user(self, token: str) -> bool:
        """Выход пользователя (деактивация сессии)"""
        try:
            cursor = self.conn.cursor()
            
            cursor.execute("""
                UPDATE user_sessions 
                SET is_active = false 
                WHERE session_token = %s
            """, (token,))
            
            self.conn.commit()
            cursor.close()
            
            return True
            
        except Exception as e:
            st.error(f"Ошибка выхода: {e}")
            return False
    
    def cleanup_expired_sessions(self) -> int:
        """Очистка истекших сессий"""
        try:
            cursor = self.conn.cursor()
            
            cursor.execute("""
                DELETE FROM user_sessions 
                WHERE expires_at < CURRENT_TIMESTAMP OR is_active = false
            """)
            
            deleted_count = cursor.rowcount
            self.conn.commit()
            cursor.close()
            
            return deleted_count
            
        except Exception as e:
            st.error(f"Ошибка очистки сессий: {e}")
            return 0

# Функции для работы с Streamlit сессиями
def init_auth_session():
    """Инициализация сессии аутентификации"""
    if 'auth_token' not in st.session_state:
        st.session_state.auth_token = None
    if 'user_data' not in st.session_state:
        st.session_state.user_data = None
    if 'is_authenticated' not in st.session_state:
        st.session_state.is_authenticated = False

def login_user(auth_manager: AuthManager, username: str, password: str) -> bool:
    """Вход пользователя"""
    user_data = auth_manager.authenticate_user(username, password)
    
    if user_data:
        # Создаем сессию в БД
        token = auth_manager.create_session(user_data['id'])
        
        if token:
            # Сохраняем в Streamlit сессии
            st.session_state.auth_token = token
            st.session_state.user_data = user_data
            st.session_state.is_authenticated = True
            return True
    
    return False

def logout_user(auth_manager: AuthManager):
    """Выход пользователя"""
    if st.session_state.auth_token:
        auth_manager.logout_user(st.session_state.auth_token)
    
    # Очищаем Streamlit сессию
    st.session_state.auth_token = None
    st.session_state.user_data = None
    st.session_state.is_authenticated = False

def check_authentication(auth_manager: AuthManager) -> bool:
    """Проверка аутентификации пользователя"""
    if not st.session_state.is_authenticated or not st.session_state.auth_token:
        return False
    
    # Проверяем валидность сессии в БД
    user_data = auth_manager.validate_session(st.session_state.auth_token)
    
    if user_data:
        # Обновляем данные пользователя
        st.session_state.user_data = user_data
        return True
    else:
        # Сессия истекла или недействительна
        logout_user(auth_manager)
        return False

def get_current_user() -> Optional[Dict[str, Any]]:
    """Получение данных текущего пользователя"""
    return st.session_state.user_data if st.session_state.is_authenticated else None
