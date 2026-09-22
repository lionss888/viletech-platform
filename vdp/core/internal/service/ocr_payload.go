package service

import (
	"context"
	"encoding/base64"
	"strings"

	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/storage"
)

const maxOCRPayloadBytes = 12 * 1024 * 1024

// BuildOCRPayload adds document bytes for hub→extraction recognize.
// Prefers the first invoice-kind attach; otherwise the first attached file.
func BuildOCRPayload(
	ctx context.Context,
	store repository.Store,
	blobs storage.BlobStore,
	form formpayment.Form,
	base map[string]any,
) map[string]any {
	out := map[string]any{}
	for k, v := range base {
		out[k] = v
	}
	if blobs == nil || store == nil {
		return out
	}
	refs := formpayment.ParseDocRefs(form.DocsJSON)
	if len(refs) == 0 {
		return out
	}
	chosen := refs[0]
	for _, ref := range refs {
		if strings.EqualFold(ref.Kind, "invoice") {
			chosen = ref
			break
		}
	}
	meta, err := store.FileByID(ctx, chosen.FileID)
	if err != nil {
		return out
	}
	fileName := chosen.Label
	if fileName == "" {
		fileName = meta.StorageKey
	}
	out["file_name"] = fileName
	if meta.ContentType != "" {
		out["mime"] = meta.ContentType
	}
	_, data, err := blobs.Get(ctx, meta.StorageKey)
	if err != nil || len(data) == 0 {
		return out
	}
	if len(data) > maxOCRPayloadBytes {
		data = data[:maxOCRPayloadBytes]
		out["truncated"] = true
	}
	out["content_base64"] = base64.StdEncoding.EncodeToString(data)
	return out
}
