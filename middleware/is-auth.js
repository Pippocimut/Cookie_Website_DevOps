module.exports = ((req,res,next) => {
    if(!req.session.isLoggedIn){
        console.log("No login")
        return res.redirect('/login')
    }
    next();
});