const express = require('express')
const app = express()
const sql = require('mssql')
const cors = require('cors')
const bcrypt = require("bcrypt")
app.use(cors())
app.use(express.json())


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
//tarkastaa onko sähköposti oikeassa muodossa
function isEmail(email) {
    var emailFormat = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/
    if (email !== '' && email.match(emailFormat)) {
         return true
    } else {
        return false
    }    
}

app.get('/', (req, res) => {
    res.send('<h1>Viinisovellus</h1>')
})

//Haetaan tiedot 'testi' taulusta
app.get('/api/testi', async (req, res) => {
    const kysely = 'SELECT * FROM testi'
    const tulos = await suoritaKysely(kysely)
    console.log(tulos)
    res.send(tulos.recordset)
})
//Haetaan tiedot 'kayttajat' taulusta
app.get('/kayttajat', async (req, res) => {
    const kysely = 'SELECT * FROM kayttajat'
    const tulos = await suoritaKysely(kysely)
    console.log(tulos)
    res.send(tulos.recordset)
})
//Haetaan tiedot 'viinit' taulusta
app.get('/viinit', async (req, res) => {
    const kysely1 = 'SELECT * FROM viinit WHERE viini_id < 101'
    const tulos1 = await suoritaKysely(kysely1)
    res.send(tulos1.recordset)
})
//Uuden käyttäjän lisäys 'kayttajat' tauluun
app.post('/rekisteroidy', async (req, res) => {
    const kayttajanimi = req.body.kayttajanimi
    const salasana = await bcrypt.hash(req.body.salasana, 10)
    const sposti = req.body.sposti

    if (!kayttajanimi || !salasana || !sposti || isEmail(sposti) == false) {
        return res.status(400).json('Käyttäjänimi, salasana tai sähköposti ei kelpaa')
    } else {
        try {
            await suoritaKysely(`INSERT INTO kayttajat (kayttajanimi, salasana, sposti) VALUES ('${kayttajanimi}', '${salasana}', '${sposti}')
            `)
            res.status(200).send('Uusi käyttäjä lisätty')
        } catch (error) {
            res.status(500).send('Käyttäjän lisäys epäonnistui')
        }
    }
})
//Käyttäjän poisto 'kayttajat' taulusta käyttäjän id:n perusteella
app.delete('/kayttajat/:kayttajaID', async (req, res) => {
    try {
        await suoritaKysely(`DELETE FROM kayttajat WHERE kayttajaID = ${req.params.kayttajaID}`)
        res.status(200).send('Käyttäjä poistettu onnistuneesti')
    } catch (error) {
        res.status(500).send('Käyttäjän poistaminen epäonnistui')
    }
})
//Käyttäjätietojen muokkaus
app.put('/kayttajat', async (req, res) => {
    const kayttajanimi = req.body.kayttajanimi
    const salasana = await bcrypt.hash(req.body.salasana, 10)
    const sposti = req.body.sposti

    if (!kayttajanimi || !salasana || !sposti || isEmail(sposti) == false) {
        return res.status(400).json({
            error: 'käyttäjänimi, salasana tai sähköposti ei kelpaa'
        })
    } else {
    try {
        await suoritaKysely(`UPDATE kayttajat SET kayttajanimi = '${kayttajanimi}', salasana = '${salasana}', sposti = '${sposti}' WHERE kayttajaid = ${req.body.kayttajaid}`)
        res.status(200).send('Käyttäjätietojen päivitys onnistui')
    } catch (error) {
        res.status(500).send('Käyttäjätietojen päivitys epäonnistui')
    }
}
})


const PORT = 3001
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})

