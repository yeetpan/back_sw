import {asyncHandler} from "../utils/asyncHandler.js"
import ApiError from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadonCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
const registerUser=asyncHandler(
    async (req,res)=>{
   // get user details
   const {username,email,fullname,avatar,coverImage,password}=req.body
   
   //validation-not empty
   if([fullname,username,email,password].some((field)=> field?.trim()===""))
{
    throw new ApiError (400,"All fields are required")
}   // check if user already exists : username,email
    const existedUser= await User.findOne({
        $or:[{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409,"Username with email or username already exists")
    }
    const avatarLocalPath=req.files?.avatar[0]?.path;
    const coverimgLocalPath=req.files?.coverImage[0]?.path;
   // file upload kiya ya nahi.
   if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is required")
   }
   //upload them to cloudinary,avatar.
   const avtr=await uploadonCloudinary(avatarLocalPath)
   const cvrimg=await uploadonCloudinary(coverimgLocalPath)

   
   if(!avtr){
    throw new ApiError(400,"Avatar file is required")

   }

   
   // user object in DB.- db call.
   const user=await User.create({
    fullname,
    avatar:avtr.url,
    coverImage:cvrimg?.url||"",
    email,
    password,
    username:username.toLowerCase()
   });
   // remove password & refresh token from res and check for user hai ya nahi.
  const createdUser= await User.findById(user._id).select(
    "-password -refreshToken"
  );
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while creating user")
    }
   // return res
   return res.status(201).json(
    new ApiResponse(200,createdUser,"user Registered Successfully")
)

    }

) 



export {registerUser};