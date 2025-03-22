require("dotenv").config()
const { SignJWT, jwtVerify } = require("jose")

const key = process.env.SESSION_SECRET
const encoder = new TextEncoder()
const secret = encoder.encode(key)

async function getAuthorisedCards() {
    const authorisedCards = []

    try {
        const serialNumbers = await fetch(process.env["GITHUB_GIST_URL"], {
            method: "GET"
        })
        .then(res => res.text())
    
        authorisedCards.push(...serialNumbers.split("\n"))
    } catch(err) {
        console.error("[!] Error retrieving data from GitHub Gist:", err)
    } finally {
        return authorisedCards
    }
}

function parseCookie(cookie) {
    const cookies = Object.fromEntries(
        cookie.split(";").map(e => e.split("=").map(v => v.trim()))
    );

    return cookies
}

async function signJWT(payload) {
    const jwt = await new SignJWT(payload)
                .setProtectedHeader({ "alg": "HS256" })
                .setIssuedAt()
                .setExpirationTime("14d")
                .sign(secret)

    return jwt
}

async function verifyJWT(token) {
    try {
        const { payload } = await jwtVerify(jwt, secret)
        return { valid: true, payload }
    } catch(err) {
        console.error("JWT Verification Failed:", err.message)
        return { valid: false }
    }
}

module.exports = {
    getAuthorisedCards,
    parseCookie,
    signJWT,
    verifyJWT
}