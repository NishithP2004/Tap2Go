const express = require("express")
const { createServer } = require("node:http")
const { Server } = require("socket.io")
require("dotenv").config()
const session = require("express-session")
const {
    getAuthorisedCards,
    parseCookie,
    signJWT,
    verifyJWT
} = require("./utils")

const app = express()

app.use(express.json())
app.use(express.urlencoded({
    extended: true
}))
app.use(express.static("public/"))
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 60000, 
        secure: "auto"
    }
}))
app.set("trust proxy", 1)

const server = createServer(app)
const io = new Server(server);

io.on("connection", client => {
    console.log(`Connected to ${client.id}`)

    client.on("generate-jwt", async (payload, callback) => {
        console.log(payload)
        const jwt = await signJWT(payload)
        console.log(jwt)
        callback({
            jwt
        })
    })

    client.on("verify-jwt", async (token, callback) => {
        const payload = await verifyJWT(token)
        callback({
            payload
        })
    })
})

const PORT = process.env.PORT || 3000

const authorisedCards = []
const BASE_PATH = __dirname + "/public/"

const authenticate = (req, res, next) => {
    const cookies = parseCookie(req.headers.cookie || "");
    const serialNumber = req.session.serialNumber || cookies["serialNumber"];
    console.log("Serial Number: " + serialNumber)

    if (!serialNumber || !authorisedCards.includes(serialNumber)) {
        return res.redirect(301, "/login");
    } 
    next();
};

app.get("/", authenticate, (req, res) => {
    res.redirect(301, "/home")
})

app.get("/login", (req, res) => {
    res.sendFile(BASE_PATH + "login.html")
})

app.get("/logout", authenticate, (req, res) => {
    req.session.destroy()
    res.redirect(301, "/login")
})

app.get("/admin/verify", (req, res) => {
    const cookie = req.headers.cookie
    if(!cookie)
        res.sendStatus(400)

    const cookies = parseCookie(cookie)
    const serialNumber = cookies["serialNumber"] || req.query["serialNumber"];

    console.log(`Login Attempt by ${serialNumber}`)

    if (serialNumber && authorisedCards.includes(serialNumber)) {
        req.session.regenerate(err => {
            if (err) {
                console.error("Session regeneration error:", err);
                return res.sendStatus(500);
            }
            
            req.session.serialNumber = serialNumber;
            req.session.save(err => {
                if (err) {
                    console.error("Session save error:", err);
                    return res.sendStatus(500);
                }
                res.redirect(301, "/home");
            });
        });
    } else {
        res.sendStatus(403);
    }
})

app.get("/home", authenticate, (req, res) => {
    res.setHeader("Content-Type", "text/html")
    res.sendFile(BASE_PATH + "home.html")
})

server.listen(PORT, async () => {
    authorisedCards.push(...await getAuthorisedCards())
    console.log(`Listening on port: ${PORT}`)
    console.log("Authorised Users:", authorisedCards)
})