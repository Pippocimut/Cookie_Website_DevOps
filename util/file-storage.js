const dotenv = require('dotenv');
dotenv.config()

const { S3Client, PutObjectCommand, DeleteObjectCommand} = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const multer = require('multer');
const multerS3 = require('multer-s3')
const stream = require('stream');

const REGION = process.env.REGION; // replace with your region
const BUCKET_NAME = process.env.IMAGES_BUCKET_NAME; // replace with your bucket name

// Create an S3 client

const s3 = new S3Client({ region: REGION });

exports.getImageFileStorage = () => {
    /* return multerS3({
        s3: s3,
        bucket: BUCKET_NAME,
        metadata: function (req, file, cb) {
          console.log("Metadata function"+file.fieldname)
          cb(null, {fieldName: file.fieldname});
        },
        key: function (req, file, cb) {
          console.log("Metadata function"+Date.now().toString()+file.originalname)
          cb(null, Date.now().toString() + file.originalname)
        }
      }); */
      return {
        _handleFile(req, file, cb) {
          const pass = new stream.PassThrough();

          const uploadParams = {
            Bucket: BUCKET_NAME,
            Key: Date.now().toString() + file.originalname,
            Body: pass,
            ACL: 'public-read',
          };
    
          const upload = new Upload({
            client: s3,
            params: uploadParams
          });
    
          upload.done()
            .then(() => cb(null, {
              bucket: BUCKET_NAME,
              key: uploadParams.Key,
              location: `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${uploadParams.Key}`
            }))
            .catch((error) => cb(error));
    
          file.stream.pipe(pass);
        },
        _removeFile(req, file, cb) {
          cb(null);
        }
      };
}

exports.deleteImage = async (filePath) => {
        const image = filePath.split('/').pop();
        const deleteParams = {
            Bucket: process.env.IMAGES_BUCKET_NAME,
            Key: image
        };
    
        const command = new DeleteObjectCommand(deleteParams);
    
        try {
            await s3.send(command);
            return true
        } catch (err) {
            return false
        }
    }