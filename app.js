require("dotenv").config();
const express = require('express');
var https = require('https');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require("jsonwebtoken");
const auth = require("./auth");
var fs = require('fs');

var options = {
    key: fs.readFileSync(process.env.SSL_KEY_LOCATION),
    cert: fs.readFileSync(process.env.SSL_CERT_LOCATION)
};

const app = express();
const httpsServer = https.createServer(options, app);
const httpServer = http.createServer(app);

app.use(express.json());
app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});
app.post('/login', (req, res) => {
    if(req.body && req.body.username && req.body.username !== '') {
        if(req.body.password === process.env.SITE_LOGIN) {
            const token = jwt.sign(
                { username: req.body.username }, 
                process.env.TOKEN_KEY, 
                { expiresIn: "1h" });
            return res.status(200).send(token);
        }
        return res.status(400).send("Invalid credentials");
    }
    return res.status(400).send("Must enter a username");
});

httpServer.listen(process.env.PORT, () => {
    console.log('listening on 3000');
});
httpsServer.listen(process.env.HTTPS_PORT, () => {
    console.log('listening on 80');
});

const chatLog = [];
function addToChatLog(log) {
    chatLog.push(log); 
    if(chatLog.length > process.env.CHAT_LOG_SIZE) {
        chatLog.shift();
    }
}

const io = new Server();
io.attach(httpServer);
io.attach(httpsServer);

io.use(auth.verifySocketToken);
io.on('connection', socket => {
    let username = socket.decoded.username;
    console.log('User ' + username + ' connected');
    socket.emit('chat log', chatLog);

    socket.on('chat message', msg => {
        let msgString = username + ': ' + msg;
        console.log(msgString);
        addToChatLog(msgString);
        io.emit('chat message', msgString);
    });
    socket.on('offer', offer => {
        socket.broadcast.emit('offer', offer);
    });
    socket.on('answer', answer => {
        socket.broadcast.emit('answer', answer);
    })
    socket.on('candidate', candidate => {
        socket.broadcast.emit('candidate', candidate);
    });
    socket.on('disconnect', () => {
        console.log('User ' + username + ' disconnected');
    });
});
