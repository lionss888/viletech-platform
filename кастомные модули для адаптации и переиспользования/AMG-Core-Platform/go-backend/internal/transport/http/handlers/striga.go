package handlers

import (
	"net/http"
	"strconv"

	"amg-flow-backend/internal/service"
	"amg-flow-backend/pkg/logger"

	"github.com/gin-gonic/gin"
)

// StrigaHandlers содержит handlers для работы с Striga API
type StrigaHandlers struct {
	strigaService *service.StrigaService
	logger        logger.Logger
}

// NewStrigaHandlers создает новые handlers для Striga
func NewStrigaHandlers(strigaService *service.StrigaService, logger logger.Logger) *StrigaHandlers {
	return &StrigaHandlers{
		strigaService: strigaService,
		logger:        logger,
	}
}

// CreateUser создает нового пользователя
// @Summary Create user
// @Description Create a new user in Striga system
// @Tags Striga Users
// @Accept json
// @Produce json
// @Param user body service.CreateUserRequest true "User data"
// @Success 201 {object} service.User
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/striga/users [post]
func (h *StrigaHandlers) CreateUser(c *gin.Context) {
	var req service.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Errorf("Failed to bind JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	user, err := h.strigaService.GetUserService().CreateUser(&req)
	if err != nil {
		h.logger.Errorf("Failed to create user: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, user)
}

// GetUser получает пользователя по ID
// @Summary Get user
// @Description Get user by ID
// @Tags Striga Users
// @Produce json
// @Param id path string true "User ID"
// @Success 200 {object} service.User
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/striga/users/{id} [get]
func (h *StrigaHandlers) GetUser(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User ID is required"})
		return
	}

	user, err := h.strigaService.GetUserService().GetUser(userID)
	if err != nil {
		h.logger.Errorf("Failed to get user: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// ListUsers получает список пользователей
// @Summary List users
// @Description Get list of users with pagination
// @Tags Striga Users
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Success 200 {object} service.UserListResponse
// @Failure 500 {object} map[string]string
// @Router /api/v1/striga/users [get]
func (h *StrigaHandlers) ListUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	users, err := h.strigaService.GetUserService().ListUsers(page, limit)
	if err != nil {
		h.logger.Errorf("Failed to list users: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list users"})
		return
	}

	c.JSON(http.StatusOK, users)
}

// UpdateUser обновляет пользователя
// @Summary Update user
// @Description Update user data
// @Tags Striga Users
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Param user body service.UpdateUserRequest true "User update data"
// @Success 200 {object} service.User
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/striga/users/{id} [put]
func (h *StrigaHandlers) UpdateUser(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User ID is required"})
		return
	}

	var req service.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Errorf("Failed to bind JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	user, err := h.strigaService.GetUserService().UpdateUser(userID, &req)
	if err != nil {
		h.logger.Errorf("Failed to update user: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// CreateWallet создает новый кошелек
// @Summary Create wallet
// @Description Create a new wallet for user
// @Tags Striga Wallets
// @Accept json
// @Produce json
// @Param wallet body service.CreateWalletRequest true "Wallet data"
// @Success 201 {object} service.Wallet
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/striga/wallets [post]
func (h *StrigaHandlers) CreateWallet(c *gin.Context) {
	var req service.CreateWalletRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Errorf("Failed to bind JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	wallet, err := h.strigaService.GetWalletService().CreateWallet(&req)
	if err != nil {
		h.logger.Errorf("Failed to create wallet: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create wallet"})
		return
	}

	c.JSON(http.StatusCreated, wallet)
}

// GetWallet получает кошелек по ID
// @Summary Get wallet
// @Description Get wallet by ID
// @Tags Striga Wallets
// @Produce json
// @Param id path string true "Wallet ID"
// @Success 200 {object} service.Wallet
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/striga/wallets/{id} [get]
func (h *StrigaHandlers) GetWallet(c *gin.Context) {
	walletID := c.Param("id")
	if walletID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Wallet ID is required"})
		return
	}

	wallet, err := h.strigaService.GetWalletService().GetWallet(walletID)
	if err != nil {
		h.logger.Errorf("Failed to get wallet: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Wallet not found"})
		return
	}

	c.JSON(http.StatusOK, wallet)
}

// ListWallets получает список кошельков пользователя
// @Summary List wallets
// @Description Get list of user wallets with pagination
// @Tags Striga Wallets
// @Produce json
// @Param user_id path string true "User ID"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Success 200 {object} service.WalletListResponse
// @Failure 500 {object} map[string]string
// @Router /api/v1/striga/users/{user_id}/wallets [get]
func (h *StrigaHandlers) ListWallets(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User ID is required"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	wallets, err := h.strigaService.GetWalletService().ListWallets(userID, page, limit)
	if err != nil {
		h.logger.Errorf("Failed to list wallets: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list wallets"})
		return
	}

	c.JSON(http.StatusOK, wallets)
}

// CreateCard создает новую карту
// @Summary Create card
// @Description Create a new card for user wallet
// @Tags Striga Cards
// @Accept json
// @Produce json
// @Param card body service.CreateCardRequest true "Card data"
// @Success 201 {object} service.Card
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/striga/cards [post]
func (h *StrigaHandlers) CreateCard(c *gin.Context) {
	var req service.CreateCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Errorf("Failed to bind JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	card, err := h.strigaService.GetCardService().CreateCard(&req)
	if err != nil {
		h.logger.Errorf("Failed to create card: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create card"})
		return
	}

	c.JSON(http.StatusCreated, card)
}

// GetCard получает карту по ID
// @Summary Get card
// @Description Get card by ID
// @Tags Striga Cards
// @Produce json
// @Param id path string true "Card ID"
// @Success 200 {object} service.Card
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/striga/cards/{id} [get]
func (h *StrigaHandlers) GetCard(c *gin.Context) {
	cardID := c.Param("id")
	if cardID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Card ID is required"})
		return
	}

	card, err := h.strigaService.GetCardService().GetCard(cardID)
	if err != nil {
		h.logger.Errorf("Failed to get card: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Card not found"})
		return
	}

	c.JSON(http.StatusOK, card)
}

// ListCards получает список карт пользователя
// @Summary List cards
// @Description Get list of user cards with pagination
// @Tags Striga Cards
// @Produce json
// @Param user_id path string true "User ID"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Success 200 {object} service.CardListResponse
// @Failure 500 {object} map[string]string
// @Router /api/v1/striga/users/{user_id}/cards [get]
func (h *StrigaHandlers) ListCards(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User ID is required"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	cards, err := h.strigaService.GetCardService().ListCards(userID, page, limit)
	if err != nil {
		h.logger.Errorf("Failed to list cards: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list cards"})
		return
	}

	c.JSON(http.StatusOK, cards)
}

// CreateTransaction создает новую транзакцию
// @Summary Create transaction
// @Description Create a new transaction
// @Tags Striga Transactions
// @Accept json
// @Produce json
// @Param transaction body service.CreateTransactionRequest true "Transaction data"
// @Success 201 {object} service.Transaction
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/striga/transactions [post]
func (h *StrigaHandlers) CreateTransaction(c *gin.Context) {
	var req service.CreateTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Errorf("Failed to bind JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	transaction, err := h.strigaService.GetTransactionService().CreateTransaction(&req)
	if err != nil {
		h.logger.Errorf("Failed to create transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create transaction"})
		return
	}

	c.JSON(http.StatusCreated, transaction)
}

// GetTransaction получает транзакцию по ID
// @Summary Get transaction
// @Description Get transaction by ID
// @Tags Striga Transactions
// @Produce json
// @Param id path string true "Transaction ID"
// @Success 200 {object} service.Transaction
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/striga/transactions/{id} [get]
func (h *StrigaHandlers) GetTransaction(c *gin.Context) {
	transactionID := c.Param("id")
	if transactionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Transaction ID is required"})
		return
	}

	transaction, err := h.strigaService.GetTransactionService().GetTransaction(transactionID)
	if err != nil {
		h.logger.Errorf("Failed to get transaction: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	c.JSON(http.StatusOK, transaction)
}

// ListTransactions получает список транзакций пользователя
// @Summary List transactions
// @Description Get list of user transactions with pagination
// @Tags Striga Transactions
// @Produce json
// @Param user_id path string true "User ID"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Success 200 {object} service.TransactionListResponse
// @Failure 500 {object} map[string]string
// @Router /api/v1/striga/users/{user_id}/transactions [get]
func (h *StrigaHandlers) ListTransactions(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User ID is required"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	transactions, err := h.strigaService.GetTransactionService().ListTransactions(userID, page, limit)
	if err != nil {
		h.logger.Errorf("Failed to list transactions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list transactions"})
		return
	}

	c.JSON(http.StatusOK, transactions)
}

// StrigaHealthCheck проверяет доступность Striga API
// @Summary Striga health check
// @Description Check Striga API availability
// @Tags Striga Health
// @Produce json
// @Success 200 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/striga/health [get]
func (h *StrigaHandlers) StrigaHealthCheck(c *gin.Context) {
	err := h.strigaService.HealthCheck()
	if err != nil {
		h.logger.Errorf("Striga health check failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Striga API is not available"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "healthy", "service": "striga"})
}

// ProcessWebhook обрабатывает webhook события от Striga
// @Summary Process Striga webhook
// @Description Process webhook events from Striga
// @Tags Striga Webhooks
// @Accept json
// @Produce json
// @Param event_type header string true "Event Type"
// @Param payload body string true "Webhook Payload"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/striga/webhooks [post]
func (h *StrigaHandlers) ProcessWebhook(c *gin.Context) {
	eventType := c.GetHeader("X-Event-Type")
	if eventType == "" {
		h.logger.Errorf("Missing X-Event-Type header")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing X-Event-Type header"})
		return
	}

	// Читаем тело запроса
	body, err := c.GetRawData()
	if err != nil {
		h.logger.Errorf("Failed to read webhook body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	// Проверяем подпись webhook (если требуется)
	signature := c.GetHeader("X-Signature")
	timestamp := c.GetHeader("X-Timestamp")
	
	// Здесь можно добавить проверку подписи:
	// if !h.strigaService.VerifyWebhookSignature(string(body), signature, timestamp) {
	//     c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid webhook signature"})
	//     return
	// }

	// Обрабатываем webhook
	ctx := c.Request.Context()
	if err := h.strigaService.ProcessWebhook(ctx, eventType, body); err != nil {
		h.logger.Errorf("Failed to process webhook: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process webhook"})
		return
	}

	h.logger.Infof("Webhook processed successfully: %s", eventType)
	c.JSON(http.StatusOK, gin.H{"status": "processed", "event_type": eventType})
}
