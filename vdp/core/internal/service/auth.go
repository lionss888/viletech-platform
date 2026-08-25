package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/repository"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

type AuthService struct {
	store      repository.Store
	jwtSecret  []byte
	expiresFor time.Duration
}

func NewAuthService(store repository.Store, jwtSecret string, hours int) *AuthService {
	if hours <= 0 {
		hours = 24
	}
	return &AuthService{
		store:      store,
		jwtSecret:  []byte(jwtSecret),
		expiresFor: time.Duration(hours) * time.Hour,
	}
}

func HashPassword(password string) string {
	sum := sha256.Sum256([]byte("vdp:" + password))
	return hex.EncodeToString(sum[:])
}

func (s *AuthService) Login(ctx context.Context, email, password string) (string, authz.Principal, error) {
	account, err := s.store.AccountByEmail(ctx, email)
	if err != nil {
		return "", authz.Principal{}, apperrors.ErrUnauthorized
	}
	if account.Blocked || HashPassword(password) != account.PasswordHash {
		return "", authz.Principal{}, apperrors.ErrUnauthorized
	}
	principal := authz.Principal{
		AccountID:      account.ID,
		Role:           account.Role,
		OrganizationID: account.OrganizationID,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":              account.ID,
		"role":             string(account.Role),
		"organization_id":  account.OrganizationID,
		"exp":              time.Now().Add(s.expiresFor).Unix(),
		"iat":              time.Now().Unix(),
	})
	signed, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", authz.Principal{}, fmt.Errorf("sign token: %w", err)
	}
	return signed, principal, nil
}

func (s *AuthService) Parse(tokenString string) (authz.Principal, error) {
	parsed, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, apperrors.ErrUnauthorized
		}
		return s.jwtSecret, nil
	})
	if err != nil || !parsed.Valid {
		return authz.Principal{}, apperrors.ErrUnauthorized
	}
	claims, ok := parsed.Claims.(jwt.MapClaims)
	if !ok {
		return authz.Principal{}, apperrors.ErrUnauthorized
	}
	sub, _ := claims["sub"].(string)
	roleRaw, _ := claims["role"].(string)
	orgID, _ := claims["organization_id"].(string)
	role, ok := domain.ParseRole(roleRaw)
	if !ok || sub == "" {
		return authz.Principal{}, apperrors.ErrUnauthorized
	}
	return authz.Principal{AccountID: sub, Role: role, OrganizationID: orgID}, nil
}
