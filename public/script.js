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
            const {
                records
            } = message

            resolve({
                serialNumber,
                records: records.map(record => {
                    const textDecoder = new TextDecoder()
                    return textDecoder.decode(record.data)
                })
            })
        })
    })
}

async function writeNFC(records) {
    try {
        const ndef = new NDEFReader()
        await ndef.write({
            records
        })
        .then(() => log("Data written successfully!"))
    } catch(err) {
        log("Error writing data to NFC Tag:", err.message)
    }
}