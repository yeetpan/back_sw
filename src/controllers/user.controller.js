import { uploadonCloudinary } from "../utils/cloudinary.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const generateAccessandRefreshTokens=async(userId)=>{
    try {
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()
        user.refreshToken=refreshToken
        await user.save({
            validateBeforeSave:false
        })
        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,'something went wrong')
    }
}

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
    let coverimgLocalPath;
   // file upload kiya ya nahi.
   if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is required")
   }
   if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
    coverimgLocalPath=req.files.coverImage[0].path
   }
   //upload them to cloudinary,avatar.
   const avtr=await uploadonCloudinary(avatarLocalPath)
   const cvrimg=await uploadonCloudinary(coverimgLocalPath)

   
   if(!avtr){
    throw new ApiError(400,"Avatar file is required")

   }

   
   // user object in DB.- db call.
   const user=await User.create({
    fullName:fullname,
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

const loginUser=asyncHandler(async(req,res)=>{
   // req body->data
   const {email,username,password}=req.body
      // username or email
   if (!username && !email) {
    throw new ApiError(400,"username or email is required")
   }
      // find the user
   const user=await User.findOne({
    $or:[{username},{email}]
   })

   if(!user){
    throw new ApiError(404,"User does not exist")
   }
   //password check
   const isPasswordValid=await user.isPasswordCorrect(password)            // take the instance of the user (not the mongoDB initialised model.)
   if(!isPasswordValid){
    throw new ApiError(401,"Invalid user credentials ")
   }
   //access and refresh token
   const {accessToken,refreshToken}=await generateAccessandRefreshTokens(user._id)

   //send cookie
   const loggedInUser=await User.findById(user._id).select(
    "-password -refreshToken"
   )
   const options={httpOnly:true,secure:true}
   res.status(200).
   cookie("accessToken",accessToken,options)
   .cookie("refreshToken",refreshToken,options)
   .json(
    new ApiResponse(
        200,
        {
            user:loggedInUser,accessToken,refreshToken
        },
        `User logged in successfully`
    )
   )
})

const logOutUser=asyncHandler(async(req,res)=>{
 await User.findByIdAndUpdate(
    req.user._id,
    {
        $set:{
            refreshToken:undefined
        }
    },
    {
        new:true
    }

 )
 const options={httpOnly:true,secure:true}
 return res.
 status(200).
 clearCookie("accessToken",options).
 clearCookie("refreshToken",options).
 json(new ApiResponse(200,{},"User logged out"))
 
})

export {
    registerUser,
    loginUser,
    logOutUser
};