package controllers

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/ayushmehta03/editorzzz-radar-backend/internal/database"
	"github.com/ayushmehta03/editorzzz-radar-backend/internal/models"
	"github.com/ayushmehta03/editorzzz-radar-backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func ResendPhoneOtp(client *mongo.Client, redisClient *redis.Client) gin.HandlerFunc {
	return func(c *gin.Context) {

		var req struct {
			UserID string `json:"user_id" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "User ID required",
			})
			return
		}

		// Convert string ID to MongoDB ObjectID
		userID, err := primitive.ObjectIDFromHex(req.UserID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid user ID",
			})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		hirerCollection := database.OpenCollection("hirers", client)

		var hirer models.Hirers

		if err := hirerCollection.FindOne(
			ctx,
			bson.M{"_id": userID},
		).Decode(&hirer); err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Hirer not found",
			})
			return
		}

		if hirer.IsPhoneVerified {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Phone already verified",
			})
			return
		}

		cooldown, err := utils.HandleOtpResendBackoff(
			redisClient,
			fmt.Sprintf("otp:phone:%s", hirer.ID.Hex()),
		)

		if err != nil {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": err.Error(),
			})
			return
		}

		phone := strings.TrimSpace(hirer.Phone)

		verificationID, err := utils.MessageCentralSendOTP(phone)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to send OTP",
			})
			return
		}

		_, err = hirerCollection.UpdateOne(
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
				"error": "Failed to update verification",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":  "Phone OTP resent successfully",
			"cooldown": int(cooldown.Seconds()),
		})
	}
}