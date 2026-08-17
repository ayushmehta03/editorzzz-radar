package routes

import (
	"github.com/ayushmehta03/editorzzz-radar-backend/internal/controllers"
	"github.com/ayushmehta03/editorzzz-radar-backend/services"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"
)

// define all the auth related routes here and link the controller and service functions with the routes


func AuthRoutes(router *gin.Engine,client*mongo.Client, redis *redis.Client){

	auth:=router.Group("/api/auth")

	auth.POST("/register",controllers.RegisterAccount(client))
	auth.POST("/verify-phone",services.VerifyPhoneOTP(client))
	auth.POST("/login",controllers.LoginWithPassword(client))
	auth.POST("/login-editors",controllers.LoginEditors(client))
auth.POST("/forgot-password",controllers.ForgetPassword(client))
	auth.POST("/reset-password",controllers.ResetPassword(client))
	auth.GET("/phone-cooldown", controllers.CheckPhoneCooldown(redis,client))

}