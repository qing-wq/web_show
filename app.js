const express = require('express');
const multer = require('multer');
const unzipper = require('unzipper');
const fs = require('fs');
const path = require('path');
const app = express();
const uploadPath = '/uploads';
const staticPath = "./public"
const filePath = staticPath + uploadPath

app.use(express.static(filePath));

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
    let fileName = req.file.originalname
    if (!req.file) {
        return res.status(400).send('未上传文件');
    }else if (path.extname(fileName) !== ".zip") {
        return res.status(400).send('请上传zip文件')
    }

    let username = req.body.username;

    // 文件上传完成后执行解压操作
    fs.createReadStream(req.file.path)
        .pipe(unzipper.Extract({path: path.join(filePath, username)}))
        .on('finish', () => {
            console.log('[INFO]: ' + fileName + '解压完成');
            // 删除zip
            fs.unlink(req.file.path, (err) => {
                if (err) {
                    console.log('[Error]: 删除文件失败 ' + req.params.path)
                }
            })
            res.redirect('/files');
        });

});

// 返回文件上传表单
app.get('/', (req, res) => {
    res.send(`
    <form action="/upload" method="POST" enctype="multipart/form-data">
      <label for="username">用户名</label>
      <input type="text" id="username" name="username">
      <input type="file" name="file">
      <br><br>
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
        // files = files.filter(file => fs.statSync(`${filePath}/${file}`).isFile());
        // files = files.filter(file => path.extname(file) === ".html");

        const fileLinks = files.map(file => `<a href="/${file}">${file}</a>`);

        res.send(`
      <h1>解压后的文件列表：</h1>
      ${fileLinks.join('<br>')}
    `);
    });
});

const root = 'public/uploads'
const directoryPath = path.join(__dirname, root);

// 展示指定用户文件
app.get('/file/:username', function (req, res) {
    let username;
    if (req.params.username === '') {
        username = root;
    } else {
        username = req.params.username
    }
    let filePath = path.join(directoryPath,username)
    fs.readdir(filePath, function (err, files) {
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        }

        // 存储超链接信息的数组
        let linkArr = [];

        // 遍历文件和子文件夹
        files.forEach(function (file) {
            // const isDirectory = fs.statSync(path.join(filePath, file)).isDirectory();
            // if (isDirectory) {
                const link = `<a href="/${username}/${file}">${file}</a>`;
                linkArr.push(link);
            // }
        });

        // 将结果作为响应发送到浏览器
        res.send(linkArr.join('<br>'));
    });
});

app.listen(3000, () => {
    console.log('服务已启动');
});

// 返回解压后的文件
app.get('/files/:filename', (req, res) => {
    const filePath = `${filePath}/${req.params.filename}`;
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('文件不存在');
    }

    res.sendFile(filePath);
});
