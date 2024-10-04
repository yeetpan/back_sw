import express from "express";
import cors from "cors";
import cookieParser from "cookieparser";
const app=express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,                 ///cors docs
    credentials:true
}))

app.use(express.json({limit:"16kb"}))

// for accepting url requests.
app.use(express.urlencoded({extended:true,limit:"16kb"}))


//whenever anyone wants to store public assets.
app.use(express.static("public"))

//cookieParser for safe cookie IO

app.use(cookieParser)


export  {app};
