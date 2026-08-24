package errors

import (
	"fmt"
	"net/http"
)

// ErrorCode представляет код ошибки
type ErrorCode string

const (
	// Общие ошибки
	ErrCodeInternal     ErrorCode = "INTERNAL_ERROR"
	ErrCodeValidation   ErrorCode = "VALIDATION_ERROR"
	ErrCodeNotFound     ErrorCode = "NOT_FOUND"
	ErrCodeUnauthorized ErrorCode = "UNAUTHORIZED"
	ErrCodeForbidden    ErrorCode = "FORBIDDEN"
	ErrCodeConflict     ErrorCode = "CONFLICT"

	// Ошибки базы данных
	ErrCodeDatabase     ErrorCode = "DATABASE_ERROR"
	ErrCodeDBConnection ErrorCode = "DB_CONNECTION_ERROR"

	// Ошибки внешних сервисов
	ErrCodeExternalService ErrorCode = "EXTERNAL_SERVICE_ERROR"
	ErrCodePythonService   ErrorCode = "PYTHON_SERVICE_ERROR"
	ErrCodeOllamaService   ErrorCode = "OLLAMA_SERVICE_ERROR"
)

// AppError представляет ошибку приложения
type AppError struct {
	Code       ErrorCode `json:"code"`
	Message    string    `json:"message"`
	Details    string    `json:"details,omitempty"`
	StatusCode int       `json:"-"`
	Err        error     `json:"-"`
}

// Error реализует интерфейс error
func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %s (%v)", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// New создает новую ошибку приложения
func New(code ErrorCode, message string) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		StatusCode: getStatusCode(code),
	}
}

// NewWithDetails создает новую ошибку с деталями
func NewWithDetails(code ErrorCode, message, details string) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		Details:    details,
		StatusCode: getStatusCode(code),
	}
}

// Wrap оборачивает существующую ошибку
func Wrap(err error, code ErrorCode, message string) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		Err:        err,
		StatusCode: getStatusCode(code),
	}
}

// WrapWithDetails оборачивает существующую ошибку с деталями
func WrapWithDetails(err error, code ErrorCode, message, details string) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		Details:    details,
		Err:        err,
		StatusCode: getStatusCode(code),
	}
}

// getStatusCode возвращает HTTP статус код для кода ошибки
func getStatusCode(code ErrorCode) int {
	switch code {
	case ErrCodeValidation:
		return http.StatusBadRequest
	case ErrCodeNotFound:
		return http.StatusNotFound
	case ErrCodeUnauthorized:
		return http.StatusUnauthorized
	case ErrCodeForbidden:
		return http.StatusForbidden
	case ErrCodeConflict:
		return http.StatusConflict
	case ErrCodeDatabase, ErrCodeDBConnection:
		return http.StatusInternalServerError
	case ErrCodeExternalService, ErrCodePythonService, ErrCodeOllamaService:
		return http.StatusBadGateway
	default:
		return http.StatusInternalServerError
	}
}

// Предопределенные ошибки
var (
	ErrInternalServer     = New(ErrCodeInternal, "Internal server error")
	ErrInvalidInput       = New(ErrCodeValidation, "Invalid input")
	ErrResourceNotFound   = New(ErrCodeNotFound, "Resource not found")
	ErrUnauthorized       = New(ErrCodeUnauthorized, "Unauthorized")
	ErrForbidden          = New(ErrCodeForbidden, "Forbidden")
	ErrResourceConflict   = New(ErrCodeConflict, "Resource conflict")
	ErrDatabaseError      = New(ErrCodeDatabase, "Database error")
	ErrDBConnection       = New(ErrCodeDBConnection, "Database connection error")
	ErrExternalService    = New(ErrCodeExternalService, "External service error")
	ErrPythonService      = New(ErrCodePythonService, "Python analytics service error")
	ErrOllamaService      = New(ErrCodeOllamaService, "Ollama service error")
)
