package errors

import (
	"fmt"
	"net/http"
)

type ErrorCode string

const (
	ErrCodeInternal     ErrorCode = "INTERNAL_ERROR"
	ErrCodeValidation   ErrorCode = "VALIDATION_ERROR"
	ErrCodeNotFound     ErrorCode = "NOT_FOUND"
	ErrCodeUnauthorized ErrorCode = "UNAUTHORIZED"
	ErrCodeForbidden    ErrorCode = "FORBIDDEN"
	ErrCodeConflict     ErrorCode = "CONFLICT"
	ErrCodeDatabase     ErrorCode = "DATABASE_ERROR"
	ErrCodeExternal     ErrorCode = "EXTERNAL_SERVICE_ERROR"
)

type AppError struct {
	Code       ErrorCode `json:"code"`
	Message    string    `json:"message"`
	Details    string    `json:"details,omitempty"`
	StatusCode int       `json:"-"`
	Err        error     `json:"-"`
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %s (%v)", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *AppError) Unwrap() error {
	return e.Err
}

func New(code ErrorCode, message string) *AppError {
	return &AppError{Code: code, Message: message, StatusCode: statusFor(code)}
}

func Wrap(err error, code ErrorCode, message string) *AppError {
	return &AppError{Code: code, Message: message, Err: err, StatusCode: statusFor(code)}
}

func statusFor(code ErrorCode) int {
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
	case ErrCodeExternal:
		return http.StatusBadGateway
	default:
		return http.StatusInternalServerError
	}
}

var (
	ErrInvalidInput     = New(ErrCodeValidation, "Invalid input")
	ErrResourceNotFound = New(ErrCodeNotFound, "Resource not found")
	ErrUnauthorized     = New(ErrCodeUnauthorized, "Unauthorized")
	ErrForbidden        = New(ErrCodeForbidden, "Forbidden")
	ErrConflict         = New(ErrCodeConflict, "Resource conflict")
)
