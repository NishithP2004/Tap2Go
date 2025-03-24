import express from "express"
import {
    createServer
} from "node:http"
import {
    Server
} from "socket.io"
import "dotenv/config"
import session from "express-session"
import {
    getAuthorisedCards,
    parseCookie,
    signJWT,
    verifyJWT
} from "./utils.js"
import {
    connectToDatabase
} from "./mongo.js"
import {
    fileURLToPath
} from "node:url"
import path from "node:path"

const db = await connectToDatabase()

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

    /* client.on("generate-jwt", async (payload, callback) => {
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
    }) */

    client.on("register", async (data, callback) => {
        try {
            const collection = db.collection("registrations")
            const res = await collection.updateOne({
                eventId: data.eventId,
                serialNumber: data.serialNumber
            }, {
                $set: {
                    eventId: data.eventId,
                    serialNumber: data.serialNumber,
                    amount: data.amount,
                    name: data.name,
                    checkedIn: false
                }
            }, {
                upsert: true
            })

            callback({
                success: res.acknowledged
            })
        } catch (err) {
            callback({
                success: false,
                error: err.message
            })
        }
    })

    client.on("verify", async (data, callback) => {
        try {
            const collection = db.collection("registrations");
            const res = await collection.findOneAndUpdate(
                {
                    eventId: data.eventId,
                    serialNumber: data.serialNumber
                },
                {
                    $set: { checkedIn: true }
                },
                {
                    projection: { _id: 0 },
                    returnDocument: "before" 
                }
            );
    
            callback({
                success: true,
                verified: res !== null && res.checkedIn === false, 
                data: res
            });
        } catch (err) {
            console.error("Error verifying registration: " + err.message);
            callback({
                error: err.message
            });
        }
    });
    
})

const PORT = process.env.PORT || 3000

const authorisedCards = []

const __filename = fileURLToPath(
    import.meta.url)
const __dirname = path.dirname(__filename)
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
    if (!cookie)
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
    authorisedCards.push(...(await getAuthorisedCards()))
    console.log(`Listening on port: ${PORT}`)
    console.log("Authorised Users:", authorisedCards)
})