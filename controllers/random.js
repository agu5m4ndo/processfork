const { fork } = require('child_process')
const path = require('path')

const generateRandom = (req, res) => {
    const amount = req.query.cant || 100000000;
    const forked = fork(path.join(__dirname, 'middleware', 'computo.js'))
    let object = {}
    forked.send(amount)
    forked.on('message', completed => {
        object = completed;
        res.status(200).json({ result: amount, object })
    })
}

module.exports = { generateRandom }