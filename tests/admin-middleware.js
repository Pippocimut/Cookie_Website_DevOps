const adminMiddleware = require('../middleware/is-admin');
const chai = require('chai') , chaiHttp = require('chai-http');
const request = require('request');
var sinon = require("sinon");
var sinonChai = require("sinon-chai");

chai.should();
chai.use(sinonChai);
chai.use(chaiHttp);
const expect  = chai.expect;

describe("admin middleware tests", () => {

    before(function(done){
        done();
    });

    it('should respond with error page if not admin', function (done) {

        req = {
            session: {
                user: {
                    role: 'user'
                }
            }
        }
        res = {
            status: function (statusCode) {
                return {
                    render: function (page, data) {
                        expect(page).to.equal('401');
                        expect(data.pageTitle).to.equal('Not authorized');
                        expect(data.path).to.equal('/401');
                        expect(data.isAuthenticated).to.equal(req.session.isLoggedIn);
                        done();
                    }
                }
            }
        }
        adminMiddleware(req,res, ()=>{});
    });

    it('should continue execution page if admin', function () {

         req = {
            session: {
                user: {
                    role: 'admin'
                }
            }
        }
        res = {
            status: function (statusCode) {
                return {
                    render: function (page, data) {
                    }
                }
            }
        }
        const next = sinon.spy();

        adminMiddleware(req,res,next);
        expect(next).to.have.been.called;
    });
});