// Package errors defines AppError and stable API error codes for VDP core.
//
// Codes map to HTTP status via statusFor; handlers should return AppError rather
// than raw strings so cabinets and Hub consumers see a consistent contract.
package errors
