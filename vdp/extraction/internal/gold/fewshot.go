package gold

import (
	"sort"

	"github.com/viletech/vdp/shared/extraction"
)

// RecentConfirmed returns up to k confirmed gold rows with line_items (deterministic order).
func (s *Store) RecentConfirmed(k int) ([]extraction.GoldRecord, error) {
	if k <= 0 {
		return nil, nil
	}
	recs, err := s.List()
	if err != nil {
		return nil, err
	}
	var confirmed []extraction.GoldRecord
	for _, r := range recs {
		if r.HumanOut == nil || len(r.HumanOut.LineItems) == 0 {
			continue
		}
		confirmed = append(confirmed, r)
	}
	sort.SliceStable(confirmed, func(i, j int) bool {
		ti := confirmed[i].UpdatedAt
		if ti.IsZero() {
			ti = confirmed[i].CreatedAt
		}
		tj := confirmed[j].UpdatedAt
		if tj.IsZero() {
			tj = confirmed[j].CreatedAt
		}
		if !ti.Equal(tj) {
			return ti.After(tj)
		}
		return confirmed[i].GoldID > confirmed[j].GoldID
	})
	if len(confirmed) > k {
		confirmed = confirmed[:k]
	}
	return confirmed, nil
}
