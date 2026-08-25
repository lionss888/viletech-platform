/**
 * Jest Configuration for Real Tests
 * 
 * Конфигурация для тестов, которые отвечают на вопрос "работает ли приложение?"
 * Запускаются при каждой сборке.
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  
  // Только реальные тесты (smoke, health, db-integration, api-e2e)
  testMatch: [
    '<rootDir>/test/smoke/**/*.spec.ts',
    '<rootDir>/test/health/**/*.spec.ts',
    '<rootDir>/test/db-integration/**/*.spec.ts',
    '<rootDir>/test/api-e2e/**/*.spec.ts',
    '<rootDir>/test/mocks/**/*.spec.ts',
  ],
  
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^lib/(.*)$': '<rootDir>/src/lib/$1',
    '^modules/(.*)$': '<rootDir>/src/modules/$1',
  },
  
  // Увеличенный таймаут для интеграционных тестов
  testTimeout: 60000,
  
  // Последовательное выполнение для стабильности
  maxWorkers: 1,
  
  // Подробный вывод
  verbose: true,
  
  // Покрытие
  collectCoverageFrom: [
    'src/modules/diadoc/**/*.ts',
    '!src/modules/diadoc/**/*.spec.ts',
    '!src/modules/diadoc/**/*.interface.ts',
    '!src/modules/diadoc/**/*.dto.ts',
  ],
  
  coverageDirectory: './coverage/real-tests',
  
  // Очистка моков между тестами
  clearMocks: true,
  restoreMocks: true,
};
