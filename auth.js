const jwt = require('jsonwebtoken')

module.exports = function(req, res, next){
    const token = req.header('auth-token')

    if(!token) return res.status(401).send("Unauthenticated")

    try {
        const studentInfo = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        req.user = studentInfo
    } catch (error) {
        res.status(403).send("Invalid token")
    }
}