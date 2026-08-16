package services

import (
	"context"
	"net/http"
	"time"

	"github.com/ayushmehta03/editorzzz-radar-backend/internal/database"
	"github.com/ayushmehta03/editorzzz-radar-backend/internal/models"
	"github.com/ayushmehta03/editorzzz-radar-backend/internal/utils"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)



func VerifyPhoneOTP(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {

		// request body struct for user id and otp

		var req struct {
			UserID string `json:"user_id" binding:"required"`
			OTP    string `json:"otp" binding:"required"`
		}

		// bind the json body to the struct and validate required fields

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}

		userID, err := primitive.ObjectIDFromHex(req.UserID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user id"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		editorCollection := database.OpenCollection("editors", client)

		// find the user with the id given in request body
		var hirer models.Hirers
		if err := editorCollection.FindOne(ctx, bson.M{
			"_id": userID,
		}).Decode(&hirer); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		// already verified
		if hirer.IsPhoneVerified {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Phone number already verified"})
			return
		}

		// verificationId must exist (generated when OTP was sent)
		if hirer.VerificationID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No active phone verification found"})
			return
		}

		//  VERIFY OTP VIA MESSAGE CENTRAL
		if err := utils.MessageCentralVerifyOTP(hirer.VerificationID, req.OTP); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired OTP"})
			return
		}

		// update user record: set phone verified and remove verificationId
		update := bson.M{
			"$set": bson.M{
				"is_phone_verified": true,
				"updated_at":       time.Now(),
			},
			"$unset": bson.M{
				"verification_id": "",
			},
		}

		// update the user record in database with the above update document

		if _, err := editorCollection.UpdateOne(
			ctx,
			bson.M{"_id": userID},
			update,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Verification failed"})
			return
		}

		// generate auth token for the user after successful phone verification

		token,err:=utils.GenerateToken(hirer.ID.Hex(),hirer.UserName,hirer.Role)
		if err!=nil{
			c.JSON(http.StatusInternalServerError,gin.H{"error":"Token generation failed"})
			return 
		}
		// return success response with the token

		c.JSON(http.StatusOK, gin.H{
			"message": "Phone number verified successfully. Thank You !",
			"token": token,
		})
	}
}