package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/repository"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

// Store is a Postgres-backed repository.Store.
// Complex aggregates use JSON columns where helpful; mirrors migrations 001+002.
type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

var _ repository.Store = (*Store)(nil)

func (s *Store) SaveAccount(ctx context.Context, a domain.Account) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO accounts (id, email, password_hash, role, organization_id, blocked, full_name, phone, passport)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, password_hash=EXCLUDED.password_hash,
			role=EXCLUDED.role, organization_id=EXCLUDED.organization_id, blocked=EXCLUDED.blocked,
			full_name=EXCLUDED.full_name, phone=EXCLUDED.phone, passport=EXCLUDED.passport`,
		a.ID, a.Email, a.PasswordHash, string(a.Role), nullStr(a.OrganizationID), a.Blocked, a.FullName, a.Phone, a.Passport)
	return err
}

func (s *Store) AccountByID(ctx context.Context, id string) (domain.Account, error) {
	var a domain.Account
	var role string
	var org sql.NullString
	err := s.db.QueryRowContext(ctx, `
		SELECT id, email, password_hash, role, organization_id, blocked, COALESCE(full_name,''), COALESCE(phone,''), COALESCE(passport,'')
		FROM accounts WHERE id=$1`, id).Scan(&a.ID, &a.Email, &a.PasswordHash, &role, &org, &a.Blocked, &a.FullName, &a.Phone, &a.Passport)
	if err == sql.ErrNoRows {
		return domain.Account{}, apperrors.ErrResourceNotFound
	}
	if err != nil {
		return domain.Account{}, err
	}
	a.Role = domain.Role(role)
	if org.Valid {
		a.OrganizationID = org.String
	}
	return a, nil
}

func (s *Store) AccountByEmail(ctx context.Context, email string) (domain.Account, error) {
	var id string
	err := s.db.QueryRowContext(ctx, `SELECT id FROM accounts WHERE email=$1`, email).Scan(&id)
	if err == sql.ErrNoRows {
		return domain.Account{}, apperrors.ErrResourceNotFound
	}
	if err != nil {
		return domain.Account{}, err
	}
	return s.AccountByID(ctx, id)
}

func (s *Store) ListAccounts(ctx context.Context) ([]domain.Account, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id FROM accounts`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.Account, 0)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		a, err := s.AccountByID(ctx, id)
		if err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *Store) SaveOrganization(ctx context.Context, o domain.Organization) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO organizations (id, account_id, status, is_active, blocked, rating, inn, name, country, fields_frozen, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
		ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, is_active=EXCLUDED.is_active, blocked=EXCLUDED.blocked,
			rating=EXCLUDED.rating, inn=EXCLUDED.inn, name=EXCLUDED.name, country=EXCLUDED.country,
			fields_frozen=EXCLUDED.fields_frozen, updated_at=NOW()`,
		o.ID, o.AccountID, string(o.Status), o.IsActive, o.Blocked, string(o.Rating), o.INN, o.Name, o.Country, o.FieldsFrozen)
	return err
}

func (s *Store) OrganizationByID(ctx context.Context, id string) (domain.Organization, error) {
	var o domain.Organization
	var status, rating string
	err := s.db.QueryRowContext(ctx, `
		SELECT id, account_id, status, is_active, blocked, rating, COALESCE(inn,''), COALESCE(name,''), COALESCE(country,''), fields_frozen
		FROM organizations WHERE id=$1`, id).Scan(&o.ID, &o.AccountID, &status, &o.IsActive, &o.Blocked, &rating, &o.INN, &o.Name, &o.Country, &o.FieldsFrozen)
	if err == sql.ErrNoRows {
		return domain.Organization{}, apperrors.ErrResourceNotFound
	}
	if err != nil {
		return domain.Organization{}, err
	}
	o.Status = domain.OrganizationStatus(status)
	o.Rating = domain.ClientRating(rating)
	return o, nil
}

func (s *Store) ListOrganizations(ctx context.Context) ([]domain.Organization, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id FROM organizations`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.Organization, 0)
	for rows.Next() {
		var id string
		_ = rows.Scan(&id)
		o, err := s.OrganizationByID(ctx, id)
		if err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	return out, nil
}

func (s *Store) ListAwaiting(ctx context.Context) []domain.Organization {
	orgs, _ := s.ListOrganizations(ctx)
	out := make([]domain.Organization, 0)
	for _, o := range orgs {
		if o.Status == domain.OrgAwaitingProcessing || o.Rating == domain.RatingRed || o.Rating == domain.RatingYellow {
			out = append(out, o)
		}
	}
	return out
}

func (s *Store) SaveForm(ctx context.Context, f formpayment.Form) error {
	raw, _ := json.Marshal(f)
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO form_payments (
			id, account_id, organization_id, provider_id, agent_id, manager_id, status, prev_status, direction, kind,
			rate_on_provider, execution_deadline, rate_value, rate_currency, rate_source, fee_amount, fee_percent, fee_currency,
			invoice_amount, currency, counterparty_id, contract_id, payment_method, platform_postpay_mode, sign_method,
			no_documents, important, client_agreed_provider, confirmation_hash, confirmation_file_id, contract_number, contract_date,
			invoice_json, docs_json, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,NOW()
		) ON CONFLICT (id) DO UPDATE SET
			provider_id=EXCLUDED.provider_id, agent_id=EXCLUDED.agent_id, manager_id=EXCLUDED.manager_id,
			status=EXCLUDED.status, prev_status=EXCLUDED.prev_status, rate_on_provider=EXCLUDED.rate_on_provider,
			execution_deadline=EXCLUDED.execution_deadline, rate_value=EXCLUDED.rate_value, rate_currency=EXCLUDED.rate_currency,
			rate_source=EXCLUDED.rate_source, fee_amount=EXCLUDED.fee_amount, fee_percent=EXCLUDED.fee_percent,
			fee_currency=EXCLUDED.fee_currency, invoice_amount=EXCLUDED.invoice_amount, currency=EXCLUDED.currency,
			counterparty_id=EXCLUDED.counterparty_id, contract_id=EXCLUDED.contract_id, payment_method=EXCLUDED.payment_method,
			platform_postpay_mode=EXCLUDED.platform_postpay_mode, sign_method=EXCLUDED.sign_method, no_documents=EXCLUDED.no_documents,
			important=EXCLUDED.important, client_agreed_provider=EXCLUDED.client_agreed_provider,
			confirmation_hash=EXCLUDED.confirmation_hash, confirmation_file_id=EXCLUDED.confirmation_file_id,
			contract_number=EXCLUDED.contract_number, contract_date=EXCLUDED.contract_date,
			invoice_json=EXCLUDED.invoice_json, docs_json=EXCLUDED.docs_json, updated_at=NOW()`,
		f.ID, f.AccountID, f.OrganizationID, nullStr(f.ProviderID), nullStr(f.AgentID), nullStr(f.ManagerID),
		string(f.Status), string(f.PrevStatus), string(f.Direction), string(f.Kind), f.RateOnProvider, f.ExecutionDeadline,
		f.Rate.Value, f.Rate.Currency, f.Rate.Source, f.Commission.FeeAmount, f.Commission.FeePercent, f.Commission.FeeCurrency,
		f.InvoiceAmount, f.Currency, nullStr(f.CounterpartyID), nullStr(f.ContractID), f.PaymentMethod, f.PlatformPostpayMode, f.SignMethod,
		f.NoDocuments, f.Important, f.ClientAgreedProvider, f.ConfirmationHash, f.ConfirmationFileID, f.ContractNumber, f.ContractDate,
		stringOr(f.InvoiceJSON, string(raw)), f.DocsJSON,
	)
	return err
}

func (s *Store) FormByID(ctx context.Context, id string) (formpayment.Form, error) {
	var f formpayment.Form
	var status, prev, dir, kind string
	var provider, agent, manager, cp, contract sql.NullString
	var deadline sql.NullTime
	err := s.db.QueryRowContext(ctx, `
		SELECT id, account_id, organization_id, provider_id, agent_id, manager_id, status, prev_status, direction, kind,
			rate_on_provider, execution_deadline, COALESCE(rate_value,''), COALESCE(rate_currency,''), COALESCE(rate_source,''),
			COALESCE(fee_amount,''), COALESCE(fee_percent,''), COALESCE(fee_currency,''), COALESCE(invoice_amount,''), COALESCE(currency,''),
			counterparty_id, contract_id, COALESCE(payment_method,''), COALESCE(platform_postpay_mode,''), COALESCE(sign_method,''),
			no_documents, important, client_agreed_provider, COALESCE(confirmation_hash,''), COALESCE(confirmation_file_id,''),
			COALESCE(contract_number,''), COALESCE(contract_date,''), COALESCE(invoice_json,''), COALESCE(docs_json,''), created_at, updated_at
		FROM form_payments WHERE id=$1`, id).Scan(
		&f.ID, &f.AccountID, &f.OrganizationID, &provider, &agent, &manager, &status, &prev, &dir, &kind,
		&f.RateOnProvider, &deadline, &f.Rate.Value, &f.Rate.Currency, &f.Rate.Source,
		&f.Commission.FeeAmount, &f.Commission.FeePercent, &f.Commission.FeeCurrency, &f.InvoiceAmount, &f.Currency,
		&cp, &contract, &f.PaymentMethod, &f.PlatformPostpayMode, &f.SignMethod,
		&f.NoDocuments, &f.Important, &f.ClientAgreedProvider, &f.ConfirmationHash, &f.ConfirmationFileID,
		&f.ContractNumber, &f.ContractDate, &f.InvoiceJSON, &f.DocsJSON, &f.CreatedAt, &f.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return formpayment.Form{}, apperrors.ErrResourceNotFound
	}
	if err != nil {
		return formpayment.Form{}, err
	}
	f.Status = formpayment.Status(status)
	f.PrevStatus = formpayment.Status(prev)
	f.Direction = formpayment.Direction(dir)
	f.Kind = formpayment.Kind(kind)
	f.ProviderID = provider.String
	f.AgentID = agent.String
	f.ManagerID = manager.String
	f.CounterpartyID = cp.String
	f.ContractID = contract.String
	if deadline.Valid {
		t := deadline.Time
		f.ExecutionDeadline = &t
	}
	return f, nil
}

func (s *Store) ListForms(ctx context.Context) []formpayment.Form {
	rows, err := s.db.QueryContext(ctx, `SELECT id FROM form_payments`)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := make([]formpayment.Form, 0)
	for rows.Next() {
		var id string
		_ = rows.Scan(&id)
		f, err := s.FormByID(ctx, id)
		if err == nil {
			out = append(out, f)
		}
	}
	return out
}

func (s *Store) AppendHistory(ctx context.Context, e formpayment.ComplianceHistoryEntry) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO compliance_history (id, form_payment_id, actor_id, from_status, to_status, comment, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		e.ID, e.FormPaymentID, e.ActorID, string(e.FromStatus), string(e.ToStatus), e.Comment, e.CreatedAt)
	return err
}

func (s *Store) HistoryByForm(ctx context.Context, formID string) []formpayment.ComplianceHistoryEntry {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, form_payment_id, actor_id, from_status, to_status, COALESCE(comment,''), created_at
		FROM compliance_history WHERE form_payment_id=$1 ORDER BY created_at`, formID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := make([]formpayment.ComplianceHistoryEntry, 0)
	for rows.Next() {
		var e formpayment.ComplianceHistoryEntry
		var from, to string
		_ = rows.Scan(&e.ID, &e.FormPaymentID, &e.ActorID, &from, &to, &e.Comment, &e.CreatedAt)
		e.FromStatus = formpayment.Status(from)
		e.ToStatus = formpayment.Status(to)
		out = append(out, e)
	}
	return out
}

func (s *Store) SaveDocument(ctx context.Context, d formpayment.Document) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO documents (id, form_payment_id, type, storage_key, content_hash)
		VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET storage_key=EXCLUDED.storage_key, content_hash=EXCLUDED.content_hash`,
		d.ID, d.FormPaymentID, d.Type, d.StorageKey, d.ContentHash)
	return err
}

func (s *Store) DocumentsByForm(ctx context.Context, formID string) []formpayment.Document {
	rows, err := s.db.QueryContext(ctx, `SELECT id, form_payment_id, type, storage_key, COALESCE(content_hash,'') FROM documents WHERE form_payment_id=$1`, formID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := make([]formpayment.Document, 0)
	for rows.Next() {
		var d formpayment.Document
		_ = rows.Scan(&d.ID, &d.FormPaymentID, &d.Type, &d.StorageKey, &d.ContentHash)
		out = append(out, d)
	}
	return out
}

func (s *Store) SaveContract(ctx context.Context, c domain.Contract) error {
	if c.CreatedAt.IsZero() {
		c.CreatedAt = time.Now().UTC()
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO contracts (id, organization_id, status, template_key, signed_file_id, created_at)
		VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, signed_file_id=EXCLUDED.signed_file_id`,
		c.ID, c.OrganizationID, c.Status, c.TemplateKey, c.SignedFileID, c.CreatedAt)
	return err
}

func (s *Store) ContractByID(ctx context.Context, id string) (domain.Contract, error) {
	var c domain.Contract
	err := s.db.QueryRowContext(ctx, `SELECT id, organization_id, status, COALESCE(template_key,''), COALESCE(signed_file_id,''), created_at FROM contracts WHERE id=$1`, id).
		Scan(&c.ID, &c.OrganizationID, &c.Status, &c.TemplateKey, &c.SignedFileID, &c.CreatedAt)
	if err == sql.ErrNoRows {
		return domain.Contract{}, apperrors.ErrResourceNotFound
	}
	return c, err
}

func (s *Store) ListContracts(ctx context.Context) ([]domain.Contract, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id FROM contracts`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.Contract, 0)
	for rows.Next() {
		var id string
		_ = rows.Scan(&id)
		c, err := s.ContractByID(ctx, id)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, nil
}

func (s *Store) SaveCounterparty(ctx context.Context, c domain.Counterparty) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO counterparties (id, name, country, inn, banks) VALUES ($1,$2,$3,$4,$5)
		ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, country=EXCLUDED.country, inn=EXCLUDED.inn, banks=EXCLUDED.banks`,
		c.ID, c.Name, c.Country, c.INN, c.Banks)
	return err
}

func (s *Store) CounterpartyByID(ctx context.Context, id string) (domain.Counterparty, error) {
	var c domain.Counterparty
	err := s.db.QueryRowContext(ctx, `SELECT id, name, COALESCE(country,''), COALESCE(inn,''), COALESCE(banks,'') FROM counterparties WHERE id=$1`, id).
		Scan(&c.ID, &c.Name, &c.Country, &c.INN, &c.Banks)
	if err == sql.ErrNoRows {
		return domain.Counterparty{}, apperrors.ErrResourceNotFound
	}
	return c, err
}

func (s *Store) ListCounterparties(ctx context.Context) ([]domain.Counterparty, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, name, COALESCE(country,''), COALESCE(inn,''), COALESCE(banks,'') FROM counterparties`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.Counterparty, 0)
	for rows.Next() {
		var c domain.Counterparty
		_ = rows.Scan(&c.ID, &c.Name, &c.Country, &c.INN, &c.Banks)
		out = append(out, c)
	}
	return out, nil
}

func (s *Store) SaveComment(ctx context.Context, c domain.Comment) error {
	if c.CreatedAt.IsZero() {
		c.CreatedAt = time.Now().UTC()
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO comments (id, entity_type, entity_id, author_id, body, read, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET body=EXCLUDED.body, read=EXCLUDED.read`,
		c.ID, c.EntityType, c.EntityID, c.AuthorID, c.Body, c.Read, c.CreatedAt)
	return err
}

func (s *Store) ListComments(ctx context.Context, entityType, entityID string) ([]domain.Comment, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, entity_type, entity_id, author_id, body, read, created_at FROM comments WHERE entity_type=$1 AND entity_id=$2`, entityType, entityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.Comment, 0)
	for rows.Next() {
		var c domain.Comment
		_ = rows.Scan(&c.ID, &c.EntityType, &c.EntityID, &c.AuthorID, &c.Body, &c.Read, &c.CreatedAt)
		out = append(out, c)
	}
	return out, nil
}

func (s *Store) SaveFile(ctx context.Context, f domain.FileMeta) error {
	if f.CreatedAt.IsZero() {
		f.CreatedAt = time.Now().UTC()
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO files (id, owner_id, form_id, storage_key, content_type, content_hash, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET storage_key=EXCLUDED.storage_key, content_hash=EXCLUDED.content_hash`,
		f.ID, nullStr(f.OwnerID), nullStr(f.FormID), f.StorageKey, f.ContentType, f.ContentHash, f.CreatedAt)
	return err
}

func (s *Store) FileByID(ctx context.Context, id string) (domain.FileMeta, error) {
	var f domain.FileMeta
	var owner, form sql.NullString
	err := s.db.QueryRowContext(ctx, `
		SELECT id, owner_id, form_id, storage_key, COALESCE(content_type,''), COALESCE(content_hash,''), created_at FROM files WHERE id=$1`, id).
		Scan(&f.ID, &owner, &form, &f.StorageKey, &f.ContentType, &f.ContentHash, &f.CreatedAt)
	if err == sql.ErrNoRows {
		return domain.FileMeta{}, apperrors.ErrResourceNotFound
	}
	f.OwnerID = owner.String
	f.FormID = form.String
	return f, err
}

func (s *Store) SaveAgent(ctx context.Context, a domain.Agent) error {
	_, err := s.db.ExecContext(ctx, `INSERT INTO agents (id, name, inn) VALUES ($1,$2,$3) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, inn=EXCLUDED.inn`, a.ID, a.Name, a.INN)
	return err
}

func (s *Store) AgentByID(ctx context.Context, id string) (domain.Agent, error) {
	var a domain.Agent
	err := s.db.QueryRowContext(ctx, `SELECT id, name, COALESCE(inn,'') FROM agents WHERE id=$1`, id).Scan(&a.ID, &a.Name, &a.INN)
	if err == sql.ErrNoRows {
		return domain.Agent{}, apperrors.ErrResourceNotFound
	}
	return a, err
}

func (s *Store) ListAgents(ctx context.Context) ([]domain.Agent, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, name, COALESCE(inn,'') FROM agents`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.Agent, 0)
	for rows.Next() {
		var a domain.Agent
		_ = rows.Scan(&a.ID, &a.Name, &a.INN)
		out = append(out, a)
	}
	return out, nil
}

func (s *Store) SaveHsCode(ctx context.Context, h domain.HsCode) error {
	_, err := s.db.ExecContext(ctx, `INSERT INTO hs_codes (code, description) VALUES ($1,$2) ON CONFLICT (code) DO UPDATE SET description=EXCLUDED.description`, h.Code, h.Description)
	return err
}

func (s *Store) ListHsCodes(ctx context.Context) ([]domain.HsCode, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT code, COALESCE(description,'') FROM hs_codes`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.HsCode, 0)
	for rows.Next() {
		var h domain.HsCode
		_ = rows.Scan(&h.Code, &h.Description)
		out = append(out, h)
	}
	return out, nil
}

func (s *Store) SaveCurrency(ctx context.Context, c domain.Currency) error {
	_, err := s.db.ExecContext(ctx, `INSERT INTO currencies (code, name) VALUES ($1,$2) ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name`, c.Code, c.Name)
	return err
}

func (s *Store) ListCurrencies(ctx context.Context) ([]domain.Currency, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT code, name FROM currencies`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.Currency, 0)
	for rows.Next() {
		var c domain.Currency
		_ = rows.Scan(&c.Code, &c.Name)
		out = append(out, c)
	}
	return out, nil
}

func (s *Store) SaveConfiguration(ctx context.Context, key, value string) error {
	_, err := s.db.ExecContext(ctx, `INSERT INTO configurations (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`, key, value)
	return err
}

func (s *Store) Configuration(ctx context.Context, key string) (string, error) {
	var v string
	err := s.db.QueryRowContext(ctx, `SELECT value FROM configurations WHERE key=$1`, key).Scan(&v)
	if err == sql.ErrNoRows {
		return "", apperrors.ErrResourceNotFound
	}
	return v, err
}

func (s *Store) SaveLiquidityOffer(ctx context.Context, o domain.LiquidityOffer) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO liquidity_offers (id, direction, provider_id, amount, currency, status)
		VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, amount=EXCLUDED.amount`,
		o.ID, o.Direction, nullStr(o.ProviderID), o.Amount, o.Currency, o.Status)
	return err
}

func (s *Store) ListLiquidity(ctx context.Context, direction string) ([]domain.LiquidityOffer, error) {
	q := `SELECT id, direction, provider_id, COALESCE(amount,''), COALESCE(currency,''), status FROM liquidity_offers`
	args := []any{}
	if direction != "" {
		q += ` WHERE direction=$1`
		args = append(args, direction)
	}
	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.LiquidityOffer, 0)
	for rows.Next() {
		var o domain.LiquidityOffer
		var provider sql.NullString
		_ = rows.Scan(&o.ID, &o.Direction, &provider, &o.Amount, &o.Currency, &o.Status)
		o.ProviderID = provider.String
		out = append(out, o)
	}
	return out, nil
}

func (s *Store) SaveVirtualAccount(ctx context.Context, a domain.VirtualAccount) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO virtual_accounts (id, account_id, kind, balance, currency)
		VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET balance=EXCLUDED.balance`,
		a.ID, a.AccountID, a.Kind, a.Balance, a.Currency)
	return err
}

func (s *Store) VirtualAccountsByAccount(ctx context.Context, accountID string) ([]domain.VirtualAccount, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, account_id, kind, balance, currency FROM virtual_accounts WHERE account_id=$1`, accountID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.VirtualAccount, 0)
	for rows.Next() {
		var a domain.VirtualAccount
		_ = rows.Scan(&a.ID, &a.AccountID, &a.Kind, &a.Balance, &a.Currency)
		out = append(out, a)
	}
	return out, nil
}

func (s *Store) SaveTreasurerTask(ctx context.Context, t domain.TreasurerTask) error {
	if t.CreatedAt.IsZero() {
		t.CreatedAt = time.Now().UTC()
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO treasurer_tasks (id, form_payment_id, kind, status, created_at)
		VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status`,
		t.ID, t.FormPaymentID, t.Kind, t.Status, t.CreatedAt)
	return err
}

func (s *Store) ListTreasurerTasks(ctx context.Context) ([]domain.TreasurerTask, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, form_payment_id, kind, status, created_at FROM treasurer_tasks`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.TreasurerTask, 0)
	for rows.Next() {
		var t domain.TreasurerTask
		_ = rows.Scan(&t.ID, &t.FormPaymentID, &t.Kind, &t.Status, &t.CreatedAt)
		out = append(out, t)
	}
	return out, nil
}

func (s *Store) TreasurerTaskByID(ctx context.Context, id string) (domain.TreasurerTask, error) {
	var t domain.TreasurerTask
	err := s.db.QueryRowContext(ctx, `SELECT id, form_payment_id, kind, status, created_at FROM treasurer_tasks WHERE id=$1`, id).
		Scan(&t.ID, &t.FormPaymentID, &t.Kind, &t.Status, &t.CreatedAt)
	if err == sql.ErrNoRows {
		return domain.TreasurerTask{}, apperrors.ErrResourceNotFound
	}
	return t, err
}

func (s *Store) SaveUnblockRequest(ctx context.Context, r domain.UnblockRequest) error {
	if r.CreatedAt.IsZero() {
		r.CreatedAt = time.Now().UTC()
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO unblock_requests (id, organization_id, requested_by, status, created_at)
		VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status`,
		r.ID, r.OrganizationID, r.RequestedBy, r.Status, r.CreatedAt)
	return err
}

func (s *Store) ListUnblockRequests(ctx context.Context) ([]domain.UnblockRequest, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, organization_id, requested_by, status, created_at FROM unblock_requests`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.UnblockRequest, 0)
	for rows.Next() {
		var r domain.UnblockRequest
		_ = rows.Scan(&r.ID, &r.OrganizationID, &r.RequestedBy, &r.Status, &r.CreatedAt)
		out = append(out, r)
	}
	return out, nil
}

func nullStr(v string) any {
	if v == "" {
		return nil
	}
	return v
}

func stringOr(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}
