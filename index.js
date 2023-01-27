const express = require('express')
const app = express()

let viinit = [
    {
        id: 1,
        name: "Wine",
        content: "Hedelmäinen",
        rate: 7
    },
    {
        id: 2,
        name: "Walkkari",
        content: "Hapokas",
        rate: 8
    }
]

app.get('/', (req, res) => {
    res.send('<h1>Viinisovellus</h1>')
})

app.get('/api/viinit', (req, res) => {
    res.json(viinit)
})

app.get('/api/viinit/:id', (request, response) => {
    const id = Number(request.params.id)
    const viini = viinit.find(viini => viini.id === id)

    if (viini) {
        response.json(viini)
    } else {
        response.status(404).end()
    }
})

const PORT = 3001
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})