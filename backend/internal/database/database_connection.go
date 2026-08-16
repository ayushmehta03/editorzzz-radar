package database

import (
	"context"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func ConnectMongo()*mongo.Client{
	mongoUri:=os.Getenv("MONGO_URI")

	if mongoUri == "" {
		log.Fatal("MONGODB_URI not set")
	}

clientOptions := options.Client().
		ApplyURI(mongoUri).
		SetConnectTimeout(10 * time.Second)

	ctx,cancel:=context.WithTimeout(context.Background(),10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		log.Fatal("Mongo connection failed:", err)
	}

	// Ping MongoDB to verify connection for network check and stability
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatal("Mongo ping failed:", err)
	}

	log.Println("MongoDB connected successfully")


	// return the client once everything is done
	return client
}

func OpenCollection(name string,client *mongo.Client) *mongo.Collection{
	databaseName:=os.Getenv("DATABASE_NAME")
	 if databaseName==""{
		log.Fatal("database name is not set")
	 }

	 return client.Database(databaseName).Collection(name);
}