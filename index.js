const express = require('express')
const app = express()
const sql = require('mssql')
const cors = require('cors')
const bcrypt = require("bcrypt")
const jwt = require('jsonwebtoken')
const { TOKEN_KEY } = require('./config')
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

//Haetaan tiedot 'kayttajat' taulusta
app.get('/kayttajat', async (req, res) => {
    const kysely = 'SELECT * FROM kayttajat'
    const tulos = await suoritaKysely(kysely)
    console.log(tulos)
    res.send(tulos.recordset)
})
//Haetaan tiedot 'viinit' taulusta
app.get('/viinit', async (req, res) => {
    try {
        const kysely1 = 'SELECT * FROM viinit WHERE viini_id < 101'
        const tulos1 = await suoritaKysely(kysely1)
        res.status(200).send(tulos1.recordset)
    } catch (error) {
        res.status(500).send('viinien haku epäonnistui')
    }

})

//Haetaan viinien nimet 'viinit' taulusta autocomplete-komponenttiin
app.get('/viinit/nimet', async (req, res) => {
    try {
        const kysely1 = 'SELECT viini_id, nimi FROM viinit;'
        const tulos1 = await suoritaKysely(kysely1)
        res.status(200).send(tulos1.recordset)
    } catch (error) {
        res.status(500).send('viinien nimien haku epäonnistui')
    }

})

//Käyttäjän tietojen (käyttäjänimi ja sposti) haku kirjautuneen
// käyttäjän tokenin perusteella
app.get('/kayttaja/', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const dekoodattuToken = jwt.verify(token, TOKEN_KEY )
        const id = dekoodattuToken.id
        const tulos = await suoritaKysely(`SELECT kayttajanimi, sposti FROM kayttajat WHERE kayttajaID = ${id}`)
        res.status(200).send(tulos.recordset)
    } catch (error) {
        res.status(500).send('Käyttäjän haku epäonnistui')
    }
})

//Listaus käyttäjän arvostelemista viineistä
app.get('/kayttaja/viinit', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const dekoodattuToken = jwt.verify(token, TOKEN_KEY )
        const id = dekoodattuToken.id
        const tulos = await suoritaKysely(`SELECT nimi FROM viinit v
        JOIN arvostelut a ON v.viini_id = a.viini_ID
        WHERE a.arvostelija_ID = ${id}`)
        res.status(200).send(tulos.recordset)
    } catch (error) {
        res.status(500).send('Käyttäjän haku epäonnistui')
    }
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
            const kysely = await suoritaKysely(`SELECT * FROM kayttajat WHERE kayttajanimi = '${kayttajanimi}' OR sposti = '${sposti}'`)
            if (kysely.recordset.length != 0) {
                res.status(400).send('Käyttäjänimi tai sähköposti on jo käytössä')
            } else {
                await suoritaKysely(`INSERT INTO kayttajat (kayttajanimi, salasana, sposti) VALUES ('${kayttajanimi}', '${salasana}', '${sposti}')
                `)
                const kysely2 = await suoritaKysely(`SELECT kayttajaID FROM kayttajat WHERE kayttajanimi = '${kayttajanimi}'
                `)
                const id = kysely2.recordset[0].kayttajaID
                const tokenuser = {
                    kayttajanimi,
                    id
                }
                const token = jwt.sign(
                    tokenuser, TOKEN_KEY, {expiresIn: '1h'})
                res.status(200).send(`Rekisteröityminen onnistui, token: ${token}`)
            }
        } catch (error) {
            res.status(500).send('Käyttäjän lisäys epäonnistui')
        }
    }
})
//Käyttäjän kirjautuminen
app.post('/kirjaudu', async (req, res) => {
    const kayttajanimi = req.body.kayttajanimi
    const salasana = req.body.salasana
    try {
    const kysely = await suoritaKysely(`SELECT * FROM kayttajat WHERE kayttajanimi = '${kayttajanimi}'`)
    if (kysely.recordset.length === 0) {
        console.log('Käyttäjää ei löydy')
        res.status(400).send('Käyttäjää ei löydy')
    } else {
            const salattusalasana = kysely.recordset[0].salasana
            if (await bcrypt.compare(salasana, salattusalasana)) {
                const id = kysely.recordset[0].kayttajaID
                const tokenuser = {
                    kayttajanimi,
                    id
                }
            const token = jwt.sign(
                tokenuser, TOKEN_KEY, {expiresIn: '1h'})
            console.log('Kirjautuminen onnistui!')
            res.status(200).send(`${kayttajanimi} on kirjautunut sisään, token: ${token}`)
            } else {
                console.log('Väärä salasana')
                res.status(400).send('Väärä salasana!')
            }
        }
        } catch (error) {
                res.status(500).send('Kirjautuminen epäonnistui')
            }
        
})

//Käyttäjän poisto 'kayttajat' taulusta kirjautuneen käyttäjän tokenin perusteella
app.delete('/poista_kayttaja', async (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    const dekoodattuToken = jwt.verify(token, TOKEN_KEY )
    const id = dekoodattuToken.id
    try {
        await suoritaKysely(`DELETE FROM kayttajat WHERE kayttajaID = ${id}`)
        res.status(200).send('Käyttäjä poistettu onnistuneesti')
    } catch (error) {
        res.status(500).send('Käyttäjän poistaminen epäonnistui')
    }
})
/*
//Käyttäjätietojen muokkaus (vielä kesken)
app.put('/muokkaa_kayttaja/:kayttajaID', async (req, res) => {
    const kayttajanimi = req.body.kayttajanimi
    const salasana = await bcrypt.hash(req.body.salasana, 10)
    const sposti = req.body.sposti
    const id = req.params.kayttajaID
    const token = req.headers.authorization.split(' ')[1];
   try {
        await suoritaKysely(`UPDATE kayttajat SET kayttajanimi = '${kayttajanimi}', salasana = '${salasana}', sposti = '${sposti}' WHERE kayttajaID = ${id}`)
        res.status(200).send('Käyttäjätietojen päivitys onnistui')
    } catch (error) {
        res.status(500).send('Käyttäjätietojen päivitys epäonnistui')
    }
})*/


const PORT = 3001
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})

