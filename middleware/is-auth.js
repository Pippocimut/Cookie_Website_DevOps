module.exports = ((req,res,next) => {
    if(!req.session.isLoggedIn){
        return res.status(401).render('401', {
            pageTitle: 'Not authorized',
            path: '/401',
            isAuthenticated: req.session.isLoggedIn
          });
    }
    console.log("Authorized")
    next();
});