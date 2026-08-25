package repository

import (
	"context"

	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
)

// Store is the persistence boundary for core domain aggregates.
type Store interface {
	SaveAccount(ctx context.Context, account domain.Account) error
	AccountByID(ctx context.Context, id string) (domain.Account, error)
	AccountByEmail(ctx context.Context, email string) (domain.Account, error)
	AccountByRefreshToken(ctx context.Context, token string) (domain.Account, error)
	ListAccounts(ctx context.Context) ([]domain.Account, error)

	SaveVerificationCode(ctx context.Context, code domain.VerificationCode) error
	VerificationCodeByEmailKind(ctx context.Context, email string, kind domain.VerificationCodeKind) (domain.VerificationCode, error)
	DeleteVerificationCode(ctx context.Context, id string) error

	SaveOrganization(ctx context.Context, org domain.Organization) error
	OrganizationByID(ctx context.Context, id string) (domain.Organization, error)
	ListOrganizations(ctx context.Context) ([]domain.Organization, error)
	ListAwaiting(ctx context.Context) []domain.Organization
	DeleteOrganization(ctx context.Context, id string) error

	SaveForm(ctx context.Context, form formpayment.Form) error
	FormByID(ctx context.Context, id string) (formpayment.Form, error)
	ListForms(ctx context.Context) []formpayment.Form

	AppendHistory(ctx context.Context, entry formpayment.ComplianceHistoryEntry) error
	HistoryByForm(ctx context.Context, formID string) []formpayment.ComplianceHistoryEntry

	SaveDocument(ctx context.Context, doc formpayment.Document) error
	DocumentsByForm(ctx context.Context, formID string) []formpayment.Document

	SaveContract(ctx context.Context, c domain.Contract) error
	ContractByID(ctx context.Context, id string) (domain.Contract, error)
	ListContracts(ctx context.Context) ([]domain.Contract, error)
	ListContractsByOrg(ctx context.Context, orgID string) ([]domain.Contract, error)
	ListContractTemplatesByAgent(ctx context.Context, agentID string) ([]domain.Contract, error)

	SaveCounterparty(ctx context.Context, c domain.Counterparty) error
	CounterpartyByID(ctx context.Context, id string) (domain.Counterparty, error)
	ListCounterparties(ctx context.Context) ([]domain.Counterparty, error)
	DeleteCounterparty(ctx context.Context, id string) error

	SaveComment(ctx context.Context, c domain.Comment) error
	CommentByID(ctx context.Context, id string) (domain.Comment, error)
	ListComments(ctx context.Context, entityType, entityID string) ([]domain.Comment, error)
	ListAllComments(ctx context.Context) ([]domain.Comment, error)
	DeleteComment(ctx context.Context, id string) error

	SaveFile(ctx context.Context, f domain.FileMeta) error
	FileByID(ctx context.Context, id string) (domain.FileMeta, error)
	ListFiles(ctx context.Context) ([]domain.FileMeta, error)

	ListAllHistory(ctx context.Context) []formpayment.ComplianceHistoryEntry

	SaveAgent(ctx context.Context, a domain.Agent) error
	AgentByID(ctx context.Context, id string) (domain.Agent, error)
	ListAgents(ctx context.Context) ([]domain.Agent, error)

	SaveHsCode(ctx context.Context, h domain.HsCode) error
	ListHsCodes(ctx context.Context) ([]domain.HsCode, error)

	SaveCurrency(ctx context.Context, c domain.Currency) error
	ListCurrencies(ctx context.Context) ([]domain.Currency, error)

	SaveConfiguration(ctx context.Context, key, value string) error
	Configuration(ctx context.Context, key string) (string, error)

	SaveLiquidityOffer(ctx context.Context, o domain.LiquidityOffer) error
	ListLiquidity(ctx context.Context, direction string) ([]domain.LiquidityOffer, error)

	SaveVirtualAccount(ctx context.Context, a domain.VirtualAccount) error
	VirtualAccountByID(ctx context.Context, id string) (domain.VirtualAccount, error)
	VirtualAccountsByAccount(ctx context.Context, accountID string) ([]domain.VirtualAccount, error)

	SaveTreasurerTask(ctx context.Context, t domain.TreasurerTask) error
	ListTreasurerTasks(ctx context.Context) ([]domain.TreasurerTask, error)
	TreasurerTaskByID(ctx context.Context, id string) (domain.TreasurerTask, error)

	SaveUnblockRequest(ctx context.Context, r domain.UnblockRequest) error
	ListUnblockRequests(ctx context.Context) ([]domain.UnblockRequest, error)

	SaveTemplate(ctx context.Context, t domain.Template) error
	TemplateByID(ctx context.Context, id string) (domain.Template, error)
	ListTemplates(ctx context.Context) ([]domain.Template, error)
	DeleteTemplate(ctx context.Context, id string) error

	SaveOrder(ctx context.Context, o formpayment.Order) error
	OrderByID(ctx context.Context, id string) (formpayment.Order, error)
	ListOrdersByForm(ctx context.Context, formID string) ([]formpayment.Order, error)

	SaveBankIdempotency(ctx context.Context, scope, key, formID string) error
	FormIDByBankIdempotency(ctx context.Context, scope, key string) (string, error)
}
