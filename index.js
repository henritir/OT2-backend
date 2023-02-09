const express = require('express')
const app = express()
const sql = require('mssql')

//Määritetään objekti tietokantaan yhdistämistä varten
const config = {
    user: 'ygroup',
    password: 'Viiniot2',
    server: 'viiniserveri.database.windows.net',
    database: 'viinikanta',
    options: {
        encrypt: true
    }
}
/*Luodaan funktio,joka ottaa yhteyden tietokantaan ja
yhteyden saatuaan suorittaa annetun kyselyn. Kun kysely
on suoritettu yhteys suljetaan*/
async function suoritaKysely(kysely) {
    try {
        const yhteys = await sql.connect(config)
        const tulos = await yhteys.request().query(kysely)
        sql.close()
        return tulos
    } catch (error) {
        console.log(error)
    }
}

app.get('/', (req, res) => {
    res.send('<h1>Viinisovellus</h1>')
})

//Haetaan tiedot 'testi' taulusta
app.get('/api/testi', async (req, res) => {
    const kysely = 'SELECT * FROM testi'
    const tulos = await suoritaKysely(kysely)
    res.send(tulos.recordset)
})
//Haetaan tiedot 'viinit' taulusta
app.get('/viinit', async (req, res) => {
    const kysely1 = 'SELECT * FROM viinit'
    const tulos1 = await suoritaKysely(kysely1)
    console.log("läpi")
    res.send(tulos1.recordset)
})


const PORT = 3001
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})

