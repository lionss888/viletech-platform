package service

import (
	"context"
	"crypto/rand"
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
	newID      func() string
}

type AuthSession struct {
	Token        string         `json:"token"`
	RefreshToken string         `json:"refresh_token"`
	AccountID    string         `json:"account_id"`
	Role         domain.Role    `json:"role"`
	Account      map[string]any `json:"account,omitempty"`
}

func NewAuthService(store repository.Store, jwtSecret string, hours int) *AuthService {
	if hours <= 0 {
		hours = 24
	}
	return &AuthService{
		store:      store,
		jwtSecret:  []byte(jwtSecret),
		expiresFor: time.Duration(hours) * time.Hour,
		newID: func() string {
			buf := make([]byte, 16)
			_, _ = rand.Read(buf)
			return hex.EncodeToString(buf)
		},
	}
}

func HashPassword(password string) string {
	sum := sha256.Sum256([]byte("vdp:" + password))
	return hex.EncodeToString(sum[:])
}

func (s *AuthService) Login(ctx context.Context, email, password string) (AuthSession, error) {
	account, err := s.store.AccountByEmail(ctx, email)
	if err != nil {
		return AuthSession{}, apperrors.ErrUnauthorized
	}
	if account.Blocked || !account.Active || HashPassword(password) != account.PasswordHash {
		return AuthSession{}, apperrors.ErrUnauthorized
	}
	return s.issueSession(ctx, account)
}

func (s *AuthService) Register(ctx context.Context, email, password, fullName string) (string, error) {
	if email == "" || password == "" {
		return "", apperrors.New(apperrors.ErrCodeValidation, "email and password required")
	}
	if _, err := s.store.AccountByEmail(ctx, email); err == nil {
		return "", apperrors.New(apperrors.ErrCodeConflict, "email already registered")
	}
	account := domain.Account{
		ID:           s.newID(),
		Email:        email,
		PasswordHash: HashPassword(password),
		Role:         domain.RoleUser,
		FullName:     fullName,
		Active:       false,
	}
	if err := s.store.SaveAccount(ctx, account); err != nil {
		return "", err
	}
	return s.issueCode(ctx, account, domain.CodeRegistration)
}

func (s *AuthService) ResendRegistration(ctx context.Context, email string) (string, error) {
	account, err := s.store.AccountByEmail(ctx, email)
	if err != nil {
		return "", apperrors.ErrResourceNotFound
	}
	if account.Active {
		return "", apperrors.New(apperrors.ErrCodeConflict, "account already active")
	}
	return s.issueCode(ctx, account, domain.CodeRegistration)
}

func (s *AuthService) ConfirmRegistration(ctx context.Context, email, code string) (AuthSession, error) {
	account, err := s.store.AccountByEmail(ctx, email)
	if err != nil {
		return AuthSession{}, apperrors.ErrUnauthorized
	}
	if err := s.verifyCode(ctx, email, code, domain.CodeRegistration); err != nil {
		return AuthSession{}, err
	}
	account.Active = true
	return s.issueSession(ctx, account)
}

func (s *AuthService) Restore(ctx context.Context, email string) (string, error) {
	account, err := s.store.AccountByEmail(ctx, email)
	if err != nil {
		return "", nil
	}
	return s.issueCode(ctx, account, domain.CodeRestore)
}

func (s *AuthService) ConfirmRestore(ctx context.Context, email, code, newPassword string) (AuthSession, error) {
	account, err := s.store.AccountByEmail(ctx, email)
	if err != nil {
		return AuthSession{}, apperrors.ErrUnauthorized
	}
	if err := s.verifyCode(ctx, email, code, domain.CodeRestore); err != nil {
		return AuthSession{}, err
	}
	account.PasswordHash = HashPassword(newPassword)
	account.Active = true
	return s.issueSession(ctx, account)
}

func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (AuthSession, error) {
	account, err := s.store.AccountByRefreshToken(ctx, refreshToken)
	if err != nil {
		return AuthSession{}, apperrors.ErrUnauthorized
	}
	if account.Blocked || !account.Active {
		return AuthSession{}, apperrors.ErrUnauthorized
	}
	return s.issueSession(ctx, account)
}

func (s *AuthService) Logout(ctx context.Context, principal authz.Principal) error {
	account, err := s.store.AccountByID(ctx, principal.AccountID)
	if err != nil {
		return err
	}
	account.RefreshToken = ""
	return s.store.SaveAccount(ctx, account)
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

func (s *AuthService) issueSession(ctx context.Context, account domain.Account) (AuthSession, error) {
	refresh := s.newID() + s.newID()
	account.RefreshToken = refresh
	if err := s.store.SaveAccount(ctx, account); err != nil {
		return AuthSession{}, err
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":             account.ID,
		"role":            string(account.Role),
		"organization_id": account.OrganizationID,
		"exp":             time.Now().Add(s.expiresFor).Unix(),
		"iat":             time.Now().Unix(),
	})
	signed, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return AuthSession{}, fmt.Errorf("sign token: %w", err)
	}
	return AuthSession{
		Token:        signed,
		RefreshToken: refresh,
		AccountID:    account.ID,
		Role:         account.Role,
		Account:      account.Public(),
	}, nil
}

func (s *AuthService) issueCode(ctx context.Context, account domain.Account, kind domain.VerificationCodeKind) (string, error) {
	code := fmt.Sprintf("%06d", time.Now().UnixNano()%1000000)
	vc := domain.VerificationCode{
		ID:        s.newID(),
		AccountID: account.ID,
		Email:     account.Email,
		Code:      code,
		Kind:      kind,
		ExpiresAt: time.Now().Add(30 * time.Minute).Unix(),
	}
	if err := s.store.SaveVerificationCode(ctx, vc); err != nil {
		return "", err
	}
	return code, nil
}

func (s *AuthService) verifyCode(ctx context.Context, email, code string, kind domain.VerificationCodeKind) error {
	vc, err := s.store.VerificationCodeByEmailKind(ctx, email, kind)
	if err != nil {
		return apperrors.New(apperrors.ErrCodeValidation, "invalid code")
	}
	if vc.Code != code || time.Now().Unix() > vc.ExpiresAt {
		return apperrors.New(apperrors.ErrCodeValidation, "invalid or expired code")
	}
	_ = s.store.DeleteVerificationCode(ctx, vc.ID)
	return nil
}
