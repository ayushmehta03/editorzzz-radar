package controllers

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/ayushmehta03/editorzzz-radar-backend/internal/database"
	"github.com/ayushmehta03/editorzzz-radar-backend/internal/models"
	"github.com/ayushmehta03/editorzzz-radar-backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

func RegisterAccount(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {

		var hirers models.Hirers

		if err := c.ShouldBindJSON(&hirers); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data"})
			return
		}

		validate := validator.New()
		if err := validate.Struct(hirers); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Validation failed",
				"details": err.Error(),
			})
			return
		}

		hashedPassword, err := utils.HashPassword(hirers.PasswordHash)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		hirerCollection := database.OpenCollection("hirers", client)

		cleanedPhone := strings.TrimSpace(hirers.Phone)
		isNumeric := true
		for _, r := range cleanedPhone {
			if r < '0' || r > '9' {
				isNumeric = false
				break
			}
		}

		if isNumeric && len(cleanedPhone) == 10 {
			cleanedPhone = "+91" + cleanedPhone
		}

		filter := bson.M{
			"$or": []bson.M{
				{"username": hirers.UserName},
				{"phone": cleanedPhone},
			},
		}

		var existingHirer models.Hirers
		err = hirerCollection.FindOne(ctx, filter).Decode(&existingHirer)
		if err == nil {
			if existingHirer.UserName == hirers.UserName {
				c.JSON(http.StatusConflict, gin.H{"error": "Username already exists"})
				return
			}
			c.JSON(http.StatusConflict, gin.H{"error": "Phone number already exists"})
			return

		} else if err != mongo.ErrNoDocuments {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check existing hirer"})
			return
		}

		avatarURL := fmt.Sprintf(
			"https://api.dicebear.com/7.x/initials/svg?seed=%s",
			url.QueryEscape(hirers.UserName),
		)

		verificationID, err := utils.MessageCentralSendOTP(cleanedPhone)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send phone OTP"})
			return
		}


		if hirers.ID.IsZero() {
			hirers.ID = primitive.NewObjectID()
		}

		hirers.Phone = cleanedPhone
		hirers.PasswordHash = hashedPassword
		hirers.IsPhoneVerified = false
		hirers.VerificationID = verificationID
		hirers.ProfileImage = avatarURL
		hirers.Role = "hirer"
		hirers.CreatedAt = time.Now()
		hirers.UpdatedAt = time.Now()

		if _, err := hirerCollection.InsertOne(ctx, hirers); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register hirer"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message": "Account registered successfully. Please verify your phone.",
			"id":      hirers.ID.Hex(),
		})
	}
}


func LoginEditors(client *mongo.Client) gin.HandlerFunc {
	editorCollection := database.OpenCollection("editors", client)

	return func(c *gin.Context) {

		var req struct {
			Identifier string `json:"identifier" binding:"required"` // Username or Phone
			Password   string `json:"password" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}

		ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
		defer cancel()

		inputIdentifier := strings.TrimSpace(req.Identifier)

		formattedPhone := inputIdentifier
		isNumeric := true

		for _, r := range inputIdentifier {
			if r < '0' || r > '9' {
				isNumeric = false
				break
			}
		}

		if isNumeric && len(inputIdentifier) == 10 {
			formattedPhone = "+91" + inputIdentifier
		}

		var user models.User

		filter := bson.M{
			"$or": []bson.M{
				{"username": inputIdentifier},
				{"phone": inputIdentifier},
				{"phone": formattedPhone},
			},
		}

		err := editorCollection.FindOne(ctx, filter).Decode(&user)

		if err != nil {
			if err == mongo.ErrNoDocuments {
				c.JSON(http.StatusNotFound, gin.H{
					"error":   "No account found",
					"message": "No account found. Create an account on editorzzz.com",
				})
				return
			}

			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to find account",
			})
			return
		}

		if err := bcrypt.CompareHashAndPassword(
			[]byte(user.PasswordHash),
			[]byte(req.Password),
		); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid password",
			})
			return
		}

		if !user.IsPhoneVerified {
			phone := strings.TrimSpace(user.Phone)

			verificationID, err := utils.MessageCentralSendOTP(phone)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Failed to send phone OTP",
				})
				return
			}

			_, err = editorCollection.UpdateOne(
				ctx,
				bson.M{"_id": user.ID},
				bson.M{
					"$set": bson.M{
						"verification_id": verificationID,
						"updated_at":      time.Now(),
					},
				},
			)

			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Failed to store verification session",
				})
				return
			}

			c.JSON(http.StatusForbidden, gin.H{
				"error":    "Phone verification required",
				"redirect": "editorzzz.com/verify-phone",
				"id":       user.ID.Hex(),
			})
			return
		}

		token, err := utils.GenerateToken(
			user.ID.Hex(),
			user.UserName,
			user.Role,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to generate session",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Login successful",
			"token":   token,
		})
	}
}

func LoginWithPassword(client *mongo.Client)gin.HandlerFunc{
	hirersCollection:=database.OpenCollection("hirers",client)

	return func(c*gin.Context){
		var req struct {
			Identifier string `json:"identifier" binding:"required"` // Username or Phone
			Password   string `json:"password" binding:"required"`
		}


		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}

		ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
		defer cancel()

		inputIdentifier := strings.TrimSpace(req.Identifier)

		formattedPhone := inputIdentifier
		isNumeric := true

		for _, r := range inputIdentifier {
			if r < '0' || r > '9' {
				isNumeric = false
				break
			}
		}

		if isNumeric && len(inputIdentifier) == 10 {
			formattedPhone = "+91" + inputIdentifier
		}

		var hirer models.Hirers

		filter := bson.M{
			"$or": []bson.M{
				{"username": inputIdentifier},
				{"phone": inputIdentifier},
				{"phone": formattedPhone},
			},
		}

		err := hirersCollection.FindOne(ctx, filter).Decode(&hirer)

		if err != nil {
			if err == mongo.ErrNoDocuments {
				c.JSON(http.StatusNotFound, gin.H{
					"error":   "No account found",
					"message": "No account found. Create an account first",
				})
				return
			}

			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to find account",
			})
			return
		}

		if err := bcrypt.CompareHashAndPassword(
			[]byte(hirer.PasswordHash),
			[]byte(req.Password),
		); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid password",
			})
			return
		}

		if !hirer.IsPhoneVerified {
			phone := strings.TrimSpace(hirer.Phone)

			verificationID, err := utils.MessageCentralSendOTP(phone)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Failed to send phone OTP",
				})
				return
			}

			_, err = hirersCollection.UpdateOne(
				ctx,
				bson.M{"_id": hirer.ID},
				bson.M{
					"$set": bson.M{
						"verification_id": verificationID,
						"updated_at":      time.Now(),
					},
				},
			)

			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Failed to store verification session",
				})
				return
			}

			c.JSON(http.StatusForbidden, gin.H{
				"error":    "Phone verification required",
				"redirect": "/verify-phone",
				"id":       hirer.ID.Hex(),
			})
			return
		}

		token, err := utils.GenerateToken(
			hirer.ID.Hex(),
			hirer.UserName,
			hirer.Role,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to generate session",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Login successful",
			"token":   token,
		})
	}
}