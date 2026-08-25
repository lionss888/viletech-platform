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
		INSERT INTO accounts (id, email, password_hash, role, organization_id, blocked, full_name, phone, passport, refresh_token, active, lang, rate_settings, bank_rate_readonly)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
		ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, password_hash=EXCLUDED.password_hash,
			role=EXCLUDED.role, organization_id=EXCLUDED.organization_id, blocked=EXCLUDED.blocked,
			full_name=EXCLUDED.full_name, phone=EXCLUDED.phone, passport=EXCLUDED.passport,
			refresh_token=EXCLUDED.refresh_token, active=EXCLUDED.active, lang=EXCLUDED.lang,
			rate_settings=EXCLUDED.rate_settings, bank_rate_readonly=EXCLUDED.bank_rate_readonly`,
		a.ID, a.Email, a.PasswordHash, string(a.Role), nullStr(a.OrganizationID), a.Blocked, a.FullName, a.Phone, a.Passport,
		nullStr(a.RefreshToken), a.Active, a.Lang, a.RateSettingsJSON, a.BankRateReadonly)
	return err
}

func (s *Store) AccountByID(ctx context.Context, id string) (domain.Account, error) {
	var a domain.Account
	var role string
	var org sql.NullString
	var rateSettings sql.NullString
	err := s.db.QueryRowContext(ctx, `
		SELECT id, email, password_hash, role, organization_id, blocked,
			COALESCE(full_name,''), COALESCE(phone,''), COALESCE(passport,''),
			COALESCE(refresh_token,''), COALESCE(active, TRUE), COALESCE(lang,''),
			COALESCE(rate_settings,''), COALESCE(bank_rate_readonly, FALSE)
		FROM accounts WHERE id=$1`, id).Scan(
		&a.ID, &a.Email, &a.PasswordHash, &role, &org, &a.Blocked,
		&a.FullName, &a.Phone, &a.Passport, &a.RefreshToken, &a.Active, &a.Lang,
		&rateSettings, &a.BankRateReadonly)
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
	if rateSettings.Valid {
		a.RateSettingsJSON = rateSettings.String
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

func (s *Store) AccountByRefreshToken(ctx context.Context, token string) (domain.Account, error) {
	var id string
	err := s.db.QueryRowContext(ctx, `SELECT id FROM accounts WHERE refresh_token=$1`, token).Scan(&id)
	if err == sql.ErrNoRows {
		return domain.Account{}, apperrors.ErrUnauthorized
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

func (s *Store) SaveVerificationCode(ctx context.Context, code domain.VerificationCode) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO verification_codes (id, account_id, email, code, kind, expires_at)
		VALUES ($1,$2,$3,$4,$5,$6)
		ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code, expires_at=EXCLUDED.expires_at`,
		code.ID, code.AccountID, code.Email, code.Code, string(code.Kind), code.ExpiresAt)
	return err
}

func (s *Store) VerificationCodeByEmailKind(ctx context.Context, email string, kind domain.VerificationCodeKind) (domain.VerificationCode, error) {
	var c domain.VerificationCode
	var k string
	err := s.db.QueryRowContext(ctx, `
		SELECT id, account_id, email, code, kind, expires_at FROM verification_codes
		WHERE email=$1 AND kind=$2 ORDER BY expires_at DESC LIMIT 1`, email, string(kind)).
		Scan(&c.ID, &c.AccountID, &c.Email, &c.Code, &k, &c.ExpiresAt)
	if err == sql.ErrNoRows {
		return domain.VerificationCode{}, apperrors.ErrResourceNotFound
	}
	if err != nil {
		return domain.VerificationCode{}, err
	}
	c.Kind = domain.VerificationCodeKind(k)
	return c, nil
}

func (s *Store) DeleteVerificationCode(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM verification_codes WHERE id=$1`, id)
	return err
}

func (s *Store) SaveOrganization(ctx context.Context, o domain.Organization) error {
	sub, _ := json.Marshal(o.Subaccounts)
	inv, _ := json.Marshal(o.InvitedIDs)
	orgType := string(o.Type)
	if orgType == "" {
		orgType = string(domain.OrgTypeClient)
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO organizations (id, account_id, status, is_active, blocked, rating, inn, name, country, fields_frozen, org_type, subaccounts, invited_ids, organization_card_file_id,
			client_type, bank_fixed_commission_percent, apply_platform_markup, default_agent_id, bank_webhook_url, bank_webhook_secret, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW())
		ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, is_active=EXCLUDED.is_active, blocked=EXCLUDED.blocked,
			rating=EXCLUDED.rating, inn=EXCLUDED.inn, name=EXCLUDED.name, country=EXCLUDED.country,
			fields_frozen=EXCLUDED.fields_frozen, org_type=EXCLUDED.org_type, subaccounts=EXCLUDED.subaccounts,
			invited_ids=EXCLUDED.invited_ids, organization_card_file_id=EXCLUDED.organization_card_file_id,
			client_type=EXCLUDED.client_type, bank_fixed_commission_percent=EXCLUDED.bank_fixed_commission_percent,
			apply_platform_markup=EXCLUDED.apply_platform_markup, default_agent_id=EXCLUDED.default_agent_id,
			bank_webhook_url=EXCLUDED.bank_webhook_url, bank_webhook_secret=EXCLUDED.bank_webhook_secret, updated_at=NOW()`,
		o.ID, o.AccountID, string(o.Status), o.IsActive, o.Blocked, string(o.Rating), o.INN, o.Name, o.Country, o.FieldsFrozen,
		orgType, string(sub), string(inv), nullStr(o.OrganizationCardFileID),
		clientTypeOr(o.ClientType), nullStr(o.BankFixedCommissionPercent), o.ApplyPlatformMarkup, nullStr(o.DefaultAgentID),
		nullStr(o.BankWebhookURL), nullStr(o.BankWebhookSecret))
	if err != nil {
		// fallback without migration 011
		_, err = s.db.ExecContext(ctx, `
			INSERT INTO organizations (id, account_id, status, is_active, blocked, rating, inn, name, country, fields_frozen, org_type, subaccounts, invited_ids, organization_card_file_id, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
			ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, is_active=EXCLUDED.is_active, blocked=EXCLUDED.blocked,
				rating=EXCLUDED.rating, inn=EXCLUDED.inn, name=EXCLUDED.name, country=EXCLUDED.country,
				fields_frozen=EXCLUDED.fields_frozen, org_type=EXCLUDED.org_type, subaccounts=EXCLUDED.subaccounts,
				invited_ids=EXCLUDED.invited_ids, organization_card_file_id=EXCLUDED.organization_card_file_id, updated_at=NOW()`,
			o.ID, o.AccountID, string(o.Status), o.IsActive, o.Blocked, string(o.Rating), o.INN, o.Name, o.Country, o.FieldsFrozen,
			orgType, string(sub), string(inv), nullStr(o.OrganizationCardFileID))
	}
	return err
}

func (s *Store) DeleteOrganization(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM organizations WHERE id=$1`, id)
	return err
}

func (s *Store) OrganizationByID(ctx context.Context, id string) (domain.Organization, error) {
	var o domain.Organization
	var status, rating, orgType, clientType string
	var sub, inv, card sql.NullString
	err := s.db.QueryRowContext(ctx, `
		SELECT id, account_id, status, is_active, blocked, rating, COALESCE(inn,''), COALESCE(name,''), COALESCE(country,''), fields_frozen,
			COALESCE(org_type,'client'), COALESCE(subaccounts,'[]'), COALESCE(invited_ids,'[]'), organization_card_file_id,
			COALESCE(client_type,'ui'), COALESCE(bank_fixed_commission_percent,''), COALESCE(apply_platform_markup,false),
			COALESCE(default_agent_id,''), COALESCE(bank_webhook_url,''), COALESCE(bank_webhook_secret,'')
		FROM organizations WHERE id=$1`, id).Scan(
		&o.ID, &o.AccountID, &status, &o.IsActive, &o.Blocked, &rating, &o.INN, &o.Name, &o.Country, &o.FieldsFrozen,
		&orgType, &sub, &inv, &card,
		&clientType, &o.BankFixedCommissionPercent, &o.ApplyPlatformMarkup, &o.DefaultAgentID, &o.BankWebhookURL, &o.BankWebhookSecret)
	if err != nil && err != sql.ErrNoRows {
		err = s.db.QueryRowContext(ctx, `
			SELECT id, account_id, status, is_active, blocked, rating, COALESCE(inn,''), COALESCE(name,''), COALESCE(country,''), fields_frozen,
				COALESCE(org_type,'client'), COALESCE(subaccounts,'[]'), COALESCE(invited_ids,'[]'), organization_card_file_id
			FROM organizations WHERE id=$1`, id).Scan(
			&o.ID, &o.AccountID, &status, &o.IsActive, &o.Blocked, &rating, &o.INN, &o.Name, &o.Country, &o.FieldsFrozen,
			&orgType, &sub, &inv, &card)
	}
	if err == sql.ErrNoRows {
		return domain.Organization{}, apperrors.ErrResourceNotFound
	}
	if err != nil {
		return domain.Organization{}, err
	}
	o.Status = domain.OrganizationStatus(status)
	o.Rating = domain.ClientRating(rating)
	o.Type = domain.OrganizationType(orgType)
	o.ClientType = domain.ClientType(clientType)
	if o.ClientType == "" {
		o.ClientType = domain.ClientTypeUI
	}
	o.OrganizationCardFileID = card.String
	if sub.Valid {
		_ = json.Unmarshal([]byte(sub.String), &o.Subaccounts)
	}
	if inv.Valid {
		_ = json.Unmarshal([]byte(inv.String), &o.InvitedIDs)
	}
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
			invoice_json, docs_json, on_behalf_organization_id, active_order_id, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,NOW()
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
			invoice_json=EXCLUDED.invoice_json, docs_json=EXCLUDED.docs_json,
			on_behalf_organization_id=EXCLUDED.on_behalf_organization_id, active_order_id=EXCLUDED.active_order_id, updated_at=NOW()`,
		f.ID, f.AccountID, f.OrganizationID, nullStr(f.ProviderID), nullStr(f.AgentID), nullStr(f.ManagerID),
		string(f.Status), string(f.PrevStatus), string(f.Direction), string(f.Kind), f.RateOnProvider, f.ExecutionDeadline,
		f.Rate.Value, f.Rate.Currency, f.Rate.Source, f.Commission.FeeAmount, f.Commission.FeePercent, f.Commission.FeeCurrency,
		f.InvoiceAmount, f.Currency, nullStr(f.CounterpartyID), nullStr(f.ContractID), f.PaymentMethod, f.PlatformPostpayMode, f.SignMethod,
		f.NoDocuments, f.Important, f.ClientAgreedProvider, f.ConfirmationHash, f.ConfirmationFileID, f.ContractNumber, f.ContractDate,
		stringOr(f.InvoiceJSON, string(raw)), f.DocsJSON, nullStr(f.OnBehalfOrganizationID), nullStr(f.ActiveOrderID),
	)
	if err != nil {
		_, err = s.db.ExecContext(ctx, `
			INSERT INTO form_payments (
				id, account_id, organization_id, provider_id, agent_id, manager_id, status, prev_status, direction, kind,
				rate_on_provider, execution_deadline, rate_value, rate_currency, rate_source, fee_amount, fee_percent, fee_currency,
				invoice_amount, currency, counterparty_id, contract_id, payment_method, platform_postpay_mode, sign_method,
				no_documents, important, client_agreed_provider, confirmation_hash, confirmation_file_id, contract_number, contract_date,
				invoice_json, docs_json, on_behalf_organization_id, updated_at
			) VALUES (
				$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,NOW()
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
				invoice_json=EXCLUDED.invoice_json, docs_json=EXCLUDED.docs_json,
				on_behalf_organization_id=EXCLUDED.on_behalf_organization_id, updated_at=NOW()`,
			f.ID, f.AccountID, f.OrganizationID, nullStr(f.ProviderID), nullStr(f.AgentID), nullStr(f.ManagerID),
			string(f.Status), string(f.PrevStatus), string(f.Direction), string(f.Kind), f.RateOnProvider, f.ExecutionDeadline,
			f.Rate.Value, f.Rate.Currency, f.Rate.Source, f.Commission.FeeAmount, f.Commission.FeePercent, f.Commission.FeeCurrency,
			f.InvoiceAmount, f.Currency, nullStr(f.CounterpartyID), nullStr(f.ContractID), f.PaymentMethod, f.PlatformPostpayMode, f.SignMethod,
			f.NoDocuments, f.Important, f.ClientAgreedProvider, f.ConfirmationHash, f.ConfirmationFileID, f.ContractNumber, f.ContractDate,
			stringOr(f.InvoiceJSON, string(raw)), f.DocsJSON, nullStr(f.OnBehalfOrganizationID),
		)
	}
	return err
}

func (s *Store) FormByID(ctx context.Context, id string) (formpayment.Form, error) {
	var f formpayment.Form
	var status, prev, dir, kind string
	var provider, agent, manager, cp, contract sql.NullString
	var deadline sql.NullTime
	var onBehalf, activeOrder sql.NullString
	err := s.db.QueryRowContext(ctx, `
		SELECT id, account_id, organization_id, provider_id, agent_id, manager_id, status, prev_status, direction, kind,
			rate_on_provider, execution_deadline, COALESCE(rate_value,''), COALESCE(rate_currency,''), COALESCE(rate_source,''),
			COALESCE(fee_amount,''), COALESCE(fee_percent,''), COALESCE(fee_currency,''), COALESCE(invoice_amount,''), COALESCE(currency,''),
			counterparty_id, contract_id, COALESCE(payment_method,''), COALESCE(platform_postpay_mode,''), COALESCE(sign_method,''),
			no_documents, important, client_agreed_provider, COALESCE(confirmation_hash,''), COALESCE(confirmation_file_id,''),
			COALESCE(contract_number,''), COALESCE(contract_date,''), COALESCE(invoice_json,''), COALESCE(docs_json,''),
			on_behalf_organization_id, active_order_id, created_at, updated_at
		FROM form_payments WHERE id=$1`, id).Scan(
		&f.ID, &f.AccountID, &f.OrganizationID, &provider, &agent, &manager, &status, &prev, &dir, &kind,
		&f.RateOnProvider, &deadline, &f.Rate.Value, &f.Rate.Currency, &f.Rate.Source,
		&f.Commission.FeeAmount, &f.Commission.FeePercent, &f.Commission.FeeCurrency, &f.InvoiceAmount, &f.Currency,
		&cp, &contract, &f.PaymentMethod, &f.PlatformPostpayMode, &f.SignMethod,
		&f.NoDocuments, &f.Important, &f.ClientAgreedProvider, &f.ConfirmationHash, &f.ConfirmationFileID,
		&f.ContractNumber, &f.ContractDate, &f.InvoiceJSON, &f.DocsJSON, &onBehalf, &activeOrder, &f.CreatedAt, &f.UpdatedAt,
	)
	if err != nil && err != sql.ErrNoRows {
		err = s.db.QueryRowContext(ctx, `
			SELECT id, account_id, organization_id, provider_id, agent_id, manager_id, status, prev_status, direction, kind,
				rate_on_provider, execution_deadline, COALESCE(rate_value,''), COALESCE(rate_currency,''), COALESCE(rate_source,''),
				COALESCE(fee_amount,''), COALESCE(fee_percent,''), COALESCE(fee_currency,''), COALESCE(invoice_amount,''), COALESCE(currency,''),
				counterparty_id, contract_id, COALESCE(payment_method,''), COALESCE(platform_postpay_mode,''), COALESCE(sign_method,''),
				no_documents, important, client_agreed_provider, COALESCE(confirmation_hash,''), COALESCE(confirmation_file_id,''),
				COALESCE(contract_number,''), COALESCE(contract_date,''), COALESCE(invoice_json,''), COALESCE(docs_json,''),
				on_behalf_organization_id, created_at, updated_at
			FROM form_payments WHERE id=$1`, id).Scan(
			&f.ID, &f.AccountID, &f.OrganizationID, &provider, &agent, &manager, &status, &prev, &dir, &kind,
			&f.RateOnProvider, &deadline, &f.Rate.Value, &f.Rate.Currency, &f.Rate.Source,
			&f.Commission.FeeAmount, &f.Commission.FeePercent, &f.Commission.FeeCurrency, &f.InvoiceAmount, &f.Currency,
			&cp, &contract, &f.PaymentMethod, &f.PlatformPostpayMode, &f.SignMethod,
			&f.NoDocuments, &f.Important, &f.ClientAgreedProvider, &f.ConfirmationHash, &f.ConfirmationFileID,
			&f.ContractNumber, &f.ContractDate, &f.InvoiceJSON, &f.DocsJSON, &onBehalf, &f.CreatedAt, &f.UpdatedAt,
		)
	}
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
	f.OnBehalfOrganizationID = onBehalf.String
	f.ActiveOrderID = activeOrder.String
	if deadline.Valid {
		t := deadline.Time
		f.ExecutionDeadline = &t
	}
	f.UnpackDocsJSON()
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
	if c.UpdatedAt.IsZero() {
		c.UpdatedAt = time.Now().UTC()
	}
	if c.Status == "" {
		c.Status = domain.ContractStatusCreated
	}
	if c.Type == "" {
		c.Type = domain.ContractTypeAgency
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO contracts (
			id, organization_id, status, template_key, signed_file_id, created_at,
			type, agent_id, template_id, is_template, uploaded_by, account_ref, file_id,
			number, date, reject_text, history_json, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
		) ON CONFLICT (id) DO UPDATE SET
			organization_id=EXCLUDED.organization_id, status=EXCLUDED.status,
			template_key=EXCLUDED.template_key, signed_file_id=EXCLUDED.signed_file_id,
			type=EXCLUDED.type, agent_id=EXCLUDED.agent_id, template_id=EXCLUDED.template_id,
			is_template=EXCLUDED.is_template, uploaded_by=EXCLUDED.uploaded_by,
			account_ref=EXCLUDED.account_ref, file_id=EXCLUDED.file_id, number=EXCLUDED.number,
			date=EXCLUDED.date, reject_text=EXCLUDED.reject_text, history_json=EXCLUDED.history_json,
			updated_at=EXCLUDED.updated_at`,
		c.ID, nullStr(c.OrganizationID), string(c.Status), c.TemplateID, nullStr(c.FileID), c.CreatedAt,
		string(c.Type), nullStr(c.AgentID), nullStr(c.TemplateID), c.IsTemplate, nullStr(c.UploadedBy),
		nullStr(c.AccountRef), nullStr(c.FileID), c.Number, c.Date, c.RejectText, c.HistoryJSON, c.UpdatedAt)
	return err
}

func (s *Store) ContractByID(ctx context.Context, id string) (domain.Contract, error) {
	var c domain.Contract
	var status, ctype, orgID, tplKey, signed string
	var agent, tplID, uploaded, account, file sql.NullString
	var isTpl sql.NullBool
	var updated sql.NullTime
	err := s.db.QueryRowContext(ctx, `
		SELECT id, COALESCE(organization_id::text,''), status, COALESCE(template_key,''), COALESCE(signed_file_id,''), created_at,
			COALESCE(type,'agency'), agent_id, template_id, is_template,
			uploaded_by, account_ref, file_id,
			COALESCE(number,''), COALESCE(date,''), COALESCE(reject_text,''), COALESCE(history_json,''), updated_at
		FROM contracts WHERE id=$1`, id).Scan(
		&c.ID, &orgID, &status, &tplKey, &signed, &c.CreatedAt,
		&ctype, &agent, &tplID, &isTpl,
		&uploaded, &account, &file,
		&c.Number, &c.Date, &c.RejectText, &c.HistoryJSON, &updated)
	if err == sql.ErrNoRows {
		return domain.Contract{}, apperrors.ErrResourceNotFound
	}
	if err != nil {
		// fallback for DBs without migration 007 columns
		err2 := s.db.QueryRowContext(ctx, `
			SELECT id, COALESCE(organization_id::text,''), status, COALESCE(template_key,''), COALESCE(signed_file_id,''), created_at
			FROM contracts WHERE id=$1`, id).Scan(&c.ID, &orgID, &status, &tplKey, &signed, &c.CreatedAt)
		if err2 == sql.ErrNoRows {
			return domain.Contract{}, apperrors.ErrResourceNotFound
		}
		if err2 != nil {
			return domain.Contract{}, err
		}
		c.OrganizationID = orgID
		c.Status = domain.ContractEntityStatus(status)
		c.TemplateID = tplKey
		c.FileID = signed
		c.Type = domain.ContractTypeAgency
		return c, nil
	}
	c.OrganizationID = orgID
	c.Status = domain.ContractEntityStatus(status)
	c.Type = domain.ContractType(ctype)
	c.AgentID = agent.String
	c.TemplateID = tplID.String
	if c.TemplateID == "" {
		c.TemplateID = tplKey
	}
	c.IsTemplate = isTpl.Bool
	c.UploadedBy = uploaded.String
	c.AccountRef = account.String
	c.FileID = file.String
	if c.FileID == "" {
		c.FileID = signed
	}
	if updated.Valid {
		c.UpdatedAt = updated.Time
	}
	return c, nil
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

func (s *Store) ListContractsByOrg(ctx context.Context, orgID string) ([]domain.Contract, error) {
	all, err := s.ListContracts(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]domain.Contract, 0)
	for _, c := range all {
		if !c.IsTemplate && c.OrganizationID == orgID {
			out = append(out, c)
		}
	}
	return out, nil
}

func (s *Store) ListContractTemplatesByAgent(ctx context.Context, agentID string) ([]domain.Contract, error) {
	all, err := s.ListContracts(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]domain.Contract, 0)
	for _, c := range all {
		if c.IsTemplate && (agentID == "" || c.AgentID == agentID) {
			out = append(out, c)
		}
	}
	return out, nil
}

func (s *Store) SaveCounterparty(ctx context.Context, c domain.Counterparty) error {
	if c.CreatedAt.IsZero() {
		c.CreatedAt = time.Now().UTC()
	}
	ids, _ := json.Marshal(c.FormPaymentIDs)
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO counterparties (id, name, country, inn, banks, created_by, form_payment_ids, created_at,
			last_approval_status, last_approval_date, last_approval_comment)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, country=EXCLUDED.country, inn=EXCLUDED.inn,
			banks=EXCLUDED.banks, created_by=EXCLUDED.created_by, form_payment_ids=EXCLUDED.form_payment_ids,
			last_approval_status=EXCLUDED.last_approval_status, last_approval_date=EXCLUDED.last_approval_date,
			last_approval_comment=EXCLUDED.last_approval_comment`,
		c.ID, c.Name, c.Country, c.INN, c.Banks, c.CreatedBy, string(ids), c.CreatedAt,
		nullStr(string(c.LastApprovalStatus)), c.LastApprovalDate, c.LastApprovalComment)
	if err != nil {
		_, err = s.db.ExecContext(ctx, `
			INSERT INTO counterparties (id, name, country, inn, banks, created_by, form_payment_ids, created_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
			ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, country=EXCLUDED.country, inn=EXCLUDED.inn,
				banks=EXCLUDED.banks, created_by=EXCLUDED.created_by, form_payment_ids=EXCLUDED.form_payment_ids`,
			c.ID, c.Name, c.Country, c.INN, c.Banks, c.CreatedBy, string(ids), c.CreatedAt)
	}
	return err
}

func (s *Store) CounterpartyByID(ctx context.Context, id string) (domain.Counterparty, error) {
	var c domain.Counterparty
	var ids, createdBy, status, comment sql.NullString
	var approvedAt sql.NullTime
	err := s.db.QueryRowContext(ctx, `
		SELECT id, name, COALESCE(country,''), COALESCE(inn,''), COALESCE(banks,''), COALESCE(created_by,''), form_payment_ids, COALESCE(created_at, NOW()),
			last_approval_status, last_approval_date, last_approval_comment
		FROM counterparties WHERE id=$1`, id).
		Scan(&c.ID, &c.Name, &c.Country, &c.INN, &c.Banks, &createdBy, &ids, &c.CreatedAt, &status, &approvedAt, &comment)
	if err != nil && err != sql.ErrNoRows {
		err = s.db.QueryRowContext(ctx, `
			SELECT id, name, COALESCE(country,''), COALESCE(inn,''), COALESCE(banks,''), COALESCE(created_by,''), form_payment_ids, COALESCE(created_at, NOW())
			FROM counterparties WHERE id=$1`, id).
			Scan(&c.ID, &c.Name, &c.Country, &c.INN, &c.Banks, &createdBy, &ids, &c.CreatedAt)
	}
	if err == sql.ErrNoRows {
		return domain.Counterparty{}, apperrors.ErrResourceNotFound
	}
	if err != nil {
		return domain.Counterparty{}, err
	}
	c.CreatedBy = createdBy.String
	c.LastApprovalStatus = domain.CounterpartyApprovalStatus(status.String)
	c.LastApprovalComment = comment.String
	if approvedAt.Valid {
		t := approvedAt.Time
		c.LastApprovalDate = &t
	}
	if ids.Valid && ids.String != "" {
		_ = json.Unmarshal([]byte(ids.String), &c.FormPaymentIDs)
	}
	return c, nil
}

func (s *Store) ListCounterparties(ctx context.Context) ([]domain.Counterparty, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, name, COALESCE(country,''), COALESCE(inn,''), COALESCE(banks,''), COALESCE(created_by,''), form_payment_ids, COALESCE(created_at, NOW())
		FROM counterparties`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.Counterparty, 0)
	for rows.Next() {
		var c domain.Counterparty
		var ids sql.NullString
		var createdBy sql.NullString
		_ = rows.Scan(&c.ID, &c.Name, &c.Country, &c.INN, &c.Banks, &createdBy, &ids, &c.CreatedAt)
		c.CreatedBy = createdBy.String
		if ids.Valid && ids.String != "" {
			_ = json.Unmarshal([]byte(ids.String), &c.FormPaymentIDs)
		}
		out = append(out, c)
	}
	return out, nil
}

func (s *Store) DeleteCounterparty(ctx context.Context, id string) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM counterparties WHERE id=$1`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return apperrors.ErrResourceNotFound
	}
	return nil
}

func (s *Store) SaveComment(ctx context.Context, c domain.Comment) error {
	if c.CreatedAt.IsZero() {
		c.CreatedAt = time.Now().UTC()
	}
	if c.Kind == "" {
		c.Kind = domain.CommentKindExternal
	}
	fileIDs, _ := json.Marshal(c.FileIDs)
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO comments (id, entity_type, entity_id, author_id, body, read, kind, file_ids, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		ON CONFLICT (id) DO UPDATE SET body=EXCLUDED.body, read=EXCLUDED.read, kind=EXCLUDED.kind, file_ids=EXCLUDED.file_ids`,
		c.ID, c.EntityType, c.EntityID, c.AuthorID, c.Body, c.Read, string(c.Kind), string(fileIDs), c.CreatedAt)
	return err
}

func (s *Store) CommentByID(ctx context.Context, id string) (domain.Comment, error) {
	var c domain.Comment
	var kind string
	var fileIDs sql.NullString
	err := s.db.QueryRowContext(ctx, `
		SELECT id, entity_type, entity_id, author_id, body, read, COALESCE(kind,'external'), file_ids, created_at
		FROM comments WHERE id=$1`, id).
		Scan(&c.ID, &c.EntityType, &c.EntityID, &c.AuthorID, &c.Body, &c.Read, &kind, &fileIDs, &c.CreatedAt)
	if err == sql.ErrNoRows {
		return domain.Comment{}, apperrors.ErrResourceNotFound
	}
	c.Kind = domain.CommentKind(kind)
	if fileIDs.Valid && fileIDs.String != "" {
		_ = json.Unmarshal([]byte(fileIDs.String), &c.FileIDs)
	}
	return c, err
}

func (s *Store) ListComments(ctx context.Context, entityType, entityID string) ([]domain.Comment, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, entity_type, entity_id, author_id, body, read, COALESCE(kind,'external'), file_ids, created_at
		FROM comments WHERE entity_type=$1 AND entity_id=$2`, entityType, entityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanComments(rows)
}

func (s *Store) ListAllComments(ctx context.Context) ([]domain.Comment, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, entity_type, entity_id, author_id, body, read, COALESCE(kind,'external'), file_ids, created_at FROM comments`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanComments(rows)
}

func scanComments(rows *sql.Rows) ([]domain.Comment, error) {
	out := make([]domain.Comment, 0)
	for rows.Next() {
		var c domain.Comment
		var kind string
		var fileIDs sql.NullString
		_ = rows.Scan(&c.ID, &c.EntityType, &c.EntityID, &c.AuthorID, &c.Body, &c.Read, &kind, &fileIDs, &c.CreatedAt)
		c.Kind = domain.CommentKind(kind)
		if fileIDs.Valid && fileIDs.String != "" {
			_ = json.Unmarshal([]byte(fileIDs.String), &c.FileIDs)
		}
		out = append(out, c)
	}
	return out, nil
}

func (s *Store) DeleteComment(ctx context.Context, id string) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM comments WHERE id=$1`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return apperrors.ErrResourceNotFound
	}
	return nil
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

func (s *Store) ListFiles(ctx context.Context) ([]domain.FileMeta, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, owner_id, form_id, storage_key, COALESCE(content_type,''), COALESCE(content_hash,''), created_at FROM files`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.FileMeta, 0)
	for rows.Next() {
		var f domain.FileMeta
		var owner, form sql.NullString
		_ = rows.Scan(&f.ID, &owner, &form, &f.StorageKey, &f.ContentType, &f.ContentHash, &f.CreatedAt)
		f.OwnerID = owner.String
		f.FormID = form.String
		out = append(out, f)
	}
	return out, nil
}

func (s *Store) ListAllHistory(ctx context.Context) []formpayment.ComplianceHistoryEntry {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, form_payment_id, actor_id, from_status, to_status, COALESCE(comment,''), created_at
		FROM compliance_history ORDER BY created_at`)
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

func (s *Store) SaveAgent(ctx context.Context, a domain.Agent) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO agents (id, name, inn, active, stamp_file_id, signature_file_id)
		VALUES ($1,$2,$3,$4,$5,$6)
		ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, inn=EXCLUDED.inn, active=EXCLUDED.active,
			stamp_file_id=EXCLUDED.stamp_file_id, signature_file_id=EXCLUDED.signature_file_id`,
		a.ID, a.Name, a.INN, a.Active, nullStr(a.StampID), nullStr(a.SignID))
	return err
}

func (s *Store) AgentByID(ctx context.Context, id string) (domain.Agent, error) {
	var a domain.Agent
	var stamp, sign sql.NullString
	err := s.db.QueryRowContext(ctx, `
		SELECT id, name, COALESCE(inn,''), COALESCE(active,true), stamp_file_id, signature_file_id
		FROM agents WHERE id=$1`, id).Scan(&a.ID, &a.Name, &a.INN, &a.Active, &stamp, &sign)
	if err == sql.ErrNoRows {
		return domain.Agent{}, apperrors.ErrResourceNotFound
	}
	a.StampID = stamp.String
	a.SignID = sign.String
	return a, err
}

func (s *Store) ListAgents(ctx context.Context) ([]domain.Agent, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, name, COALESCE(inn,''), COALESCE(active,true), stamp_file_id, signature_file_id FROM agents`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.Agent, 0)
	for rows.Next() {
		var a domain.Agent
		var stamp, sign sql.NullString
		_ = rows.Scan(&a.ID, &a.Name, &a.INN, &a.Active, &stamp, &sign)
		a.StampID = stamp.String
		a.SignID = sign.String
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
		INSERT INTO liquidity_offers (id, direction, provider_id, form_payment_id, amount, currency, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, amount=EXCLUDED.amount,
			provider_id=EXCLUDED.provider_id, form_payment_id=EXCLUDED.form_payment_id`,
		o.ID, o.Direction, nullStr(o.ProviderID), nullStr(o.FormID), o.Amount, o.Currency, o.Status)
	return err
}

func (s *Store) ListLiquidity(ctx context.Context, direction string) ([]domain.LiquidityOffer, error) {
	q := `SELECT id, direction, provider_id, form_payment_id, COALESCE(amount,''), COALESCE(currency,''), status FROM liquidity_offers`
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
		var provider, formID sql.NullString
		_ = rows.Scan(&o.ID, &o.Direction, &provider, &formID, &o.Amount, &o.Currency, &o.Status)
		o.ProviderID = provider.String
		o.FormID = formID.String
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

func (s *Store) VirtualAccountByID(ctx context.Context, id string) (domain.VirtualAccount, error) {
	var a domain.VirtualAccount
	err := s.db.QueryRowContext(ctx, `SELECT id, account_id, kind, balance, currency FROM virtual_accounts WHERE id=$1`, id).
		Scan(&a.ID, &a.AccountID, &a.Kind, &a.Balance, &a.Currency)
	if err == sql.ErrNoRows {
		return domain.VirtualAccount{}, apperrors.ErrResourceNotFound
	}
	return a, err
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
	if t.UpdatedAt.IsZero() {
		t.UpdatedAt = t.CreatedAt
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO treasurer_tasks (id, form_payment_id, kind, status, amount, currency, assignee_id, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, amount=EXCLUDED.amount, currency=EXCLUDED.currency,
			assignee_id=EXCLUDED.assignee_id, updated_at=EXCLUDED.updated_at`,
		t.ID, t.FormPaymentID, t.Kind, t.Status, nullStr(t.Amount), nullStr(t.Currency), nullStr(t.AssigneeID), t.CreatedAt, t.UpdatedAt)
	return err
}

func (s *Store) ListTreasurerTasks(ctx context.Context) ([]domain.TreasurerTask, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, form_payment_id, kind, status, COALESCE(amount,''), COALESCE(currency,''), assignee_id, created_at, updated_at
		FROM treasurer_tasks`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.TreasurerTask, 0)
	for rows.Next() {
		var t domain.TreasurerTask
		var assignee sql.NullString
		var updated sql.NullTime
		_ = rows.Scan(&t.ID, &t.FormPaymentID, &t.Kind, &t.Status, &t.Amount, &t.Currency, &assignee, &t.CreatedAt, &updated)
		t.AssigneeID = assignee.String
		t.UpdatedAt = updated.Time
		out = append(out, t)
	}
	return out, nil
}

func (s *Store) TreasurerTaskByID(ctx context.Context, id string) (domain.TreasurerTask, error) {
	var t domain.TreasurerTask
	var assignee sql.NullString
	var updated sql.NullTime
	err := s.db.QueryRowContext(ctx, `
		SELECT id, form_payment_id, kind, status, COALESCE(amount,''), COALESCE(currency,''), assignee_id, created_at, updated_at
		FROM treasurer_tasks WHERE id=$1`, id).
		Scan(&t.ID, &t.FormPaymentID, &t.Kind, &t.Status, &t.Amount, &t.Currency, &assignee, &t.CreatedAt, &updated)
	if err == sql.ErrNoRows {
		return domain.TreasurerTask{}, apperrors.ErrResourceNotFound
	}
	t.AssigneeID = assignee.String
	t.UpdatedAt = updated.Time
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

func (s *Store) SaveTemplate(ctx context.Context, t domain.Template) error {
	if t.CreatedAt.IsZero() {
		t.CreatedAt = time.Now().UTC()
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO templates (id, name, direction, mapping_json, file_id, active, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, direction=EXCLUDED.direction,
			mapping_json=EXCLUDED.mapping_json, file_id=EXCLUDED.file_id, active=EXCLUDED.active`,
		t.ID, t.Name, t.Direction, t.MappingJSON, nullStr(t.FileID), t.Active, t.CreatedAt)
	return err
}

func (s *Store) TemplateByID(ctx context.Context, id string) (domain.Template, error) {
	var t domain.Template
	var fileID sql.NullString
	err := s.db.QueryRowContext(ctx, `
		SELECT id, name, direction, mapping_json, file_id, active, created_at FROM templates WHERE id=$1`, id).
		Scan(&t.ID, &t.Name, &t.Direction, &t.MappingJSON, &fileID, &t.Active, &t.CreatedAt)
	if err == sql.ErrNoRows {
		return domain.Template{}, apperrors.ErrResourceNotFound
	}
	t.FileID = fileID.String
	return t, err
}

func (s *Store) ListTemplates(ctx context.Context) ([]domain.Template, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, name, direction, mapping_json, file_id, active, created_at FROM templates`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.Template, 0)
	for rows.Next() {
		var t domain.Template
		var fileID sql.NullString
		_ = rows.Scan(&t.ID, &t.Name, &t.Direction, &t.MappingJSON, &fileID, &t.Active, &t.CreatedAt)
		t.FileID = fileID.String
		out = append(out, t)
	}
	return out, nil
}

func (s *Store) DeleteTemplate(ctx context.Context, id string) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM templates WHERE id=$1`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return apperrors.ErrResourceNotFound
	}
	return nil
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

func clientTypeOr(t domain.ClientType) string {
	if t == "" {
		return string(domain.ClientTypeUI)
	}
	return string(t)
}

func (s *Store) SaveOrder(ctx context.Context, o formpayment.Order) error {
	if o.CreatedAt.IsZero() {
		o.CreatedAt = time.Now().UTC()
	}
	o.UpdatedAt = time.Now().UTC()
	ids, _ := json.Marshal(o.FileIDs)
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO form_orders (
			id, form_payment_id, kind, status, file_ids, rate_value, rate_currency, rate_source,
			fee_amount, fee_percent, fee_currency, invoice_amount, currency, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
		ON CONFLICT (id) DO UPDATE SET
			kind=EXCLUDED.kind, status=EXCLUDED.status, file_ids=EXCLUDED.file_ids,
			rate_value=EXCLUDED.rate_value, rate_currency=EXCLUDED.rate_currency, rate_source=EXCLUDED.rate_source,
			fee_amount=EXCLUDED.fee_amount, fee_percent=EXCLUDED.fee_percent, fee_currency=EXCLUDED.fee_currency,
			invoice_amount=EXCLUDED.invoice_amount, currency=EXCLUDED.currency, updated_at=EXCLUDED.updated_at`,
		o.ID, o.FormPaymentID, string(o.Kind), string(o.Status), string(ids),
		o.Rate.Value, o.Rate.Currency, o.Rate.Source,
		o.Commission.FeeAmount, o.Commission.FeePercent, o.Commission.FeeCurrency,
		o.InvoiceAmount, o.Currency, o.CreatedAt, o.UpdatedAt)
	return err
}

func (s *Store) OrderByID(ctx context.Context, id string) (formpayment.Order, error) {
	var o formpayment.Order
	var kind, status string
	var ids sql.NullString
	err := s.db.QueryRowContext(ctx, `
		SELECT id, form_payment_id, kind, status, file_ids,
			COALESCE(rate_value,''), COALESCE(rate_currency,''), COALESCE(rate_source,''),
			COALESCE(fee_amount,''), COALESCE(fee_percent,''), COALESCE(fee_currency,''),
			COALESCE(invoice_amount,''), COALESCE(currency,''), created_at, updated_at
		FROM form_orders WHERE id=$1`, id).Scan(
		&o.ID, &o.FormPaymentID, &kind, &status, &ids,
		&o.Rate.Value, &o.Rate.Currency, &o.Rate.Source,
		&o.Commission.FeeAmount, &o.Commission.FeePercent, &o.Commission.FeeCurrency,
		&o.InvoiceAmount, &o.Currency, &o.CreatedAt, &o.UpdatedAt)
	if err == sql.ErrNoRows {
		return formpayment.Order{}, apperrors.ErrResourceNotFound
	}
	if err != nil {
		return formpayment.Order{}, err
	}
	o.Kind = formpayment.OrderKind(kind)
	o.Status = formpayment.Status(status)
	if ids.Valid && ids.String != "" {
		_ = json.Unmarshal([]byte(ids.String), &o.FileIDs)
	}
	return o, nil
}

func (s *Store) ListOrdersByForm(ctx context.Context, formID string) ([]formpayment.Order, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id FROM form_orders WHERE form_payment_id=$1`, formID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]formpayment.Order, 0)
	for rows.Next() {
		var id string
		_ = rows.Scan(&id)
		o, err := s.OrderByID(ctx, id)
		if err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	return out, nil
}

func (s *Store) SaveBankIdempotency(ctx context.Context, scope, key, formID string) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO bank_idempotency (scope, idem_key, form_payment_id) VALUES ($1,$2,$3)
		ON CONFLICT (scope, idem_key) DO NOTHING`, scope, key, formID)
	return err
}

func (s *Store) FormIDByBankIdempotency(ctx context.Context, scope, key string) (string, error) {
	var id string
	err := s.db.QueryRowContext(ctx, `SELECT form_payment_id FROM bank_idempotency WHERE scope=$1 AND idem_key=$2`, scope, key).Scan(&id)
	if err == sql.ErrNoRows {
		return "", apperrors.ErrResourceNotFound
	}
	return id, err
}
