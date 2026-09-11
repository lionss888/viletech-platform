package comms

import "strings"

// Accepted is a short ack without tech.
func Accepted() string {
	return SanitizeManager("принято")
}

// Clarify asks exactly one manager-facing question.
func Clarify(question string) string {
	q := strings.TrimSpace(question)
	if q == "" {
		q = "Уточните, пожалуйста, одним предложением: это ошибка, доработка, вопрос по удобству или проверка связи?"
	}
	return SanitizeManager("принято\n\n" + q)
}

// ConflictWarn reports a contradiction in plain language and optionally one question.
func ConflictWarn(plain string, question string) string {
	var b strings.Builder
	b.WriteString("принято\n\n")
	b.WriteString("Вижу противоречие: ")
	b.WriteString(strings.TrimSpace(plain))
	if strings.TrimSpace(question) != "" {
		b.WriteString("\n\n")
		b.WriteString(strings.TrimSpace(question))
	}
	return SanitizeManager(b.String())
}

// Proposal shows proposal + timeline only (no fake “execute?” CTA).
func Proposal(summary, timelinePhrase string) string {
	var b strings.Builder
	b.WriteString("принято\n\n")
	b.WriteString("Предложение: ")
	b.WriteString(strings.TrimSpace(summary))
	b.WriteString("\nОриентир по сроку: ")
	b.WriteString(strings.TrimSpace(timelinePhrase))
	return SanitizeManager(b.String())
}

// ApprovedAck confirms without starting work details.
func ApprovedAck() string {
	return SanitizeManager("Спасибо, зафиксировали согласие. Дальше продолжит команда разработки — сообщим о ходе отдельно.")
}

// DeclinedAck confirms decline.
func DeclinedAck() string {
	return SanitizeManager("Поняли, выполнение не запускаем. Если передумаете — напишите снова с отметкой бота.")
}

// Reminder soft-nudges without spam or tech.
func Reminder() string {
	return SanitizeManager("Напоминаю: по прошлому предложению ещё нет ответа. Можете коротко написать, актуально ли оно.")
}

// StaleNotice closes the waiting loop politely.
func StaleNotice() string {
	return SanitizeManager("Отложили этот запрос. Когда будете готовы продолжить — отметьте бота в новом сообщении.")
}

// StatusLine is a short business status.
func StatusLine(text string) string {
	return SanitizeManager(text)
}

// ManagerDone formats a product-facing completion notice for the management chat.
// Strips tech jargon via SanitizeManager (no plan-id, org-gate, runner names).
func ManagerDone(title string, bullets []string, next string) string {
	title = strings.TrimSpace(title)
	if title == "" {
		title = "Готово"
	}
	var b strings.Builder
	b.WriteString("Готово · ")
	b.WriteString(title)
	for _, line := range bullets {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		b.WriteString("\n• ")
		b.WriteString(line)
	}
	b.WriteString("\nПриёмка: пройдена")
	if strings.TrimSpace(next) != "" {
		b.WriteString("\nДальше: ")
		b.WriteString(strings.TrimSpace(next))
	}
	return SanitizeManager(b.String())
}
