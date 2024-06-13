const jwt = require('jsonwebtoken')
const HttpError = require('../models/errorModel')



const authMiddleware = async (req,res,next) =>{
    const Authorization = req.headers.Authorization || req.headers.authorization;
    if(Authorization && Authorization.startsWith("Bearer")) {
        const token = Authorization.split(' ')[1]
        jwt,jwt.verify(token,process.env.JWT_SECRET,(err,info) => {
            if(err){
                return next(new HttpError("Unathorized. Invalid token. Login again..!",403))
            }      

            req.user = info;
            next()
        })
    } else{
        return next(new HttpError("Unathorized. No token. Login to continue..!",402))
    }
   
}


module.exports = authMiddleware