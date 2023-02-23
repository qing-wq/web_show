const express = require('express');
const multer = require('multer');
const unzipper = require('unzipper');
const fs = require('fs');
const path = require('path');
const app = express();
const uploadPath = '/uploads';
const staticPath = "./public"
const filePath = staticPath + uploadPath

app.use(express.static(staticPath));


// 设置文件上传的中间件
const uploads = multer({
    // 文件上传的位置
    dest: filePath,
    fileFilter(req, file, callback) {
        // 解决中文名乱码的问题
        file.originalname = Buffer.from(file.originalname, "latin1").toString(
            "utf8"
        );
        callback(null, true);
    },
});


// 处理文件上传和解压
app.post('/upload', uploads.single('file'), (req, res, next) => {
    if (!req.file) {
        return res.status(400).send('未上传文件');
    }

    // 文件上传完成后执行解压操作
    fs.createReadStream(req.file.path)
        .pipe(unzipper.Extract({path: filePath}))
        .on('finish', () => {
            console.log('文件解压完成');
            res.redirect('/files');
        });
});

// 返回文件上传表单
app.get('/', (req, res) => {
    res.send(`
    <form action="/upload" method="POST" enctype="multipart/form-data">
      <input type="file" name="file">
      <br>
      <button type="submit">上传</button>
    </form>
  `);
});

// 展示解压后的文件列表
app.get('/files', (req, res) => {
    fs.readdir(filePath, (err, files) => {
        if (err) {
            console.error(err);
            res.status(500).send('服务器错误');
        }

        // 过滤掉非文件的项目
        files = files.filter(file => fs.statSync(`${filePath}/${file}`).isFile());
        files = files.filter(file => path.extname(file) === ".html");

        const fileLinks = files.map(file => `<a href="/uploads/${file}">${file}</a>`);

        res.send(`
      <h1>解压后的文件列表：</h1>
      ${fileLinks.join('<br>')}
    `);
    });
});

// 返回解压后的文件
app.get('/files/:filename', (req, res) => {
    const filePath = `${filePath}/${req.params.filename}`;
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('文件不存在');
    }

    res.sendFile(filePath);
});

app.listen(8080, () => {
    console.log('服务已启动');
});
