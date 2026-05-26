const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { DynamoDBClient, PutItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Cấu hình AWS DynamoDB
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const TABLE_NAME = 'FileMetadata';

// MH3: Cấu hình thư mục lưu file trỏ thẳng vào EFS đã mount
const EFS_MOUNT_PATH = '/mnt/efs/uploads';
if (!fs.existsSync(EFS_MOUNT_PATH)) {
    fs.mkdirSync(EFS_MOUNT_PATH, { recursive: true });
}

// Cấu hình Multer để lưu file
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, EFS_MOUNT_PATH),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// API 1: Upload file và lưu metadata
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const params = {
        TableName: TABLE_NAME,
        Item: {
            'id': { S: Date.now().toString() },
            'filename': { S: req.file.originalname },
            'saved_path': { S: req.file.path },
            'upload_time': { S: new Date().toISOString() },
            'status': { S: 'Uploaded to EFS' }
        }
    };

    try {
        await client.send(new PutItemCommand(params));
        res.json({ message: 'File secured in Fortress EFS & DynamoDB', file: req.file.originalname });
    } catch (err) {
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// API 2: Lấy danh sách metadata để hiển thị lên bảng
app.get('/api/files', async (req, res) => {
    try {
        const data = await client.send(new ScanCommand({ TableName: TABLE_NAME }));
        const files = data.Items.map(item => ({
            filename: item.filename.S,
            upload_time: item.upload_time.S,
            status: item.status.S
        }));
        res.json(files);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch DB', details: err.message });
    }
});

module.exports = app;