package logger

import (
	"os"

	"github.com/sirupsen/logrus"
)

// Logger интерфейс для логирования
type Logger interface {
	Debug(args ...interface{})
	Info(args ...interface{})
	Warn(args ...interface{})
	Error(args ...interface{})
	Fatal(args ...interface{})
	Debugf(format string, args ...interface{})
	Infof(format string, args ...interface{})
	Warnf(format string, args ...interface{})
	Errorf(format string, args ...interface{})
	Fatalf(format string, args ...interface{})
	WithField(key string, value interface{}) Logger
	WithFields(fields map[string]interface{}) Logger
}

// logrusLogger реализация Logger с использованием logrus
type logrusLogger struct {
	entry *logrus.Entry
}

// New создает новый логгер
func New(level string) Logger {
	log := logrus.New()

	// Настраиваем формат вывода
	log.SetFormatter(&logrus.JSONFormatter{
		TimestampFormat: "2006-01-02 15:04:05",
	})

	// Настраиваем уровень логирования
	switch level {
	case "debug":
		log.SetLevel(logrus.DebugLevel)
	case "info":
		log.SetLevel(logrus.InfoLevel)
	case "warn":
		log.SetLevel(logrus.WarnLevel)
	case "error":
		log.SetLevel(logrus.ErrorLevel)
	default:
		log.SetLevel(logrus.InfoLevel)
	}

	// Устанавливаем вывод в stdout
	log.SetOutput(os.Stdout)

	return &logrusLogger{entry: logrus.NewEntry(log)}
}

// Debug логирует сообщение уровня Debug
func (l *logrusLogger) Debug(args ...interface{}) {
	l.entry.Debug(args...)
}

// Info логирует сообщение уровня Info
func (l *logrusLogger) Info(args ...interface{}) {
	l.entry.Info(args...)
}

// Warn логирует сообщение уровня Warn
func (l *logrusLogger) Warn(args ...interface{}) {
	l.entry.Warn(args...)
}

// Error логирует сообщение уровня Error
func (l *logrusLogger) Error(args ...interface{}) {
	l.entry.Error(args...)
}

// Fatal логирует сообщение уровня Fatal и завершает программу
func (l *logrusLogger) Fatal(args ...interface{}) {
	l.entry.Fatal(args...)
}

// Debugf логирует форматированное сообщение уровня Debug
func (l *logrusLogger) Debugf(format string, args ...interface{}) {
	l.entry.Debugf(format, args...)
}

// Infof логирует форматированное сообщение уровня Info
func (l *logrusLogger) Infof(format string, args ...interface{}) {
	l.entry.Infof(format, args...)
}

// Warnf логирует форматированное сообщение уровня Warn
func (l *logrusLogger) Warnf(format string, args ...interface{}) {
	l.entry.Warnf(format, args...)
}

// Errorf логирует форматированное сообщение уровня Error
func (l *logrusLogger) Errorf(format string, args ...interface{}) {
	l.entry.Errorf(format, args...)
}

// Fatalf логирует форматированное сообщение уровня Fatal и завершает программу
func (l *logrusLogger) Fatalf(format string, args ...interface{}) {
	l.entry.Fatalf(format, args...)
}

// WithField добавляет поле к логгеру
func (l *logrusLogger) WithField(key string, value interface{}) Logger {
	return &logrusLogger{entry: l.entry.WithField(key, value)}
}

// WithFields добавляет поля к логгеру
func (l *logrusLogger) WithFields(fields map[string]interface{}) Logger {
	return &logrusLogger{entry: l.entry.WithFields(fields)}
}
