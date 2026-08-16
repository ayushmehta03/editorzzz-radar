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


func LoginEditors(client *mongo.Client)gin.HandlerFunc{
	editorCollection:=database.OpenCollection("editors",client)
	return func(c*gin.Context){

	var req struct{
		Identifier string `json:"identifier" binding:"required"` // Username or Phone
            Password   string `json:"password" binding:"required"`
	}

	if err:=c.ShouldBindJSON(&req);err!=nil{
		c.JSON(http.StatusBadRequest,gin.H{"error":"Invalid input"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
        defer cancel()

        inputIdentifier := strings.TrimSpace(req.Identifier)
        
       
        formattedPhone := inputIdentifier
        isNumeric := true
        for _, r := range inputIdentifier {
            if r < '0' || r > '1' { // simple digit checking
                if r < '0' || r > '9' {
                    isNumeric = false
                    break
                }
            }
        }
        
        if isNumeric && len(inputIdentifier) == 10 {
            formattedPhone = "+91" + inputIdentifier
        }

		var user models.User
        filter := bson.M{
            "$or": []bson.M{
                {"username": inputIdentifier},
                {"phone":    inputIdentifier},
                {"phone":    formattedPhone},
            },
        }


	}
}