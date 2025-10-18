package handlers

import (
	"codepulse-api/internal/database"
	"codepulse-api/internal/email"
	"codepulse-api/internal/models"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v76"
	portalsession "github.com/stripe/stripe-go/v76/billingportal/session"
	"github.com/stripe/stripe-go/v76/checkout/session"
	"github.com/stripe/stripe-go/v76/customer"
	"github.com/stripe/stripe-go/v76/webhook"
)

type BillingHandler struct {
	db              *database.Database
	webhookSecret   string
	pricePro        string
	priceTeam       string
	priceEnterprise string
	emailService    *email.Service
}

func NewBillingHandler(db *database.Database, stripeSecretKey, webhookSecret, pricePro, priceTeam, priceEnterprise string, emailService *email.Service) *BillingHandler {
	stripe.Key = stripeSecretKey
	return &BillingHandler{
		db:              db,
		webhookSecret:   webhookSecret,
		pricePro:        pricePro,
		priceTeam:       priceTeam,
		priceEnterprise: priceEnterprise,
		emailService:    emailService,
	}
}

// CreateCheckoutSession creates a Stripe checkout session
func (h *BillingHandler) CreateCheckoutSession(c *gin.Context) {
	orgID, _ := c.Get("org_id")

	var req struct {
		Plan       string `json:"plan" binding:"required,oneof=pro team enterprise"`
		Seats      int    `json:"seats" binding:"required,min=1"`
		SuccessURL string `json:"success_url" binding:"required"`
		CancelURL  string `json:"cancel_url" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get organization
	var org models.Organization
	if err := h.db.DB.Where("id = ?", orgID).First(&org).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
		return
	}

	// Get or create Stripe customer
	var sub models.Subscription
	err := h.db.DB.Where("org_id = ?", orgID).First(&sub).Error

	var customerID string
	if err == nil && sub.StripeCustomerID != nil {
		customerID = *sub.StripeCustomerID
	} else {
		// Create new customer
		params := &stripe.CustomerParams{
			Name: stripe.String(org.Name),
			Metadata: map[string]string{
				"org_id": org.ID,
			},
		}
		cust, err := customer.New(params)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create customer"})
			return
		}
		customerID = cust.ID
	}

	// Get price ID based on plan (from env-configured values)
	priceID := h.getPriceID(req.Plan)

	// Create checkout session
	params := &stripe.CheckoutSessionParams{
		Customer: stripe.String(customerID),
		Mode:     stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(priceID),
				Quantity: stripe.Int64(int64(req.Seats)),
			},
		},
		SuccessURL: stripe.String(req.SuccessURL),
		CancelURL:  stripe.String(req.CancelURL),
		Metadata: map[string]string{
			"org_id": orgID.(string),
			"plan":   req.Plan,
		},
	}

	sess, err := session.New(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create checkout session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"checkout_url": sess.URL,
		"session_id":   sess.ID,
	})
}

// CreatePortalSession creates a Stripe billing portal session
func (h *BillingHandler) CreatePortalSession(c *gin.Context) {
	orgID, _ := c.Get("org_id")

	var req struct {
		ReturnURL string `json:"return_url" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get subscription
	var sub models.Subscription
	if err := h.db.DB.Where("org_id = ?", orgID).First(&sub).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No subscription found"})
		return
	}

	if sub.StripeCustomerID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No Stripe customer found"})
		return
	}

	// Create portal session
	params := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(*sub.StripeCustomerID),
		ReturnURL: stripe.String(req.ReturnURL),
	}

	sess, err := portalsession.New(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create portal session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"portal_url": sess.URL,
	})
}

// HandleWebhook processes Stripe webhook events
func (h *BillingHandler) HandleWebhook(c *gin.Context) {
	payload, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read payload"})
		return
	}

	signature := c.GetHeader("Stripe-Signature")

	event, err := webhook.ConstructEvent(payload, signature, h.webhookSecret)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid signature"})
		return
	}

	// Handle different event types
	switch event.Type {
	case "customer.subscription.created", "customer.subscription.updated":
		h.handleSubscriptionUpdate(event.Data.Raw)
	case "customer.subscription.deleted":
		h.handleSubscriptionDeleted(event.Data.Raw)
	case "invoice.payment_succeeded":
		h.handlePaymentSucceeded(event.Data.Raw)
	case "invoice.payment_failed":
		h.handlePaymentFailed(event.Data.Raw)
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}

// handleSubscriptionUpdate updates subscription in database
func (h *BillingHandler) handleSubscriptionUpdate(data json.RawMessage) {
	var stripeSubscription stripe.Subscription
	if err := json.Unmarshal(data, &stripeSubscription); err != nil {
		return
	}

	orgID := stripeSubscription.Metadata["org_id"]
	if orgID == "" {
		return
	}

	// Get or create subscription
	var sub models.Subscription
	err := h.db.DB.Where("org_id = ?", orgID).First(&sub).Error

	customerID := stripeSubscription.Customer.ID
	subscriptionID := stripeSubscription.ID
	plan := stripeSubscription.Metadata["plan"]
	if plan == "" {
		plan = "pro" // default
	}

	seats := 1
	if len(stripeSubscription.Items.Data) > 0 {
		seats = int(stripeSubscription.Items.Data[0].Quantity)
	}

	status := string(stripeSubscription.Status)
	periodEnd := time.Unix(stripeSubscription.CurrentPeriodEnd, 0)

	if err != nil {
		// Create new subscription
		sub = models.Subscription{
			OrgID:                orgID,
			Plan:                 plan,
			Seats:                seats,
			Status:               status,
			CurrentPeriodEnd:     &periodEnd,
			StripeCustomerID:     &customerID,
			StripeSubscriptionID: &subscriptionID,
		}
		h.db.DB.Create(&sub)
	} else {
		// Update existing
		sub.Plan = plan
		sub.Seats = seats
		sub.Status = status
		sub.CurrentPeriodEnd = &periodEnd
		sub.StripeCustomerID = &customerID
		sub.StripeSubscriptionID = &subscriptionID
		h.db.DB.Save(&sub)
	}
}

// handleSubscriptionDeleted marks subscription as canceled
func (h *BillingHandler) handleSubscriptionDeleted(data json.RawMessage) {
	var stripeSubscription stripe.Subscription
	if err := json.Unmarshal(data, &stripeSubscription); err != nil {
		return
	}

	subscriptionID := stripeSubscription.ID

	var sub models.Subscription
	if err := h.db.DB.Where("stripe_subscription_id = ?", subscriptionID).First(&sub).Error; err != nil {
		return
	}

	sub.Status = "canceled"
	h.db.DB.Save(&sub)
}

// handlePaymentSucceeded logs successful payment
func (h *BillingHandler) handlePaymentSucceeded(data json.RawMessage) {
	var invoice stripe.Invoice
	if err := json.Unmarshal(data, &invoice); err != nil {
		return
	}
	if invoice.Subscription == nil || invoice.Customer == nil {
		return
	}
	var sub models.Subscription
	if err := h.db.DB.Where("stripe_subscription_id = ?", invoice.Subscription.ID).First(&sub).Error; err != nil {
		return
	}
	orgID := sub.OrgID
	// Find an org user for attribution (owner preferred)
	userID := ""
	var owner models.Membership
	if err := h.db.DB.Where("org_id = ? AND role = ?", orgID, "owner").First(&owner).Error; err == nil {
		userID = owner.UserID
	} else {
		var any models.Membership
		if err := h.db.DB.Where("org_id = ?", orgID).First(&any).Error; err == nil {
			userID = any.UserID
		}
	}
	if userID == "" { // cannot log without user due to FK
		return
	}
	details := models.JSONMap{
		"invoice_id":  invoice.ID,
		"amount_paid": invoice.AmountPaid,
		"currency":    invoice.Currency,
		"status":      invoice.Status,
	}
	h.db.DB.Create(&models.AuditLog{
		OrgID:    &orgID,
		UserID:   userID,
		Action:   "billing.invoice.paid",
		Resource: "stripe_invoice",
		Details:  &details,
	})
}

// handlePaymentFailed handles failed payment
func (h *BillingHandler) handlePaymentFailed(data json.RawMessage) {
	var invoice stripe.Invoice
	if err := json.Unmarshal(data, &invoice); err != nil {
		return
	}

	if invoice.Subscription == nil {
		return
	}

	var sub models.Subscription
	if err := h.db.DB.Where("stripe_subscription_id = ?", invoice.Subscription.ID).First(&sub).Error; err != nil {
		return
	}

	sub.Status = "past_due"
	h.db.DB.Save(&sub)

	// Send email notification to org owner (best effort)
	if h.emailService != nil {
		var membership models.Membership
		if err := h.db.DB.Where("org_id = ? AND role = ?", sub.OrgID, "owner").Preload("User").First(&membership).Error; err == nil {
			if membership.User != nil && membership.User.Email != "" {
				subject := "Payment Failed - Action Required"
				body := "<p>Your latest payment failed for your CodePulse subscription. Please update your payment method in the billing portal to avoid interruption of service.</p>"
				_ = h.emailService.SendBillingNotice(membership.User.Email, subject, body)
			}
		}
	}
}

// getPriceID returns the Stripe price ID for a plan
func (h *BillingHandler) getPriceID(plan string) string {
	switch plan {
	case "pro":
		return h.pricePro
	case "team":
		return h.priceTeam
	case "enterprise":
		return h.priceEnterprise
	default:
		return ""
	}
}

// GetSubscription returns the current subscription for an org
func (h *BillingHandler) GetSubscription(c *gin.Context) {
	orgID, _ := c.Get("org_id")

	var sub models.Subscription
	if err := h.db.DB.Where("org_id = ?", orgID).First(&sub).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No subscription found"})
		return
	}

	c.JSON(http.StatusOK, sub)
}
