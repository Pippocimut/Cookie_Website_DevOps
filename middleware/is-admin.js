module.exports = ((req,res,next) => {

    if(req.session === undefined){
        return res.status(404).json({message: 'No session in request'});
    }

    if(req.session.user === undefined){
        return res.status(404).json({message: 'No user in session'});
    }

    if(!(req.session.user.role === 'admin')){
        return res.status(401).json({message: 'Unauthorized'});
    }
    
    next();
});