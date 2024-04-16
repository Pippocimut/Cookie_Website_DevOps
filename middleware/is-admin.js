module.exports = ((req,res,next) => {

    if(!(req.session.user.role === 'admin')){
        return res.status(401).render('401', {
            pageTitle: 'Not authorized',
            path: '/401',
            isAuthenticated: req.session.isLoggedIn
          });
    }
    next();
});