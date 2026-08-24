# 🔐 Техническое задание: Коннектор авторизации для AMG-Banking-Gateway

## 📋 Обзор

**Цель**: Создать универсальный коннектор авторизации для AMG-Banking-Gateway, который будет обеспечивать аутентификацию и авторизацию пользователей с поддержкой различных провайдеров по образцу Google/Yandex.

## 🎯 Основные требования

### 1. **Архитектурные принципы**
- **Модульность**: Независимый модуль авторизации
- **Универсальность**: Поддержка различных провайдеров
- **Безопасность**: Соответствие стандартам OAuth 2.0/OpenID Connect
- **Масштабируемость**: Готовность к росту нагрузки
- **Интеграция**: Легкая интеграция с существующими AMG модулями

### 2. **Поддерживаемые провайдеры**
- **Социальные сети**: Google, Яндекс, Apple, Facebook
- **Корпоративные**: Active Directory, LDAP, SAML
- **Мобильные**: Apple Sign-In, Google Sign-In
- **Банковские**: eIDAS, BankID (для будущего расширения)

## 🏗️ Техническая архитектура

### **Структура модуля**
```
backend/internal/auth/
├── connector.go              # Основной коннектор
├── providers/                # Провайдеры авторизации
│   ├── google.go            # Google OAuth 2.0
│   ├── yandex.go            # Яндекс OAuth 2.0
│   ├── apple.go             # Apple Sign-In
│   ├── facebook.go          # Facebook Login
│   └── custom.go            # Кастомный провайдер
├── oauth2/                  # OAuth 2.0 реализация
│   ├── client.go            # OAuth клиент
│   ├── server.go            # OAuth сервер
│   └── token.go             # Token management
├── jwt/                     # JWT обработка
│   ├── generator.go         # Генерация токенов
│   ├── validator.go         # Валидация токенов
│   └── refresh.go           # Refresh токены
├── mfa/                     # Multi-Factor Authentication
│   ├── totp.go              # TOTP (Google Authenticator)
│   ├── sms.go               # SMS коды
│   └── email.go             # Email коды
├── session/                 # Управление сессиями
│   ├── manager.go           # Менеджер сессий
│   ├── storage.go           # Хранение сессий
│   └── sso.go               # Single Sign-On
└── middleware/              # Middleware для Gin
    ├── auth.go              # Аутентификация
    ├── authorization.go     # Авторизация
    └── rate_limit.go        # Rate limiting
```

## 🔧 Функциональные требования

### **1. OAuth 2.0 / OpenID Connect**

#### **Поддерживаемые flow:**
- **Authorization Code Flow** (основной)
- **Implicit Flow** (для SPA)
- **Client Credentials Flow** (для сервисов)
- **Refresh Token Flow** (обновление токенов)

#### **Endpoints:**
```bash
# OAuth 2.0 Endpoints
GET  /oauth2/authorize       # Авторизация
POST /oauth2/token           # Получение токена
POST /oauth2/revoke          # Отзыв токена
GET  /oauth2/userinfo        # Информация о пользователе

# OpenID Connect Endpoints
GET  /.well-known/openid_configuration  # Конфигурация
GET  /oauth2/userinfo                   # UserInfo endpoint
```

### **2. JWT Token Management**

#### **Типы токенов:**
- **Access Token** (15 минут)
- **Refresh Token** (30 дней)
- **ID Token** (OpenID Connect)
- **API Token** (для сервисов)

#### **Формат JWT:**
```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "amg-gateway-2024"
  },
  "payload": {
    "iss": "https://gateway.amg.com",
    "sub": "user_123",
    "aud": ["amg-core", "amg-banking"],
    "exp": 1640995200,
    "iat": 1640908800,
    "roles": ["customer", "verified"],
    "permissions": ["read:accounts", "write:transactions"],
    "provider": "google",
    "mfa_verified": true
  }
}
```

### **3. Multi-Factor Authentication (MFA)**

#### **Поддерживаемые методы:**
- **TOTP** (Google Authenticator, Authy)
- **SMS коды** (через Twilio/AWS SNS)
- **Email коды** (через SendGrid/AWS SES)
- **Push уведомления** (для мобильных приложений)
- **Hardware tokens** (YubiKey, будущее расширение)

#### **MFA Flow:**
```bash
# 1. Первичная аутентификация
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123",
  "provider": "google"
}

# 2. Ответ с требованием MFA
{
  "success": false,
  "requires_mfa": true,
  "mfa_methods": ["totp", "sms"],
  "session_id": "sess_123"
}

# 3. Подтверждение MFA
POST /auth/mfa/verify
{
  "session_id": "sess_123",
  "method": "totp",
  "code": "123456"
}
```

### **4. Social Providers**

#### **Google OAuth 2.0:**
```go
type GoogleProvider struct {
    ClientID     string
    ClientSecret string
    RedirectURI  string
    Scopes       []string // ["openid", "profile", "email"]
}

// Scopes по умолчанию
DefaultScopes = []string{
    "openid",
    "profile", 
    "email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email"
}
```

#### **Яндекс OAuth 2.0:**
```go
type YandexProvider struct {
    ClientID     string
    ClientSecret string
    RedirectURI  string
    Scopes       []string // ["login:email", "login:info"]
}

// Scopes по умолчанию
DefaultScopes = []string{
    "login:email",
    "login:info",
    "login:birthday",
    "login:avatar"
}
```

#### **Apple Sign-In:**
```go
type AppleProvider struct {
    ClientID     string
    TeamID       string
    KeyID        string
    PrivateKey   string
    RedirectURI  string
}
```

### **5. Session Management**

#### **Типы сессий:**
- **Web Session** (для браузера)
- **API Session** (для мобильных приложений)
- **Service Session** (для сервисов)

#### **Session Storage:**
- **Redis** (основное хранилище)
- **PostgreSQL** (постоянное хранение)
- **Memory** (для тестирования)

#### **Session Configuration:**
```go
type SessionConfig struct {
    Duration       time.Duration // 30 дней
    RefreshThreshold time.Duration // 7 дней
    MaxConcurrent  int           // 5 сессий на пользователя
    Secure         bool          // HTTPS only
    HttpOnly       bool          // JavaScript доступ
    SameSite       string        // "Lax" или "Strict"
}
```

### **6. Single Sign-On (SSO)**

#### **Поддерживаемые протоколы:**
- **OAuth 2.0** (основной)
- **OpenID Connect** (расширение OAuth 2.0)
- **SAML 2.0** (для корпоративных клиентов)

#### **SSO Flow:**
```bash
# 1. Инициация SSO
GET /sso/initiate?provider=google&return_url=/dashboard

# 2. Перенаправление на провайдера
# 3. Callback от провайдера
GET /sso/callback?code=xxx&state=yyy

# 4. Создание сессии и токенов
# 5. Перенаправление на return_url
```

## 🔒 Безопасность

### **1. Криптография**
- **Алгоритмы**: RS256 (JWT), AES-256 (шифрование)
- **Хеширование**: bcrypt для паролей, SHA-256 для данных
- **Ключи**: RSA 2048-bit для JWT, автоматическая ротация

### **2. Rate Limiting**
```go
type RateLimitConfig struct {
    LoginAttempts    int           // 5 попыток в минуту
    TokenRequests    int           // 100 запросов в минуту
    PasswordReset    int           // 3 попытки в час
    MFAAttempts      int           // 3 попытки в 5 минут
}
```

### **3. Audit Logging**
```go
type AuditEvent struct {
    Timestamp    time.Time `json:"timestamp"`
    UserID       string    `json:"user_id"`
    Action       string    `json:"action"`       // "login", "logout", "token_refresh"
    Provider     string    `json:"provider"`     // "google", "yandex"
    IPAddress    string    `json:"ip_address"`
    UserAgent    string    `json:"user_agent"`
    Success      bool      `json:"success"`
    ErrorCode    string    `json:"error_code,omitempty"`
    Metadata     map[string]interface{} `json:"metadata,omitempty"`
}
```

## 📊 API Endpoints

### **Authentication Endpoints**
```bash
# Основная аутентификация
POST /auth/login              # Вход с email/password
POST /auth/logout             # Выход
POST /auth/refresh            # Обновление токена
POST /auth/revoke             # Отзыв токена

# Регистрация
POST /auth/register           # Регистрация нового пользователя
POST /auth/verify-email       # Подтверждение email
POST /auth/resend-verification # Повторная отправка подтверждения

# Восстановление пароля
POST /auth/forgot-password    # Запрос сброса пароля
POST /auth/reset-password     # Сброс пароля

# OAuth 2.0
GET  /oauth2/authorize        # Авторизация
POST /oauth2/token            # Получение токена
GET  /oauth2/userinfo         # Информация о пользователе

# MFA
POST /auth/mfa/enable         # Включение MFA
POST /auth/mfa/disable        # Отключение MFA
POST /auth/mfa/verify         # Подтверждение MFA
POST /auth/mfa/resend         # Повторная отправка кода

# SSO
GET  /sso/providers           # Список доступных провайдеров
GET  /sso/initiate            # Инициация SSO
GET  /sso/callback            # Callback от провайдера
```

### **Authorization Endpoints**
```bash
# Проверка прав доступа
GET  /auth/me                 # Информация о текущем пользователе
GET  /auth/permissions        # Список разрешений
GET  /auth/roles              # Список ролей
POST /auth/check-permission   # Проверка конкретного разрешения

# Управление сессиями
GET  /auth/sessions           # Список активных сессий
DELETE /auth/sessions/:id     # Завершение конкретной сессии
DELETE /auth/sessions/all     # Завершение всех сессий
```

## 🔧 Конфигурация

### **Environment Variables**
```bash
# Основные настройки
AUTH_SECRET_KEY=your-secret-key-here
AUTH_JWT_ISSUER=https://gateway.amg.com
AUTH_JWT_AUDIENCE=amg-core,amg-banking
AUTH_SESSION_DURATION=720h
AUTH_REFRESH_DURATION=2160h

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://gateway.amg.com/oauth2/google/callback

# Яндекс OAuth
YANDEX_CLIENT_ID=your-yandex-client-id
YANDEX_CLIENT_SECRET=your-yandex-client-secret
YANDEX_REDIRECT_URI=https://gateway.amg.com/oauth2/yandex/callback

# Apple Sign-In
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY=your-apple-private-key

# SMS провайдер
SMS_PROVIDER=twilio  # или aws
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Email провайдер
EMAIL_PROVIDER=sendgrid  # или aws
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@amg.com

# Rate Limiting
RATE_LIMIT_LOGIN=5
RATE_LIMIT_TOKEN=100
RATE_LIMIT_MFA=3

# Security
CORS_ORIGINS=https://app.amg.com,https://admin.amg.com
SECURE_COOKIES=true
SAME_SITE_COOKIES=Lax
```

### **Конфигурационный файл**
```yaml
# config/auth.yaml
auth:
  jwt:
    issuer: "https://gateway.amg.com"
    audience: ["amg-core", "amg-banking"]
    access_token_duration: "15m"
    refresh_token_duration: "30d"
    algorithm: "RS256"
  
  session:
    duration: "720h"
    refresh_threshold: "168h"
    max_concurrent: 5
    secure: true
    http_only: true
    same_site: "Lax"
  
  providers:
    google:
      enabled: true
      client_id: "${GOOGLE_CLIENT_ID}"
      client_secret: "${GOOGLE_CLIENT_SECRET}"
      scopes: ["openid", "profile", "email"]
    
    yandex:
      enabled: true
      client_id: "${YANDEX_CLIENT_ID}"
      client_secret: "${YANDEX_CLIENT_SECRET}"
      scopes: ["login:email", "login:info"]
    
    apple:
      enabled: false
      client_id: "${APPLE_CLIENT_ID}"
      team_id: "${APPLE_TEAM_ID}"
      key_id: "${APPLE_KEY_ID}"
  
  mfa:
    totp:
      enabled: true
      issuer: "AMG Banking"
    
    sms:
      enabled: true
      provider: "twilio"
      code_length: 6
      expiration: "5m"
    
    email:
      enabled: true
      provider: "sendgrid"
      code_length: 6
      expiration: "10m"
  
  rate_limiting:
    login_attempts: 5
    token_requests: 100
    password_reset: 3
    mfa_attempts: 3
    window: "1m"
```

## 🧪 Тестирование

### **Unit Tests**
- Тестирование всех провайдеров
- Валидация JWT токенов
- MFA логика
- Rate limiting

### **Integration Tests**
- OAuth 2.0 flow
- SSO с реальными провайдерами
- Session management
- Database операции

### **E2E Tests**
- Полный flow регистрации/входа
- MFA процесс
- Logout и отзыв токенов
- Cross-service аутентификация

## 📈 Мониторинг и метрики

### **Prometheus метрики**
```go
// Метрики аутентификации
auth_requests_total{provider, status}
auth_duration_seconds{provider, action}
auth_mfa_attempts_total{method, status}
auth_token_refreshes_total{status}

// Метрики безопасности
auth_failed_attempts_total{reason}
auth_rate_limit_hits_total{endpoint}
auth_session_duration_seconds{type}
```

### **Grafana дашборды**
- **Authentication Overview** - общая статистика
- **Provider Performance** - производительность провайдеров
- **Security Metrics** - метрики безопасности
- **User Activity** - активность пользователей

## 🚀 План реализации

### **Phase 1: Базовая аутентификация**
- [ ] JWT token management
- [ ] Базовые OAuth 2.0 endpoints
- [ ] Google провайдер
- [ ] Session management
- [ ] Rate limiting

### **Phase 2: Социальные провайдеры**
- [ ] Яндекс OAuth 2.0
- [ ] Apple Sign-In
- [ ] Facebook Login
- [ ] SSO integration

### **Phase 3: MFA и безопасность**
- [ ] TOTP поддержка
- [ ] SMS коды
- [ ] Email коды
- [ ] Audit logging
- [ ] Security middleware

### **Phase 4: Интеграция и оптимизация**
- [ ] Интеграция с AMG модулями
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation

## 📚 Дополнительные ресурсы

### **Стандарты и спецификации**
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [JWT RFC 7519](https://tools.ietf.org/html/rfc7519)
- [SAML 2.0 Core](https://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf)

### **Библиотеки Go**
- [golang.org/x/oauth2](https://pkg.go.dev/golang.org/x/oauth2)
- [github.com/golang-jwt/jwt](https://github.com/golang-jwt/jwt)
- [github.com/pquerna/otp](https://github.com/pquerna/otp)
- [github.com/gin-gonic/gin](https://github.com/gin-gonic/gin)

---

**Статус**: 📝 Готово к реализации  
**Приоритет**: 🔥 Высокий  
**Команда**: Backend разработчик + DevOps
