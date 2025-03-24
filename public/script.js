function log(data) {
    console.log(data)
    alert(data)
}

async function readNFC() {
    const ndef = new NDEFReader()
    await ndef.scan()

    return new Promise((resolve, reject) => {
        ndef.addEventListener("readingerror", () => {
            reject("Arg! Cannot read data from NFC Tag. Try another one ?")
        })

        ndef.addEventListener("reading", ({
            message,
            serialNumber
        }) => {
            /* const {
                records
            } = message */

            resolve({
                serialNumber,
                /* records: records.map(record => {
                    const textDecoder = new TextDecoder()
                    return textDecoder.decode(record.data)
                }) */
            })
        })
    })
}

function chunkStr(str, size) {
    const n = parseInt(str.length / size)
    console.log(n)
    const arr = []
    for(let i=0; i<str.length; i += size) {
        const subtr = str.slice(i, i+size)
        arr.push(subtr)
    }

    return arr
} 

async function writeNFC(token) {
    try {
        const ndef = new NDEFReader()
        const records = chunkStr(token, 130).map(str => ({ recordType: "text", data: str }))
        await ndef.write({
            records
        })
        .then(() => log("Data written successfully!"))
    } catch(err) {
        log("Error writing data to NFC Tag:", err)
    }
}