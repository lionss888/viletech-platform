package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"io"
	"strings"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/export"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

// TemplateMapping describes Excel/CSV column → form fields.
type TemplateMapping struct {
	AmountColumn    string `json:"amount_column"`
	CurrencyColumn  string `json:"currency_column"`
	DirectionColumn string `json:"direction_column"`
	ContractColumn  string `json:"contract_column"`
	DateColumn      string `json:"date_column"`
	HasHeader       bool   `json:"has_header"`
	Delimiter       string `json:"delimiter"` // "," or "\t"
}

func (s *CatalogService) SaveTemplate(ctx context.Context, principal authz.Principal, t domain.Template) (domain.Template, error) {
	if err := authz.RequireRoles(principal, domain.RoleRoot, domain.RoleManager); err != nil {
		return domain.Template{}, err
	}
	if t.ID == "" {
		t.ID = s.newID()
	}
	if t.Direction == "" {
		t.Direction = "import"
	}
	if t.MappingJSON == "" {
		t.MappingJSON = `{"amount_column":"amount","currency_column":"currency","has_header":true,"delimiter":","}`
	}
	t.Active = true
	if t.CreatedAt.IsZero() {
		t.CreatedAt = time.Now().UTC()
	}
	return t, s.store.SaveTemplate(ctx, t)
}

func (s *CatalogService) ListTemplates(ctx context.Context) ([]domain.Template, error) {
	return s.store.ListTemplates(ctx)
}

func (s *CatalogService) GetTemplate(ctx context.Context, id string) (domain.Template, error) {
	return s.store.TemplateByID(ctx, id)
}

func (s *CatalogService) DeleteTemplate(ctx context.Context, principal authz.Principal, id string) error {
	if err := authz.RequireRoles(principal, domain.RoleRoot); err != nil {
		return err
	}
	return s.store.DeleteTemplate(ctx, id)
}

func (s *CatalogService) UpdateTemplate(ctx context.Context, principal authz.Principal, id string, patch domain.Template) (domain.Template, error) {
	if err := authz.RequireRoles(principal, domain.RoleRoot, domain.RoleManager); err != nil {
		return domain.Template{}, err
	}
	cur, err := s.store.TemplateByID(ctx, id)
	if err != nil {
		return domain.Template{}, err
	}
	if patch.Name != "" {
		cur.Name = patch.Name
	}
	if patch.Direction != "" {
		cur.Direction = patch.Direction
	}
	if patch.MappingJSON != "" {
		cur.MappingJSON = patch.MappingJSON
	}
	if patch.FileID != "" {
		cur.FileID = patch.FileID
	}
	return cur, s.store.SaveTemplate(ctx, cur)
}

// ImportExcelRows parses CSV/TSV (Excel export) via template mapping → forms CREATING→DRAFT.
func (s *FormPaymentService) ImportExcelWithTemplate(ctx context.Context, principal authz.Principal, templateID string, content []byte) ([]formpayment.Form, error) {
	if err := authz.RequireRoles(principal, domain.RoleUser, domain.RoleManager, domain.RoleRoot); err != nil {
		return nil, err
	}
	tpl, err := s.store.TemplateByID(ctx, templateID)
	if err != nil {
		return nil, err
	}
	if !tpl.Active {
		return nil, apperrors.New(apperrors.ErrCodeValidation, "template inactive")
	}
	var mapping TemplateMapping
	_ = json.Unmarshal([]byte(tpl.MappingJSON), &mapping)
	rows, err := parseDelimitedRows(content, mapping)
	if err != nil {
		return nil, apperrors.New(apperrors.ErrCodeValidation, err.Error())
	}
	out := make([]formpayment.Form, 0, len(rows))
	for _, row := range rows {
		dir := formpayment.DirectionImport
		if tpl.Direction == "export" || strings.EqualFold(row["direction"], "export") {
			dir = formpayment.DirectionExport
		}
		form, err := s.Create(ctx, principal, CreateInput{
			Direction:      dir,
			InvoiceAmount:  row["amount"],
			Currency:       row["currency"],
			ContractNumber: row["contract"],
			ContractDate:   row["date"],
		})
		actor := principal
		if err != nil {
			if principal.Role != domain.RoleUser {
				actor = authz.Principal{AccountID: principal.AccountID, Role: domain.RoleUser, OrganizationID: principal.OrganizationID}
				if actor.OrganizationID == "" {
					actor.OrganizationID = formOrgFallback(ctx, s)
				}
				form, err = s.Create(ctx, actor, CreateInput{
					Direction: dir, InvoiceAmount: row["amount"], Currency: row["currency"],
					ContractNumber: row["contract"], ContractDate: row["date"],
				})
			}
			if err != nil {
				return nil, err
			}
		} else if principal.Role != domain.RoleUser {
			actor = authz.Principal{AccountID: form.AccountID, Role: domain.RoleUser, OrganizationID: form.OrganizationID}
		}
		form, err = s.Transition(ctx, actor, form.ID, formpayment.ActionRecognizeComplete)
		if err != nil {
			return nil, err
		}
		out = append(out, form)
	}
	return out, nil
}

func formOrgFallback(ctx context.Context, s *FormPaymentService) string {
	orgs, err := s.store.ListOrganizations(ctx)
	if err != nil || len(orgs) == 0 {
		return ""
	}
	return orgs[0].ID
}

func parseDelimitedRows(content []byte, mapping TemplateMapping) ([]map[string]string, error) {
	content = bytes.TrimPrefix(content, []byte{0xEF, 0xBB, 0xBF})
	if bytes.HasPrefix(content, []byte("PK")) {
		sheet, err := export.ParseSheetRows(content)
		if err != nil {
			return nil, err
		}
		return mapSheetRows(sheet, mapping)
	}
	delim := ','
	if mapping.Delimiter == "\t" || mapping.Delimiter == "tab" {
		delim = '\t'
	}
	r := csv.NewReader(bytes.NewReader(content))
	r.Comma = delim
	r.TrimLeadingSpace = true
	r.FieldsPerRecord = -1
	records, err := r.ReadAll()
	if err != nil && err != io.EOF {
		return nil, err
	}
	return mapSheetRows(records, mapping)
}

func mapSheetRows(records [][]string, mapping TemplateMapping) ([]map[string]string, error) {
	if len(records) == 0 {
		return nil, apperrors.New(apperrors.ErrCodeValidation, "empty spreadsheet")
	}
	start := 0
	headers := map[string]int{}
	if mapping.HasHeader || looksLikeHeader(records[0]) {
		for i, h := range records[0] {
			headers[strings.ToLower(strings.TrimSpace(h))] = i
		}
		start = 1
	}
	amountKey := strings.ToLower(defaultCol(mapping.AmountColumn, "amount"))
	currencyKey := strings.ToLower(defaultCol(mapping.CurrencyColumn, "currency"))
	dirKey := strings.ToLower(defaultCol(mapping.DirectionColumn, "direction"))
	contractKey := strings.ToLower(defaultCol(mapping.ContractColumn, "contract"))
	dateKey := strings.ToLower(defaultCol(mapping.DateColumn, "date"))
	out := make([]map[string]string, 0)
	for _, rec := range records[start:] {
		if len(rec) == 0 || allBlank(rec) {
			continue
		}
		get := func(key string, fallbackIdx int) string {
			if idx, ok := headers[key]; ok && idx < len(rec) {
				return strings.TrimSpace(rec[idx])
			}
			if fallbackIdx < len(rec) {
				return strings.TrimSpace(rec[fallbackIdx])
			}
			return ""
		}
		row := map[string]string{
			"amount":    get(amountKey, 0),
			"currency":  get(currencyKey, 1),
			"direction": get(dirKey, 2),
			"contract":  get(contractKey, 3),
			"date":      get(dateKey, 4),
		}
		if row["amount"] == "" {
			continue
		}
		if row["currency"] == "" {
			row["currency"] = "USD"
		}
		out = append(out, row)
	}
	return out, nil
}

func defaultCol(v, d string) string {
	if v == "" {
		return d
	}
	return v
}

func looksLikeHeader(row []string) bool {
	joined := strings.ToLower(strings.Join(row, " "))
	return strings.Contains(joined, "amount") || strings.Contains(joined, "currency")
}

func allBlank(row []string) bool {
	for _, c := range row {
		if strings.TrimSpace(c) != "" {
			return false
		}
	}
	return true
}
