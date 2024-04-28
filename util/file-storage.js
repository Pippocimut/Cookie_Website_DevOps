const dotenv = require('dotenv');
dotenv.config()

const aws = require('aws-sdk');
const multerS3 = require('multer-s3');
const { image } = require('pdfkit');

aws.config.update({
    secretAccessKey: process.env.SECRET_S3_ACCESS_KEY,
    accessKeyId: process.env.S3_ACCESS_KEY,
    region: process.env.REGION
});

const s3 = new aws.S3();

exports.getImageFileStorage = () => {
    return multerS3({
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
exports.deleteImage = (filePath) => {
    const image = filePath.split('/').pop()
    s3.deleteObject({
        Bucket: process.env.IMAGES_BUCKET_NAME,
        Key: image
    },function (err,data){})
}