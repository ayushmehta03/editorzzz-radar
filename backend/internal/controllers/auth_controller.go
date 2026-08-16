package controllers

import (
	"net/http"

	"github.com/ayushmehta03/editorzzz-radar-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"go.mongodb.org/mongo-driver/mongo"
)


func RegisterAccount(client *mongo.Client)gin.HandlerFunc{
	return func(c*gin.Context){


		var hirers models.Hirers


		if err:=c.ShouldBindJSON(&hirers);err!=nil{
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


		


	}

}