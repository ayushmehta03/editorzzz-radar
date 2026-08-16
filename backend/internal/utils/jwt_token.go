package utils

import (
	"os"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/golang-jwt/jwt/v5"
)

type JWTClaims struct{
	HirerId string `json:"hirer_id"`
	Username string `json:"username"`
	Role string `json:"role"`
	jwt.RegisteredClaims
}


func GenerateToken(hirerId,username,role string)(string,error){

	secret:=os.Getenv("JWT_SECRET")

	claims:=JWTClaims{
		HirerId: hirerId,
		Username: username,
		Role: role,
      RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(48*time.Hour)),
			IssuedAt: jwt.NewNumericDate(time.Now()),
			
		},
		
	}

	token:=jwt.NewWithClaims(jwt.SigningMethodHS256,claims)


	return token.SignedString([]byte(secret));



}



func VerifyToken(tokenStr string)(*JWTClaims,error){
	
	// get the secret
		secret:=os.Getenv("JWT_SECRET")

		// check the signing method algo ,secretkey and expiry as well as issued time

		token,err:=jwt.ParseWithClaims(
			tokenStr,
			&JWTClaims{},
			func (token *jwt.Token)(interface{},error){
				return []byte(secret),nil
			},
		)

		if err!=nil{
			return nil,err
		}

		// place the value inside claims struct

		claims,ok:=token.Claims.(*JWTClaims)

		if !ok || !token.Valid{
			return nil,jwt.ErrTokenInvalidClaims
		}

		// return the claims struct 

		// so that email,userid and role can be trusted

		return claims,nil


}