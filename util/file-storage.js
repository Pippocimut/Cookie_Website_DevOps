const dotenv = require('dotenv');
dotenv.config()

const aws = require('aws-sdk');
const multerS3 = require('multer-s3');

aws.config.update({
    secretAccessKey: process.env.SECRET_S3_ACCESS_KEY,
    accessKeyId: process.env.S3_ACCESS_KEY,
    region: process.env.REGION
});

const s3 = new aws.S3();


exports.getImageFileStorage = () => {
    multerS3({
        s3: s3,
        bucket: process.env.IMAGES_BUCKET_NAME,
        acl: 'public-read',
        metadata: function (req, file, cb) {
            cb(null, {fieldName: file.fieldname});
        },
        key: function (req, file, cb) {
            cb(null, Date.now().toString()+file.originalname)
        }
    });
}