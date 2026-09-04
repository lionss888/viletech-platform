package authn

import (
	"errors"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/viletech/vdp/release-gate/internal/domain"
)

type Service struct {
	secret     []byte
	localUsers map[string]localUser
	githubMap  map[string]domain.Role
	gitlabMap  map[string]domain.Role
}

type localUser struct {
	Password string
	Role     domain.Role
}

func New(secret string) *Service {
	if secret == "" {
		secret = "release-gate-dev-secret"
	}
	svc := &Service{
		secret:     []byte(secret),
		localUsers: parseUsers(os.Getenv("RELEASE_GATE_LOCAL_USERS")),
		githubMap:  parseRoleMap(os.Getenv("RELEASE_GATE_GITHUB_ROLE_MAP")),
		gitlabMap:  parseRoleMap(os.Getenv("RELEASE_GATE_GITLAB_ROLE_MAP")),
	}
	if len(svc.localUsers) == 0 {
		svc.localUsers["admin@vdp.local"] = localUser{Password: "admin", Role: domain.RolePolicyAdmin}
		svc.localUsers["viewer@vdp.local"] = localUser{Password: "viewer", Role: domain.RoleViewer}
		svc.localUsers["alpha@vdp.local"] = localUser{Password: "alpha", Role: domain.RoleDeployerAlphaPreview}
		svc.localUsers["gamma@vdp.local"] = localUser{Password: "gamma", Role: domain.RoleDeployerGamma}
	}
	return svc
}

func (s *Service) LoginLocal(email, password string) (string, domain.Identity, error) {
	user, ok := s.localUsers[strings.ToLower(email)]
	if !ok || user.Password != password {
		return "", domain.Identity{}, errors.New("invalid credentials")
	}
	id := domain.Identity{Subject: email, Role: user.Role, Issuer: "local"}
	token, err := s.sign(id)
	return token, id, err
}

func (s *Service) IdentityFromOAuth(issuer, login string) (string, domain.Identity, error) {
	var role domain.Role
	switch issuer {
	case "github":
		role = s.githubMap[login]
	case "gitlab":
		role = s.gitlabMap[login]
	}
	if role == "" {
		role = domain.RoleViewer
	}
	id := domain.Identity{Subject: login, Role: role, Issuer: issuer}
	token, err := s.sign(id)
	return token, id, err
}

func (s *Service) Parse(token string) (domain.Identity, error) {
	parsed, err := jwt.Parse(token, func(t *jwt.Token) (any, error) {
		return s.secret, nil
	})
	if err != nil || !parsed.Valid {
		return domain.Identity{}, errors.New("invalid token")
	}
	claims, ok := parsed.Claims.(jwt.MapClaims)
	if !ok {
		return domain.Identity{}, errors.New("invalid claims")
	}
	sub, _ := claims["sub"].(string)
	role, _ := claims["role"].(string)
	iss, _ := claims["iss"].(string)
	return domain.Identity{Subject: sub, Role: domain.Role(role), Issuer: iss}, nil
}

func (s *Service) sign(id domain.Identity) (string, error) {
	claims := jwt.MapClaims{
		"sub":  id.Subject,
		"role": string(id.Role),
		"iss":  id.Issuer,
		"exp":  time.Now().Add(12 * time.Hour).Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.secret)
}

func parseUsers(raw string) map[string]localUser {
	out := map[string]localUser{}
	for _, part := range splitComma(raw) {
		bits := strings.Split(part, ":")
		if len(bits) != 3 {
			continue
		}
		out[strings.ToLower(bits[0])] = localUser{Password: bits[1], Role: domain.Role(bits[2])}
	}
	return out
}

func parseRoleMap(raw string) map[string]domain.Role {
	out := map[string]domain.Role{}
	for _, part := range splitComma(raw) {
		bits := strings.Split(part, ":")
		if len(bits) != 2 {
			continue
		}
		out[bits[0]] = domain.Role(bits[1])
	}
	return out
}

func splitComma(raw string) []string {
	if raw == "" {
		return nil
	}
	return strings.Split(raw, ",")
}
