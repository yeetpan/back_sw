import { uploadonCloudinary } from "../utils/cloudinary.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt, { decode } from "jsonwebtoken"
import { upload } from "../middlewares/multer.middleware.js"

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

const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }
 try {
       const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
       const user=await User.findById(decodedToken?._id)
       if(!user){
           throw new ApiError(401,"invalid  refresh token")
       }
       if(incomingRefreshToken!=user?.refreshToken){
           throw new ApiError(401,"Refresh token is expired or used")
       }
       const options={httpOnly:true,secure:true}
       const {accessToken,newRefeshToken}= await generateAccessandRefreshTokens(user._id)
       res.status(200).
       cookie("accessToken",accessToken,options)
       .cookie("refreshToken",newRefeshToken,options)
       .json(
        new ApiResponse(
            200,
            {
                accessToken,refreshToken
            },
            `Tokens refreshed successfully`
        )
       )
   
 } catch (error) {
    throw new ApiError(401,error?.message || "Invalid refresh token")
 }
})


const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body
    const user=User.findById(req.user?._id)
      const ispasscorr= user.isPasswordCorrect(oldPassword)
     if(!ispasscorr){
        throw new ApiError(400,"password incorrect")
     }
     user.password=newPassword
    await user.save({validateBeforeSave:false})
    
    return res.
    status(200).json(new ApiResponse(200,{},"Password changed successfully"))
})

const getCurrentUser=asyncHandler(async(req,res)=>{
    return res.status(200).
    json(new ApiResponse(200,req.user,"Current user fetched successfully"))
})

const updateAccountDetails=asyncHandler(async(req,res)=>{
    const {fullName}=req.body
    
    if(!fullName){
        throw new ApiError(400,"Full Name required for updation")
    }
   const user= User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                fullName:fullName
                //fullName {this also can be given}
            }
        },
        {new:true}
        
    ).select("-password")

    return res.status(200).
            json(new ApiResponse(400,user,"User details updated successfully!"))

})

const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar=await uploadonCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError("Error while uploading new avatar")
    }

    User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200).
    json(new ApiResponse(400,"Avatar updated successfully!"))

})

const updateUserCoverImage=asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    const coverImage=await uploadonCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError("Error while uploading new coverImage")
    }

   const user= User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200).
    json(new ApiResponse(400,user,"coverImage updated successfully!"))

})

export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
};