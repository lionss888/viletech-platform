package domain

type Account struct {
	ID             string
	Email          string
	PasswordHash   string
	Role           Role
	OrganizationID string
	FullName       string
	Phone          string
	Passport       string
	Blocked        bool
}
