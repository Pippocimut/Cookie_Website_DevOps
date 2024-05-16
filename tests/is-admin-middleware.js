const adminMiddleware = require('../middleware/is-admin');
const chai = require('chai') , chaiHttp = require('chai-http');
var sinon = require("sinon");
var sinonChai = require("sinon-chai");

chai.should();
chai.use(sinonChai);
const expect  = chai.expect;

describe("Tests for the isAdmin middleware", () => {
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
                    json: function (message) {
                        expect(statusCode).to.equal(401);
                        expect(message.message).to.equal('Unauthorized');
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
                    json: function (page, data) {
                    }
                }
            }
        }
        const next = sinon.spy();

        adminMiddleware(req,res,next);
        expect(next).to.have.been.called;
    });
    it('Should throw an error if no user is found', function (done) {

         req = {
            session: {
            }
        }
        res = {
            status: function (statusCode) {
                return {
                    json: function (message) {
                        expect(statusCode).to.equal(404);
                        expect(message.message).to.equal('No user in session');
                        done();
                    }
                }
            }
        }

        adminMiddleware(req,res,()=>{});
    });
    it('Should throw an error if now session has been created', function (done) {

        req = {
       }
       res = {
           status: function (statusCode) {
               return {
                   json: function (message) {
                       expect(statusCode).to.equal(404);
                       expect(message.message).to.equal('No session in request');
                       done();
                   }
               }
           }
       }

       adminMiddleware(req,res,()=>{});
   });

});