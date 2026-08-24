/**
 * VILI Operators Dashboard JavaScript
 * 
 * Handles data fetching, rendering, and interactions for the
 * operator analytics dashboard.
 */

const API_BASE = '/api/v1/operators';

// State
let operatorsData = null;
let selectedOperator = null;

/**
 * Initialize the dashboard
 */
async function init() {
    await loadOperators();
    setupEventListeners();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadOperators);
    }
    
    // Close detail panel
    const closeBtn = document.getElementById('close-detail');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeDetailPanel);
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDetailPanel();
        }
    });
}

/**
 * Load operators list from API
 */
async function loadOperators() {
    const grid = document.getElementById('operators-grid');
    grid.innerHTML = '<div class="loading">Загрузка операторов</div>';
    
    try {
        const response = await fetch(API_BASE);
        if (!response.ok) throw new Error('Failed to fetch operators');
        
        operatorsData = await response.json();
        renderTeamStats(operatorsData.team_stats);
        renderOperators(operatorsData.operators);
    } catch (error) {
        console.error('Error loading operators:', error);
        grid.innerHTML = `<div class="error-message">Ошибка загрузки: ${error.message}</div>`;
    }
}

/**
 * Render team statistics
 */
function renderTeamStats(stats) {
    document.getElementById('stat-total').textContent = operatorsData.total || 0;
    document.getElementById('stat-success').textContent = 
        `${((stats.avg_success_rate || 0) * 100).toFixed(1)}%`;
    document.getElementById('stat-compliance').textContent = 
        `${((stats.avg_compliance_score || 0) * 100).toFixed(0)}%`;
    document.getElementById('stat-detection').textContent = 
        `${((stats.team_detection_rate || 0) * 100).toFixed(0)}%`;
}

/**
 * Render operators grid
 */
function renderOperators(operators) {
    const grid = document.getElementById('operators-grid');
    
    if (!operators || operators.length === 0) {
        grid.innerHTML = '<div class="loading">Нет данных об операторах</div>';
        return;
    }
    
    grid.innerHTML = operators.map(op => renderOperatorCard(op)).join('');
    
    // Add click handlers
    document.querySelectorAll('.operator-card').forEach(card => {
        card.addEventListener('click', () => {
            const opId = card.dataset.operatorId;
            selectOperator(opId);
        });
    });
}

/**
 * Render single operator card
 */
function renderOperatorCard(operator) {
    const levelClass = `level-${operator.level}`;
    const levelLabel = {
        'senior': 'Senior',
        'middle': 'Middle',
        'junior': 'Junior'
    }[operator.level] || operator.level;
    
    const complianceClass = operator.compliance_score >= 0.9 ? 'compliance-high' :
                           operator.compliance_score >= 0.8 ? 'compliance-medium' : 'compliance-low';
    
    return `
        <div class="operator-card" data-operator-id="${operator.id}">
            <div class="operator-header">
                <div class="operator-info">
                    <h3>${operator.full_name}</h3>
                    <span class="position">${operator.department}</span>
                </div>
                <span class="operator-level ${levelClass}">${levelLabel}</span>
            </div>
            <div class="operator-metrics">
                <div class="metric">
                    <div class="metric-value">${operator.applications_processed_30d}</div>
                    <div class="metric-label">Заявок</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${(operator.success_rate * 100).toFixed(0)}%</div>
                    <div class="metric-label">Успех</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${(operator.compliance_score * 100).toFixed(0)}%</div>
                    <div class="metric-label">Compliance</div>
                </div>
            </div>
            <div class="operator-compliance">
                <div class="compliance-bar">
                    <div class="compliance-fill ${complianceClass}" 
                         style="width: ${operator.compliance_score * 100}%"></div>
                </div>
                <span>${(operator.compliance_score * 100).toFixed(0)}%</span>
            </div>
        </div>
    `;
}

/**
 * Select an operator and load details
 */
async function selectOperator(operatorId) {
    // Update selection state
    document.querySelectorAll('.operator-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.operatorId === operatorId);
    });
    
    selectedOperator = operatorId;
    
    // Show detail panel
    const panel = document.getElementById('detail-panel');
    panel.classList.add('active');
    panel.innerHTML = '<div class="loading">Загрузка аналитики</div>';
    
    try {
        const response = await fetch(
            `${API_BASE}/${operatorId}/analytics?include_forecast=true&include_recommendations=true&compare_with_team=true`
        );
        
        if (!response.ok) throw new Error('Failed to fetch analytics');
        
        const data = await response.json();
        renderDetailPanel(data);
    } catch (error) {
        console.error('Error loading operator details:', error);
        panel.innerHTML = `<div class="error-message">Ошибка загрузки: ${error.message}</div>`;
    }
}

/**
 * Render detail panel with operator analytics
 */
function renderDetailPanel(data) {
    const panel = document.getElementById('detail-panel');
    
    const levelLabel = {
        'senior': 'Старший специалист',
        'middle': 'Специалист',
        'junior': 'Младший специалист'
    }[data.profile.level] || data.profile.level;
    
    const complianceClass = data.compliance_score.overall_score >= 0.9 ? 'success' :
                           data.compliance_score.overall_score >= 0.8 ? 'warning' : 'danger';
    
    const trendIcon = {
        'improving': '📈',
        'stable': '➡️',
        'declining': '📉'
    }[data.forecast?.trend] || '➡️';
    
    const trendClass = {
        'improving': 'trend-improving',
        'stable': 'trend-stable',
        'declining': 'trend-declining'
    }[data.forecast?.trend] || 'trend-stable';
    
    panel.innerHTML = `
        <div class="detail-header">
            <div class="detail-title">
                <h2>${data.profile.full_name}</h2>
                <p>${data.profile.position} • ${levelLabel} • Стаж: ${data.profile.years_in_company.toFixed(1)} лет</p>
            </div>
            <button class="detail-close" id="close-detail">&times;</button>
        </div>
        
        <div class="detail-grid">
            <div class="detail-section">
                <h3>Метрики производительности</h3>
                <table class="metrics-table">
                    <tr>
                        <td>Обработано заявок</td>
                        <td>${data.metrics.applications_processed}</td>
                    </tr>
                    <tr>
                        <td>Одобрено</td>
                        <td>${data.metrics.applications_approved}</td>
                    </tr>
                    <tr>
                        <td>Отклонено</td>
                        <td>${data.metrics.applications_rejected}</td>
                    </tr>
                    <tr>
                        <td>Success Rate</td>
                        <td>${(data.metrics.success_rate * 100).toFixed(1)}%</td>
                    </tr>
                    <tr>
                        <td>Среднее время обработки</td>
                        <td>${data.metrics.avg_processing_time_min.toFixed(1)} мин</td>
                    </tr>
                    <tr>
                        <td>Выявлено Red Flags</td>
                        <td>${data.metrics.red_flags_detected}</td>
                    </tr>
                    <tr>
                        <td>Пропущено Red Flags</td>
                        <td style="color: ${data.metrics.red_flags_missed > 0 ? 'var(--danger)' : 'inherit'}">${data.metrics.red_flags_missed}</td>
                    </tr>
                </table>
            </div>
            
            <div class="detail-section">
                <h3>Compliance-оценка (115-ФЗ)</h3>
                <div class="compliance-detail">
                    <div class="compliance-score-big" style="color: var(--${complianceClass})">
                        ${(data.compliance_score.overall_score * 100).toFixed(0)}%
                    </div>
                    <div class="compliance-components">
                        <div class="compliance-item">
                            <span>KYC</span>
                            <span>${(data.compliance_score.kyc_compliance * 100).toFixed(0)}%</span>
                        </div>
                        <div class="compliance-item">
                            <span>AML</span>
                            <span>${(data.compliance_score.aml_compliance * 100).toFixed(0)}%</span>
                        </div>
                        <div class="compliance-item">
                            <span>Санкции</span>
                            <span>${(data.compliance_score.sanctions_compliance * 100).toFixed(0)}%</span>
                        </div>
                        <div class="compliance-item">
                            <span>Документация</span>
                            <span>${(data.compliance_score.documentation_quality * 100).toFixed(0)}%</span>
                        </div>
                        <div class="compliance-item">
                            <span>Detection Rate</span>
                            <span>${(data.compliance_score.detection_rate * 100).toFixed(0)}%</span>
                        </div>
                        <div class="compliance-item">
                            <span>False Negative</span>
                            <span style="color: ${data.compliance_score.false_negative_rate > 0.05 ? 'var(--danger)' : 'inherit'}">${(data.compliance_score.false_negative_rate * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                </div>
                
                ${data.compliance_score.violations.length > 0 ? `
                    <h4 style="margin-top: 20px; margin-bottom: 12px;">Нарушения</h4>
                    <div class="violations-list">
                        ${data.compliance_score.violations.map(v => `
                            <div class="violation ${v.resolved ? 'resolved' : ''}">
                                <div class="violation-header">
                                    <span class="violation-type">${v.violation_type}</span>
                                    <span class="violation-date">${new Date(v.date).toLocaleDateString('ru-RU')}</span>
                                </div>
                                <div class="violation-desc">${v.description}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            
            ${data.forecast ? `
                <div class="detail-section">
                    <h3>Прогноз на 30 дней</h3>
                    <div class="forecast-card">
                        <div class="forecast-trend ${trendClass}">
                            ${trendIcon} ${data.forecast.trend === 'improving' ? 'Рост' : 
                                          data.forecast.trend === 'declining' ? 'Снижение' : 'Стабильно'}
                        </div>
                        <p style="color: var(--text-secondary); margin-bottom: 16px;">
                            Уверенность: ${(data.forecast.confidence * 100).toFixed(0)}%
                        </p>
                        <div class="forecast-metrics">
                            <div class="metric">
                                <div class="metric-value">${data.forecast.predicted_applications}</div>
                                <div class="metric-label">Заявок</div>
                            </div>
                            <div class="metric">
                                <div class="metric-value">${(data.forecast.predicted_success_rate * 100).toFixed(0)}%</div>
                                <div class="metric-label">Success</div>
                            </div>
                        </div>
                        ${data.forecast.risk_factors.length > 0 ? `
                            <div style="margin-top: 16px; text-align: left;">
                                <strong style="color: var(--danger);">Риски:</strong>
                                <ul style="margin-top: 8px; padding-left: 20px; color: var(--text-secondary); font-size: 0.85rem;">
                                    ${data.forecast.risk_factors.map(f => `<li>${f}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        ${data.forecast.growth_factors.length > 0 ? `
                            <div style="margin-top: 12px; text-align: left;">
                                <strong style="color: var(--success);">Драйверы роста:</strong>
                                <ul style="margin-top: 8px; padding-left: 20px; color: var(--text-secondary); font-size: 0.85rem;">
                                    ${data.forecast.growth_factors.map(f => `<li>${f}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
            
            ${data.recommendations && data.recommendations.length > 0 ? `
                <div class="detail-section">
                    <h3>Рекомендации</h3>
                    <div class="recommendations-list">
                        ${data.recommendations.map(rec => `
                            <div class="recommendation ${rec.priority}">
                                <h4>${rec.title}</h4>
                                <p>${rec.description}</p>
                                <p style="margin-top: 8px; font-size: 0.8rem;">
                                    <strong>Ожидаемый эффект:</strong> ${rec.expected_impact}
                                </p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
        
        <div style="margin-top: 24px; padding: 16px; background: var(--bg-hover); border-radius: 8px;">
            <strong>Резюме:</strong>
            <p style="margin-top: 8px; color: var(--text-secondary);">${data.analysis_summary}</p>
            <p style="margin-top: 8px; font-size: 0.8rem; color: var(--text-secondary);">
                Время обработки: ${data.processing_time_ms} мс
            </p>
        </div>
    `;
    
    // Re-attach close button handler
    document.getElementById('close-detail')?.addEventListener('click', closeDetailPanel);
}

/**
 * Close detail panel
 */
function closeDetailPanel() {
    const panel = document.getElementById('detail-panel');
    panel.classList.remove('active');
    
    document.querySelectorAll('.operator-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    selectedOperator = null;
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
