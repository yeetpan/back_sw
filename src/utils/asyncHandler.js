// basically a wrapper class for writing try/catch and async/await code.

const asyncHandler=(requestHandler)=>{
    (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next)).catch((err)=>next(err));
    }
}


export {asyncHandler}


// const asyncHandler=()=>async(req,res,next)=>{
//     try{
//         await fn(req,res,next)
//     }
//     catch(error){
//         res.status(err.code || 500).json({
//             success:false,
//             message:err.message
//         })
//     }
// }

