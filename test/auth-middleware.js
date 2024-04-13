const authMiddleware = require('../middleware/is-auth');
const expect  = require('chai').expect;
it(
    "should throw error if no authorization header is present",
    function() {
        const req = {
            get: function(headerName) {
                return null;
            }
        };

        expect(authMiddleware(req,{}, ()=>{})).to.throw('Not authenticated.');
    }
)