#!/usr/bin/env node

/**
 * Скрипт для автоматической проверки API
 * - Статический анализ контроллеров (поиск всех endpoints)
 * - Проверка доступности Swagger (если сервер запущен)
 * - Генерация отчета о найденных endpoints
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Конфигурация
const CONFIG = {
  serviceName: 'fea360',
  version: '1.0',
  defaultPort: 30000,
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 30000}`,
  srcPath: path.join(__dirname, '../src/modules'),
  outputFile: path.join(__dirname, '../api-endpoints-report.json'),
  outputMarkdown: path.join(__dirname, '../api-endpoints-report.md'),
};

// Результаты анализа
const results = {
  controllers: [],
  endpoints: [],
  swagger: {
    available: false,
    main: null,
    oneC: null,
    error: null,
  },
  stats: {
    totalControllers: 0,
    totalEndpoints: 0,
    byMethod: {},
    byModule: {},
  },
};

/**
 * Поиск всех TypeScript файлов в директории
 */
function findTSFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findTSFiles(filePath, fileList);
    } else if (file.endsWith('.ts') && !file.endsWith('.spec.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Извлечение информации о контроллере из файла
 */
function parseController(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(path.join(__dirname, '../src'), filePath);

  // Проверка, что это контроллер
  if (!content.includes('@Controller')) {
    return null;
  }

  const controller = {
    file: relativePath,
    path: filePath,
    name: null,
    route: null,
    module: extractModule(filePath),
    endpoints: [],
    apiTags: extractApiTags(content),
  };

  // Извлечение имени класса контроллера
  const classMatch = content.match(/export\s+class\s+(\w+Controller)/);
  if (classMatch) {
    controller.name = classMatch[1];
  }

  // Извлечение базового маршрута из @Controller('route')
  const controllerMatch = content.match(/@Controller\(['"]([^'"]+)['"]\)/);
  if (controllerMatch) {
    controller.route = controllerMatch[1];
  } else if (content.includes('@Controller()')) {
    controller.route = '';
  }

  // Извлечение HTTP методов и их маршрутов
  const httpMethods = ['Get', 'Post', 'Put', 'Patch', 'Delete', 'Options', 'Head', 'All'];
  httpMethods.forEach((method) => {
    const regex = new RegExp(`@${method}\\((['"]?)([^'")]*)\\1\\)`, 'g');
    let match;
    while ((match = regex.exec(content)) !== null) {
      const route = match[2] || '';
      const endpoint = {
        method: method.toUpperCase(),
        route: route,
        fullPath: buildFullPath(controller.route, route),
        line: content.substring(0, match.index).split('\n').length,
      };

      // Попытка извлечь описание из ApiOperation
      const lines = content.split('\n');
      for (let i = endpoint.line - 1; i >= Math.max(0, endpoint.line - 20); i--) {
        if (lines[i].includes('@ApiOperation')) {
          const opMatch = lines[i].match(/summary:\s*['"]([^'"]+)['"]/);
          if (opMatch) {
            endpoint.summary = opMatch[1];
          }
          break;
        }
      }

      controller.endpoints.push(endpoint);
      results.endpoints.push({
        ...endpoint,
        controller: controller.name,
        module: controller.module,
        file: relativePath,
      });
    }
  });

  if (controller.name) {
    results.controllers.push(controller);
    results.stats.totalControllers++;

    // Статистика по модулям
    if (!results.stats.byModule[controller.module]) {
      results.stats.byModule[controller.module] = 0;
    }
    results.stats.byModule[controller.module] += controller.endpoints.length;

    // Статистика по методам
    controller.endpoints.forEach((ep) => {
      if (!results.stats.byMethod[ep.method]) {
        results.stats.byMethod[ep.method] = 0;
      }
      results.stats.byMethod[ep.method]++;
    });
  }

  return controller;
}

/**
 * Извлечение имени модуля из пути файла
 */
function extractModule(filePath) {
  const parts = filePath.split(path.sep);
  const modulesIndex = parts.findIndex((p) => p === 'modules');
  if (modulesIndex !== -1 && parts[modulesIndex + 1]) {
    return parts[modulesIndex + 1];
  }
  return 'unknown';
}

/**
 * Извлечение ApiTags из контроллера
 */
function extractApiTags(content) {
  const tagMatch = content.match(/@ApiTags\(['"]([^'"]+)['"]\)/);
  return tagMatch ? tagMatch[1] : null;
}

/**
 * Построение полного пути endpoint
 */
function buildFullPath(baseRoute, endpointRoute) {
  if (!baseRoute) return endpointRoute;
  if (!endpointRoute) return baseRoute;
  const base = baseRoute.endsWith('/') ? baseRoute.slice(0, -1) : baseRoute;
  const route = endpointRoute.startsWith('/') ? endpointRoute : `/${endpointRoute}`;
  return `${base}${route}`;
}

/**
 * Проверка доступности Swagger
 */
async function checkSwagger() {
  const axios = require('axios').default || require('axios');
  const swaggerUrls = {
    main: `${CONFIG.baseUrl}/api/${CONFIG.version}/${CONFIG.serviceName}/swagger-json`,
    oneC: `${CONFIG.baseUrl}/api/${CONFIG.version}/${CONFIG.serviceName}/1c/swagger-json`,
    ui: {
      main: `${CONFIG.baseUrl}/api/${CONFIG.version}/${CONFIG.serviceName}/swagger`,
      oneC: `${CONFIG.baseUrl}/api/${CONFIG.version}/${CONFIG.serviceName}/1c/swagger`,
    },
  };

  console.log('\n🔍 Проверка доступности Swagger...');
  console.log(`   Основной API: ${swaggerUrls.ui.main}`);
  console.log(`   API для 1C: ${swaggerUrls.ui.oneC}\n`);

  try {
    // Проверка основного Swagger
    try {
      const response = await axios.get(swaggerUrls.main, { timeout: 5000 });
      results.swagger.main = {
        available: true,
        paths: Object.keys(response.data.paths || {}).length,
        info: response.data.info || {},
        url: swaggerUrls.ui.main,
        jsonUrl: swaggerUrls.main,
      };
      results.swagger.available = true;
      console.log(`✅ Основной Swagger доступен: ${results.swagger.main.paths} endpoints`);
    } catch (error) {
      console.log(`⚠️  Основной Swagger недоступен: ${error.message}`);
    }

    // Проверка Swagger для 1C
    try {
      const response = await axios.get(swaggerUrls.oneC, { timeout: 5000 });
      results.swagger.oneC = {
        available: true,
        paths: Object.keys(response.data.paths || {}).length,
        info: response.data.info || {},
        url: swaggerUrls.ui.oneC,
        jsonUrl: swaggerUrls.oneC,
      };
      console.log(`✅ Swagger для 1C доступен: ${results.swagger.oneC.paths} endpoints`);
    } catch (error) {
      console.log(`⚠️  Swagger для 1C недоступен: ${error.message}`);
    }
  } catch (error) {
    results.swagger.error = error.message;
    console.log(`⚠️  Сервер недоступен: ${error.message}`);
    console.log(`   Убедитесь, что сервер запущен на ${CONFIG.baseUrl}\n`);
  }
}

/**
 * Генерация отчета в формате JSON
 */
function generateJSONReport() {
  results.stats.totalEndpoints = results.endpoints.length;
  fs.writeFileSync(CONFIG.outputFile, JSON.stringify(results, null, 2));
  console.log(`\n📄 JSON отчет сохранен: ${CONFIG.outputFile}`);
}

/**
 * Генерация отчета в формате Markdown
 */
function generateMarkdownReport() {
  let md = `# Отчет об API endpoints\n\n`;
  md += `**Дата генерации:** ${new Date().toLocaleString('ru-RU')}\n\n`;

  // Статистика
  md += `## 📊 Статистика\n\n`;
  md += `- **Всего контроллеров:** ${results.stats.totalControllers}\n`;
  md += `- **Всего endpoints:** ${results.stats.totalEndpoints}\n\n`;

  // Статистика по методам
  md += `### По HTTP методам:\n\n`;
  Object.entries(results.stats.byMethod)
    .sort((a, b) => b[1] - a[1])
    .forEach(([method, count]) => {
      md += `- **${method}**: ${count}\n`;
    });

  md += `\n### По модулям:\n\n`;
  Object.entries(results.stats.byModule)
    .sort((a, b) => b[1] - a[1])
    .forEach(([module, count]) => {
      md += `- **${module}**: ${count}\n`;
    });

  // Swagger статус
  md += `\n## 🔍 Swagger\n\n`;
  if (results.swagger.available) {
    md += `✅ **Swagger доступен**\n\n`;
    if (results.swagger.main) {
      md += `### Основной API\n`;
      md += `- **URL:** [${results.swagger.main.url}](${results.swagger.main.url})\n`;
      md += `- **Endpoints:** ${results.swagger.main.paths}\n`;
      md += `- **Версия:** ${results.swagger.main.info.version || CONFIG.version}\n\n`;
    }
    if (results.swagger.oneC) {
      md += `### API для 1C\n`;
      md += `- **URL:** [${results.swagger.oneC.url}](${results.swagger.oneC.url})\n`;
      md += `- **Endpoints:** ${results.swagger.oneC.paths}\n`;
      md += `- **Версия:** ${results.swagger.oneC.info.version || CONFIG.version}\n\n`;
    }
  } else {
    md += `⚠️ **Swagger недоступен**\n\n`;
    md += `Убедитесь, что сервер запущен и переменная окружения \`isDevelopment=true\`\n\n`;
  }

  // Список всех endpoints по модулям
  md += `\n## 📋 Endpoints по модулям\n\n`;

  const endpointsByModule = {};
  results.endpoints.forEach((ep) => {
    if (!endpointsByModule[ep.module]) {
      endpointsByModule[ep.module] = [];
    }
    endpointsByModule[ep.module].push(ep);
  });

  Object.entries(endpointsByModule)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([module, endpoints]) => {
      md += `### ${module} (${endpoints.length} endpoints)\n\n`;
      md += `| Метод | Путь | Контроллер | Файл |\n`;
      md += `|-------|------|------------|------|\n`;

      endpoints
        .sort((a, b) => {
          const methodOrder = { GET: 1, POST: 2, PUT: 3, PATCH: 4, DELETE: 5 };
          return (methodOrder[a.method] || 99) - (methodOrder[b.method] || 99);
        })
        .forEach((ep) => {
          const path = ep.fullPath || ep.route || '/';
          const method = `\`${ep.method}\``;
          const controller = ep.controller || '-';
          const file = `\`${ep.file}\``;
          md += `| ${method} | \`${path}\` | ${controller} | ${file} |\n`;
        });

      md += `\n`;
    });

  // Детальный список всех контроллеров
  md += `\n## 🎯 Контроллеры\n\n`;
  results.controllers
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((controller) => {
      md += `### ${controller.name}\n\n`;
      md += `- **Файл:** \`${controller.file}\`\n`;
      md += `- **Модуль:** ${controller.module}\n`;
      if (controller.route) {
        md += `- **Базовый путь:** \`${controller.route}\`\n`;
      }
      if (controller.apiTags) {
        md += `- **ApiTags:** \`${controller.apiTags}\`\n`;
      }
      md += `- **Endpoints:** ${controller.endpoints.length}\n\n`;

      if (controller.endpoints.length > 0) {
        md += `| Метод | Путь | Описание |\n`;
        md += `|-------|------|----------|\n`;
        controller.endpoints.forEach((ep) => {
          const path = ep.fullPath || ep.route || '/';
          const method = `\`${ep.method}\``;
          const summary = ep.summary || '-';
          md += `| ${method} | \`${path}\` | ${summary} |\n`;
        });
        md += `\n`;
      }
    });

  fs.writeFileSync(CONFIG.outputMarkdown, md);
  console.log(`📄 Markdown отчет сохранен: ${CONFIG.outputMarkdown}`);
}

/**
 * Главная функция
 */
async function main() {
  console.log('🚀 Запуск проверки API...\n');
  console.log(`📁 Сканирование контроллеров в: ${CONFIG.srcPath}\n`);

  // Поиск всех TypeScript файлов
  const files = findTSFiles(CONFIG.srcPath);
  console.log(`Найдено ${files.length} TypeScript файлов\n`);

  // Парсинг контроллеров
  let parsedCount = 0;
  files.forEach((file) => {
    try {
      const controller = parseController(file);
      if (controller) {
        parsedCount++;
        if (parsedCount % 10 === 0) {
          process.stdout.write('.');
        }
      }
    } catch (error) {
      console.error(`\n❌ Ошибка при парсинге ${file}: ${error.message}`);
    }
  });

  console.log(`\n\n✅ Найдено контроллеров: ${results.stats.totalControllers}`);
  console.log(`✅ Найдено endpoints: ${results.endpoints.length}\n`);

  // Проверка Swagger
  await checkSwagger();

  // Генерация отчетов
  generateJSONReport();
  generateMarkdownReport();

  console.log('\n✨ Проверка завершена!\n');
}

// Запуск
main().catch((error) => {
  console.error('\n❌ Критическая ошибка:', error);
  process.exit(1);
});
