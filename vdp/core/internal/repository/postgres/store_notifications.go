package postgres

import (
	"context"
	"database/sql"
	"time"

	"github.com/viletech/vdp/core/internal/domain"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

func (s *Store) AccountByTelegramChatID(ctx context.Context, chatID string) (domain.Account, error) {
	if chatID == "" {
		return domain.Account{}, apperrors.ErrResourceNotFound
	}
	var id string
	err := s.db.QueryRowContext(ctx, `SELECT id FROM accounts WHERE telegram_chat_id=$1`, chatID).Scan(&id)
	if err == sql.ErrNoRows {
		return domain.Account{}, apperrors.ErrResourceNotFound
	}
	if err != nil {
		return domain.Account{}, err
	}
	return s.AccountByID(ctx, id)
}

func (s *Store) SaveWorkChat(ctx context.Context, chat domain.WorkChat) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO work_chats (id, title, chat_id, kind, active) VALUES ($1,$2,$3,$4,$5)
		ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, chat_id=EXCLUDED.chat_id, kind=EXCLUDED.kind, active=EXCLUDED.active`,
		chat.ID, chat.Title, chat.ChatID, chat.Kind, chat.Active)
	return err
}

func (s *Store) WorkChatByID(ctx context.Context, id string) (domain.WorkChat, error) {
	var c domain.WorkChat
	err := s.db.QueryRowContext(ctx, `SELECT id, title, chat_id, kind, active FROM work_chats WHERE id=$1`, id).
		Scan(&c.ID, &c.Title, &c.ChatID, &c.Kind, &c.Active)
	if err == sql.ErrNoRows {
		return domain.WorkChat{}, apperrors.ErrResourceNotFound
	}
	return c, err
}

func (s *Store) ListWorkChats(ctx context.Context) ([]domain.WorkChat, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, title, chat_id, kind, active FROM work_chats`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.WorkChat, 0)
	for rows.Next() {
		var c domain.WorkChat
		if err := rows.Scan(&c.ID, &c.Title, &c.ChatID, &c.Kind, &c.Active); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) SaveChatJoin(ctx context.Context, join domain.ChatJoin) error {
	if join.CreatedAt.IsZero() {
		join.CreatedAt = time.Now().UTC()
	}
	join.UpdatedAt = time.Now().UTC()
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO chat_join_requests (id, chat_id, account_id, status, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6)
		ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, updated_at=EXCLUDED.updated_at`,
		join.ID, join.ChatID, join.AccountID, string(join.Status), join.CreatedAt, join.UpdatedAt)
	return err
}

func (s *Store) ChatJoinByID(ctx context.Context, id string) (domain.ChatJoin, error) {
	var j domain.ChatJoin
	var status string
	err := s.db.QueryRowContext(ctx, `
		SELECT id, chat_id, account_id, status, created_at, updated_at FROM chat_join_requests WHERE id=$1`, id).
		Scan(&j.ID, &j.ChatID, &j.AccountID, &status, &j.CreatedAt, &j.UpdatedAt)
	if err == sql.ErrNoRows {
		return domain.ChatJoin{}, apperrors.ErrResourceNotFound
	}
	if err != nil {
		return domain.ChatJoin{}, err
	}
	j.Status = domain.JoinStatus(status)
	return j, nil
}

func (s *Store) ChatJoinByAccountChat(ctx context.Context, accountID, chatID string) (domain.ChatJoin, error) {
	var id string
	err := s.db.QueryRowContext(ctx, `SELECT id FROM chat_join_requests WHERE account_id=$1 AND chat_id=$2`, accountID, chatID).Scan(&id)
	if err == sql.ErrNoRows {
		return domain.ChatJoin{}, apperrors.ErrResourceNotFound
	}
	if err != nil {
		return domain.ChatJoin{}, err
	}
	return s.ChatJoinByID(ctx, id)
}

func (s *Store) ListChatJoins(ctx context.Context, status domain.JoinStatus) ([]domain.ChatJoin, error) {
	q := `SELECT id FROM chat_join_requests`
	args := []any{}
	if status != "" {
		q += ` WHERE status=$1`
		args = append(args, string(status))
	}
	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.ChatJoin, 0)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		j, err := s.ChatJoinByID(ctx, id)
		if err != nil {
			return nil, err
		}
		out = append(out, j)
	}
	return out, rows.Err()
}

func (s *Store) SaveTelegramLink(ctx context.Context, link domain.TelegramLinkCode) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO telegram_link_codes (code, account_id, expires_at) VALUES ($1,$2,$3)
		ON CONFLICT (code) DO UPDATE SET account_id=EXCLUDED.account_id, expires_at=EXCLUDED.expires_at`,
		link.Code, link.AccountID, link.ExpiresAt)
	return err
}

func (s *Store) TelegramLinkByCode(ctx context.Context, code string) (domain.TelegramLinkCode, error) {
	var l domain.TelegramLinkCode
	err := s.db.QueryRowContext(ctx, `SELECT code, account_id, expires_at FROM telegram_link_codes WHERE code=$1`, code).
		Scan(&l.Code, &l.AccountID, &l.ExpiresAt)
	if err == sql.ErrNoRows {
		return domain.TelegramLinkCode{}, apperrors.ErrResourceNotFound
	}
	return l, err
}

func (s *Store) DeleteTelegramLink(ctx context.Context, code string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM telegram_link_codes WHERE code=$1`, code)
	return err
}
