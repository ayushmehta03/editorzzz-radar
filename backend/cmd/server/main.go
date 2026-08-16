package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/ayushmehta03/editorzzz-radar-backend/internal/database"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/joho/godotenv"
)

func main(){
	
if os.Getenv("ENV")!="production"{
if err:=godotenv.Load();err!=nil{
log.Println("warning: .env file is missing in the system env")

}
}

// create the router with the help of gin
router:=gin.Default()


// connect to the database
client:=database.ConnectMongo()



defer func(){
if err:=client.Disconnect(context.Background());err!=nil{
log.Printf("Mongo disconnect error: %v",err)
}
}()



router.Use(cors.New(cors.Config{
AllowAllOrigins: true,
AllowMethods: []string{
"GET",
"POST",
"PUT",
"PATCH",
"DELETE",
"OPTIONS",
},
AllowHeaders: []string{
"Origin",
"Content-Type",
"Authorization",
},
ExposeHeaders: []string{
"Content-Length",
},
AllowCredentials: false, 
}))



port:=os.Getenv("PORT")

if port==""{
port="1100"
}

log.Printf("Server started on port %s",port)

if err:=router.Run(":"+port);err!=nil{
fmt.Println("Failed to start server:",err)
}




}