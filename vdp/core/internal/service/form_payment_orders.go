package service

import (
	"context"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

func (s *FormPaymentService) ListOrders(ctx context.Context, principal authz.Principal, formID string) ([]formpayment.Order, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return nil, err
	}
	_ = form
	return s.store.ListOrdersByForm(ctx, formID)
}

func (s *FormPaymentService) GetActiveOrder(ctx context.Context, principal authz.Principal, formID string) (formpayment.Order, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Order{}, err
	}
	if form.ActiveOrderID == "" {
		return formpayment.Order{}, apperrors.ErrResourceNotFound
	}
	return s.store.OrderByID(ctx, form.ActiveOrderID)
}

func (s *FormPaymentService) GetProviderView(ctx context.Context, principal authz.Principal, formID string) (formpayment.ProviderView, error) {
	if err := authz.RequireRoles(principal, domain.RoleProvider, domain.RoleSeniorProvider); err != nil {
		return formpayment.ProviderView{}, err
	}
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.ProviderView{}, err
	}
	var order *formpayment.Order
	if form.ActiveOrderID != "" {
		if o, err := s.store.OrderByID(ctx, form.ActiveOrderID); err == nil {
			order = &o
		}
	}
	return formpayment.ProjectForProviderWithOrder(form, order), nil
}

// AttachOrderFile links a signed instruction file to the order matching form status kind.
func (s *FormPaymentService) AttachOrderFile(ctx context.Context, principal authz.Principal, formID, fileID string) (formpayment.Order, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Order{}, err
	}
	orders, err := s.store.ListOrdersByForm(ctx, formID)
	if err != nil {
		return formpayment.Order{}, err
	}
	var target *formpayment.Order
	for i := range orders {
		o := &orders[i]
		if form.ActiveOrderID != "" && o.ID == form.ActiveOrderID {
			target = o
			break
		}
		if isAdvanceStatus(form.Status) && o.Kind == formpayment.OrderKindAdvance && o.Status == form.Status {
			target = o
		}
		if isMainOrderStatus(form.Status) && o.Kind == formpayment.OrderKindMain && o.Status == form.Status {
			target = o
		}
	}
	if target == nil && len(orders) > 0 {
		target = &orders[len(orders)-1]
	}
	if target == nil {
		return formpayment.Order{}, apperrors.New(apperrors.ErrCodeValidation, "no order to attach file")
	}
	target.FileIDs = append(target.FileIDs, fileID)
	target.UpdatedAt = time.Now().UTC()
	return *target, s.store.SaveOrder(ctx, *target)
}

func (s *FormPaymentService) syncOrdersAfterTransition(ctx context.Context, before, next formpayment.Form, action formpayment.Action) error {
	now := time.Now().UTC()
	switch action {
	case formpayment.ActionOrderSigning:
		return s.ensureOrder(ctx, next, formpayment.OrderKindMain, next.Status, now)
	case formpayment.ActionUserUploadOrder, formpayment.ActionOrderStart, formpayment.ActionOrderStop,
		formpayment.ActionOrderReject:
		return s.updateLatestOrderStatus(ctx, next.ID, formpayment.OrderKindMain, next.Status)
	case formpayment.ActionOrderAccept:
		if err := s.updateLatestOrderStatus(ctx, next.ID, formpayment.OrderKindMain, next.Status); err != nil {
			return err
		}
		return s.setActiveLatest(ctx, next, formpayment.OrderKindMain)
	case formpayment.ActionAdvanceSigning:
		return s.ensureOrder(ctx, next, formpayment.OrderKindAdvance, next.Status, now)
	case formpayment.ActionAdvanceUserUpload, formpayment.ActionAdvanceStart, formpayment.ActionAdvanceStop,
		formpayment.ActionAdvanceReject, formpayment.ActionAdvanceRevoke:
		return s.updateLatestOrderStatus(ctx, next.ID, formpayment.OrderKindAdvance, next.Status)
	case formpayment.ActionAdvanceAccept:
		if err := s.updateLatestOrderStatus(ctx, next.ID, formpayment.OrderKindAdvance, next.Status); err != nil {
			return err
		}
		return s.setActiveLatest(ctx, next, formpayment.OrderKindAdvance)
	default:
		return nil
	}
}

func (s *FormPaymentService) ensureOrder(ctx context.Context, form formpayment.Form, kind formpayment.OrderKind, status formpayment.Status, now time.Time) error {
	orders, err := s.store.ListOrdersByForm(ctx, form.ID)
	if err != nil {
		return err
	}
	for _, o := range orders {
		if o.Kind == kind && !isTerminalOrder(o.Status) {
			o.Status = status
			o.Rate = form.Rate
			o.Commission = form.Commission
			o.InvoiceAmount = form.InvoiceAmount
			o.Currency = form.Currency
			o.UpdatedAt = now
			return s.store.SaveOrder(ctx, o)
		}
	}
	o := formpayment.Order{
		ID: s.newID(), FormPaymentID: form.ID, Kind: kind, Status: status,
		Rate: form.Rate, Commission: form.Commission,
		InvoiceAmount: form.InvoiceAmount, Currency: form.Currency,
		FileIDs: []string{}, CreatedAt: now, UpdatedAt: now,
	}
	if err := s.store.SaveOrder(ctx, o); err != nil {
		return err
	}
	if kind == formpayment.OrderKindMain && form.ActiveOrderID == "" {
		form.ActiveOrderID = o.ID
		_ = s.store.SaveForm(ctx, form)
	}
	return nil
}

func (s *FormPaymentService) updateLatestOrderStatus(ctx context.Context, formID string, kind formpayment.OrderKind, status formpayment.Status) error {
	orders, err := s.store.ListOrdersByForm(ctx, formID)
	if err != nil {
		return err
	}
	var latest *formpayment.Order
	for i := range orders {
		o := &orders[i]
		if o.Kind != kind {
			continue
		}
		if latest == nil || o.CreatedAt.After(latest.CreatedAt) {
			latest = o
		}
	}
	if latest == nil {
		return nil
	}
	latest.Status = status
	latest.UpdatedAt = time.Now().UTC()
	return s.store.SaveOrder(ctx, *latest)
}

func (s *FormPaymentService) setActiveLatest(ctx context.Context, form formpayment.Form, kind formpayment.OrderKind) error {
	orders, err := s.store.ListOrdersByForm(ctx, form.ID)
	if err != nil {
		return err
	}
	var latest *formpayment.Order
	for i := range orders {
		o := &orders[i]
		if o.Kind != kind {
			continue
		}
		if latest == nil || o.CreatedAt.After(latest.CreatedAt) {
			latest = o
		}
	}
	if latest == nil {
		return nil
	}
	form.ActiveOrderID = latest.ID
	form.UpdatedAt = time.Now().UTC()
	return s.store.SaveForm(ctx, form)
}

func isTerminalOrder(st formpayment.Status) bool {
	switch st {
	case formpayment.StatusSigningOrderAccepted, formpayment.StatusAdvanceSigningOrderAccepted:
		return true
	default:
		return false
	}
}

func isAdvanceStatus(st formpayment.Status) bool {
	switch st {
	case formpayment.StatusAdvanceSigningOrder, formpayment.StatusAdvanceSigningOrderWaitingVerification,
		formpayment.StatusAdvanceSigningOrderVerification, formpayment.StatusAdvanceSigningOrderWaitingCorrections,
		formpayment.StatusAdvanceSigningOrderAccepted:
		return true
	default:
		return false
	}
}

func isMainOrderStatus(st formpayment.Status) bool {
	switch st {
	case formpayment.StatusSigningOrder, formpayment.StatusSigningOrderWaitingVerification,
		formpayment.StatusSigningOrderVerification, formpayment.StatusSigningOrderWaitingCorrections,
		formpayment.StatusSigningOrderAccepted:
		return true
	default:
		return false
	}
}
