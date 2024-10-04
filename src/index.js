import dotenv from "dotenv";
import mongoose  from "mongoose";
import { DB_NAME } from "./consonants.js";
import connectDB from "./db/db.js";


dotenv.config({
    path:'./env'
})

connectDB()