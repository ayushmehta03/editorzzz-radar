package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)


type Hirers struct{
	ID primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`

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

type User struct{
	ID primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`


	// identity of the user
	FullName string  `bson:"name" json:"name" validate:"required,min=1,max=30"`
	UserName string `bson:"username" json:"username" validate:"required,min=5,max=20"`
	
	Phone string `bson:"phone" json:"phone" validate:"required"`


	PasswordHash string `bson:"password" json:"password"`
	
	// role

	// by default it will be editor only will set that in the backend auth
	Role string `bson:"role" json:"role"`

	/* visibility required data for the hiring page 

	// is hiring listed is managed by admin 

	// few rules described below for the profile which will be visible on the hiring page 

	

	1. The admin must turn is hiring listed to true 
	2. They should allow their profile to show on hiting page 
	3. The employment status should not be working it should be open to work
	*/

	ShowOnHiringPage bool `bson:"show_on_hiring_page"  json:"show_on_hiring_page"`
	IsHiringListed bool `bson:"is_hiring_listed" json:"is_hiring_listed"`
	EmploymentStatus string  `bson:"employment_status" json:"employment_status"`


	// contest cred

	Ban bool `bson:"ban" json:"ban"`


	// verification

	IsPhoneVerified bool `bson:"is_phone_verified" json:"is_phone_verified"`
	IsBlueTickP bool `bson:"is_verified" json:"is_verified"`

	//otp check and method

	OtpHash string `bson:"otpHash,omitempty" json:"otpHash"`
	OtpExpiry time.Time `bson:"otpExpiry,omitempty" json:"otpExpiry"`

// api req for mobile otp

 VerificationID string `bson:"verification_id,omitempty"`

	//meta data for the user profile display




	ProfileImage string `bson:"profile_image,omitempty" json:"profile_image,omitempty"`
	Bio string `bson:"bio,omitempty" json:"bio,omitempty"`
	


	//total score fields based on the score given by the judge of all the past tournaments

	TotalScore int `bson:"total_score" json:"total_score"`



	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`

	// will use this in the websockets chat for real time status 

	RegisteredTournaments []primitive.ObjectID `bson:"registered_tournaments,omitempty"`
	LastSeen *time.Time `bson:"last_seen,omitempty" json:"last_seen,omitempty"`

	// creating a bool hashmap to store the expertise depending upon the tournament
	Expertise map[string]bool `bson:"skills_expertise,omitempty" json:"skills_expertise,omitempty"`


}