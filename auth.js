const jwt = require("jsonwebtoken");

const config = process.env;

const auth = {

  verifyToken: function(req, res, next) {
    const token = req.body.token || req.query.token || req.headers["x-access-token"];

    if (!token) {
      return res.status(403).send("A token is required for authentication");
    }
    try {
      const decoded = jwt.verify(token, config.TOKEN_KEY);
      req.decoded = decoded;
    } catch (err) {
      return res.status(401).send("Invalid Token");
    }
    return next();
  },
  verifySocketToken: function(socket, next) {
    if (socket.handshake.query && socket.handshake.query.token){
      jwt.verify(socket.handshake.query.token, config.TOKEN_KEY, function(err, decoded) {
        if (err) {
          console.log('error1');
          return next(new Error('Authentication error'));
        }
        console.log('success');
        socket.decoded = decoded;
        next();
      });
    }
    else {
      console.log('error2');
      next(new Error('Authentication error'));
    }    
  }
}

module.exports = auth;