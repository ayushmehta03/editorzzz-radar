package models

import (
	"time"

)


type Hirers struct{

	FullName string `bson:"full_name" json:"full_name"`
	UserName string `bson:"username" json:"username" validate:"required,min=5,max=20"`
	
	Phone string `bson:"phone" json:"phone" validate:"required"`


	PasswordHash string `bson:"password" json:"password"`

	Role string `bson:"role" json:"role"`

	CompanyName string `bson:"company_name" json:"company_name"`

	IsPhoneVerified bool `bson:"is_phone_verified" json:"is_phone_verified"`
	IsGreenTickP bool `bson:"is_verified" json:"is_verified"`


	ProfileImage string `bson:"profile_image,omitempty" json:"profile_image,omitempty"`
	Bio string `bson:"bio,omitempty" json:"bio,omitempty"`
	
	 VerificationID string `bson:"verification_id,omitempty"`



	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`


}