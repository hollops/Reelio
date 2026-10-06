const jwt = require('jsonwebtoken');

//middleware to verify the token

exports.protect = (req, res, next) => {
        const token = req.headers.authorization && req.headers.authorization.split(' ')[1]; //get the token from the header
        if (!token) {
                return res.status(401).json({ message: 'Not authorized, no token' });
        }

        try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = decoded;
                next();
        } catch (error) {
                return res.status(401).json({ message: 'Not authorized, token failed' });
        }
};
// Like protect, but a missing or bad token is NOT an error — it just means "nobody".
//
// Needed by public routes that show something extra to a signed-in viewer: watching a
// video is open to everyone, but "have I liked this?" can only be answered for someone.
// Using protect there would lock visitors out; ignoring the token entirely would show a
// signed-in viewer an unlit like button on a video they already liked.
exports.optionalProtect = (req, res, next) => {
        const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
        if (!token) return next();

        try {
                req.user = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
                // An expired or forged token on a public route is simply ignored: the page
                // still loads, just as it would for a visitor who never signed in.
        }
        return next();
};
