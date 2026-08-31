package service

import (
	"context"

	"github.com/viletech/vdp/core/internal/domain/formpayment"
)

// docsAttachAdapter adapts FormPaymentService to DocsResultHandler.
type docsAttachAdapter struct {
	forms *FormPaymentService
}

func NewDocsAttachAdapter(forms *FormPaymentService) DocsResultHandler {
	return &docsAttachAdapter{forms: forms}
}

func (a *docsAttachAdapter) ApplyDocsGenerateResult(ctx context.Context, formID string, result map[string]any) error {
	_, err := a.forms.ApplyDocsGenerateResult(ctx, formID, result)
	return err
}

// Ensure FormPaymentService method signature used by adapter.
var _ = formpayment.Form{}
