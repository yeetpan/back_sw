import mongoose ,{Schema}from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const userSchema=new Schema(
    {
        username:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
            index:true              // optimizes search in DB.
        },
        email:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
        
        },
        fullname:{
            type:String,
            required:true,
            unique:true,
            trim:true,
            index:true
        
        },
        avatar:{
            type:String,        //any cloud url string
            required:true
        },
        coverImage:{
            type:String
        },
        watchHistory:[{
            type:Schema.Types.ObjectId,
            ref:"Video"
        }],
        password:{
            type:String,
            required:[true,'password is required']
        },
        refreshToken:{
            type:String,
            
        }
},{timestamps:true}
)
userSchema.pre("save",function async (next)
{
    if(!this.isModified("password")) return next();
    
    this.password= bcrypt.hash(this.password,10)
    next();
}
)


userSchema.methods.isPasswordCorrect=async function (password)
 {
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken=function(){
    jwt.sign(
        {
            _id:this._id,
            email:this.email,
            fullname:this.fullname,
            username:this.username
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken=function(){
    jwt.sign(
        {
            _id:this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User=mongoose.model("User",userSchema);