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
        //console.log(error)
        throw error
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
    res.send('<h1>Maistelu_PRO</h1>')
})

//Haetaan tiedot 'kayttajat' taulusta
app.get('/kayttajat', async (req, res) => {
    const kysely = 'SELECT * FROM kayttajat'
    const tulos = await suoritaKysely(kysely)
    console.log(tulos)
    res.send(tulos.recordset)
})
//Haetaan parhaiten arvioidut viinit ja annettujen arvioiden keskiarvot viinit- ja arviot tauluista
app.get('/parhaatviinit', async (req, res) => {
    try {
        const kysely1 = 'SELECT viinit.nimi, viinit.valmistaja, viinit.hinta, viinit.tyyppi, viinit.pakkaustyyppi, viinit.kuvaus, viinit.erityismaininta, viinit.valmistusmaa, viinit.alue, viinit.vuosikerta, viinit.rypaleet, viinit.luonnehdinta, viinit.alkoholipros, AVG(arvostelut.arvio) AS arvio FROM viinit INNER JOIN arvostelut ON viinit.viini_id = arvostelut.viini_ID GROUP BY viinit.nimi, viinit.valmistaja, viinit.hinta, viinit.tyyppi, viinit.pakkaustyyppi, viinit.kuvaus, viinit.erityismaininta, viinit.valmistusmaa, viinit.alue, viinit.vuosikerta, viinit.rypaleet, viinit.luonnehdinta, viinit.alkoholipros, arvostelut.arvio ORDER BY arvostelut.arvio DESC;'
        const tulos1 = await suoritaKysely(kysely1)
        res.status(200).send(tulos1.recordset)
    } catch (error) {
        res.status(500).send('viinien haku epäonnistui')
    }

})

//Parhaiden viinien rajattu haku
app.post('/parhaatviinit/rajattu', async (req, res) => {
    try {
        let kysely = `SELECT viinit.nimi, viinit.valmistaja, viinit.hinta, viinit.tyyppi, viinit.pakkaustyyppi, viinit.kuvaus, viinit.erityismaininta, viinit.valmistusmaa, viinit.alue, viinit.vuosikerta, viinit.rypaleet, viinit.luonnehdinta, viinit.alkoholipros, AVG(arvostelut.arvio) AS arvio FROM viinit INNER JOIN arvostelut ON viinit.viini_id = arvostelut.viini_ID WHERE 1=1`
        const valmistusmaa = req.body.valmistusmaa;
        const tyyppi = req.body.tyyppi;
        const pakkaustyyppi = req.body.pakkaustyyppi;

        if (valmistusmaa !== '') {
            kysely = kysely + ` AND viinit.valmistusmaa = '${valmistusmaa}'`
        }
        if (tyyppi !== '') {
            kysely = kysely + ` AND viinit.tyyppi = '${tyyppi}'`
        }
        if (pakkaustyyppi !== '') {
            kysely = kysely + ` AND viinit.pakkaustyyppi = '${pakkaustyyppi}'`
        }
        kysely = kysely + ` GROUP BY viinit.nimi, viinit.valmistaja, viinit.hinta, viinit.tyyppi, viinit.pakkaustyyppi, viinit.kuvaus, viinit.erityismaininta, viinit.valmistusmaa, viinit.alue, viinit.vuosikerta, viinit.rypaleet, viinit.luonnehdinta, viinit.alkoholipros, arvostelut.arvio ORDER BY arvostelut.arvio DESC`
        const tulos = await suoritaKysely(kysely);
        res.status(200).send(tulos.recordset);
    } catch (error) {
        res.status(500).send('viinien haku epäonnistui')
    }
})

app.get('/parhaatviinit/topkolme', async (req, res) => {
    try {
        const kysely = `SELECT TOP 3 viinit.nimi, viinit.valmistaja, viinit.hinta, viinit.tyyppi, viinit.pakkaustyyppi, viinit.kuvaus, viinit.erityismaininta, viinit.valmistusmaa, viinit.alue, viinit.vuosikerta, viinit.rypaleet, viinit.luonnehdinta, viinit.alkoholipros, AVG(arvostelut.arvio) AS arvio FROM viinit INNER JOIN arvostelut ON viinit.viini_id = arvostelut.viini_ID GROUP BY viinit.nimi, viinit.valmistaja, viinit.hinta, viinit.tyyppi, viinit.pakkaustyyppi, viinit.kuvaus, viinit.erityismaininta, viinit.valmistusmaa, viinit.alue, viinit.vuosikerta, viinit.rypaleet, viinit.luonnehdinta, viinit.alkoholipros, arvostelut.arvio ORDER BY arvostelut.arvio DESC;`
        const tulos = await suoritaKysely(kysely);
        res.status(200).send(tulos.recordset)
    } catch (error) {
        res.status(500).send('TOP 3 viinien haku epäonnistui');
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
        const dekoodattuToken = jwt.verify(token, TOKEN_KEY)
        const id = dekoodattuToken.id
        const tulos = await suoritaKysely(`SELECT kayttajanimi, sposti FROM kayttajat WHERE kayttajaID = ${id}`)
        res.status(200).send(tulos.recordset)
    } catch (error) {
        res.status(500).send('Käyttäjän haku epäonnistui')
    }
})

//Listaus käyttäjän arvostelemista viineistä ja käyttäjän viiniarvio
app.get('/kayttaja/viinit', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const dekoodattuToken = jwt.verify(token, TOKEN_KEY)
        const id = dekoodattuToken.id
        const tulos = await suoritaKysely(`SELECT v.*, a.arvio FROM viinit v
        JOIN arvostelut a ON v.viini_id = a.viini_ID
        WHERE a.arvostelija_ID = ${id}`)
        res.status(200).send(tulos.recordset)
    } catch (error) {
        res.status(500).send('Käyttäjän haku epäonnistui')
    }
})

//Uuden käyttäjän lisäys 'kayttajat' tauluun
app.post('/rekisteroidy', async (req, res) => {
    try {
        const kayttajanimi = req.body.kayttajanimi
        const salasana = await bcrypt.hash(req.body.salasana, 10)
        const sposti = req.body.sposti
        if (!kayttajanimi || !salasana || !sposti || isEmail(sposti) == false) {
            return res.status(400).send('Käyttäjänimi, salasana tai sähköposti ei kelpaa')
        } else {
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
                    tokenuser, TOKEN_KEY, { expiresIn: 60 * 60 })
                res.status(200).send(`Rekisteröityminen onnistui, token: ${token}`)
            }
        }
    } catch (error) {
        res.status(500).send('Käyttäjän lisäys epäonnistui')
    }
})
//Käyttäjän kirjautuminen
app.post('/kirjaudu', async (req, res) => {
    const kayttajanimi = req.body.kayttajanimi
    const salasana = req.body.salasana
    try {
        if (!kayttajanimi || !salasana) {
            console.log('Käyttäjänimi tai salasana ei kelpaa')
            return res.status(400).send('Käyttäjänimi tai salasana ei kelpaa')
        } else {
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
                    tokenuser, TOKEN_KEY, { expiresIn: 60 * 60 })
                console.log('Kirjautuminen onnistui!')
                res.status(200).send(`${kayttajanimi} on kirjautunut sisään, token: ${token}`)
            } else {
                console.log('Väärä salasana')
                res.status(400).send('Väärä salasana!')
            }
        }
    }
    } catch (error) {
        res.status(500).send('Kirjautuminen epäonnistui')
    }

})

//Käyttäjän poisto 'kayttajat' taulusta kirjautuneen käyttäjän tokenin perusteella
app.delete('/poista_kayttaja', async (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    const dekoodattuToken = jwt.verify(token, TOKEN_KEY)
    const id = dekoodattuToken.id
    try {
        await suoritaKysely(`DELETE FROM kayttajat WHERE kayttajaID = ${id}`)
        res.status(200).send('Käyttäjä poistettu onnistuneesti')
    } catch (error) {
        res.status(500).send('Käyttäjän poistaminen epäonnistui')
    }
})

//käyttäjätietojen muokkaus
app.patch('/muokkaa_kayttaja', async (req, res) => {
    try {
        const kayttajanimi = req.body.kayttajanimi
        const sposti = req.body.sposti
        const token = req.headers.authorization.split(' ')[1];
        const dekoodattuToken = jwt.verify(token, TOKEN_KEY)
        const id = dekoodattuToken.id
        if (isEmail(sposti) == false) {
            console.log('Sähköposti ei kelpaa')
            return res.status(400).send('Sähköposti ei kelpaa')
        } else {
            await suoritaKysely(`UPDATE kayttajat SET kayttajanimi = '${kayttajanimi}', sposti = '${sposti}' WHERE kayttajaID = ${id}`)
            console.log('Käyttäjätietojen päivitys onnistui')
            res.status(200).send('Käyttäjätietojen päivitys onnistui')
        }
    } catch (error) {
        if (error.number == 2627 || 2601) {
            res.status(400).send('Käyttäjänimi tai sähköposti jo käytössä')
        } else {
            res.status(500).send('Käyttäjätietojen päivitys epäonnistui')
        }
    }
})

//salasanan vaihto
app.patch('/vaihda_salasanaa', async (req, res) => {
    try {
        const salasana = req.body.salasana
        const uusisalasana = await bcrypt.hash(req.body.uusisalasana, 10)
        const token = req.headers.authorization.split(' ')[1];
        const dekoodattuToken = jwt.verify(token, TOKEN_KEY)
        const id = dekoodattuToken.id

        const kysely = await suoritaKysely(`SELECT * FROM kayttajat WHERE kayttajaID = '${id}'`)
        if (kysely.recordset.length === 0) {
            console.log('Käyttäjää ei löydy')
            res.status(400).send('Käyttäjää ei löydy')
        } else {
            const salattusalasana = kysely.recordset[0].salasana
            if (await bcrypt.compare(salasana, salattusalasana)) {
                await suoritaKysely(`UPDATE kayttajat SET salasana = '${uusisalasana}' WHERE kayttajaID = ${id}`)
                res.status(200).send('Salasanan vaihto onnistui')

            } else {
                console.log('Väärä salasana')
                res.status(400).send('Väärä salasana!')
            }
        }

    } catch (error) {
        res.status(500).send('Käyttäjätietojen päivitys epäonnistui')
    }
})

// POST arvostelu
app.post('/arvosteleViini', async (req, res) => {
    const kayttajanimi = req.body.kayttajanimi
    const arvio = req.body.arvio
    const viini_id = req.body.viini_id
    const aikaleima = req.body.aikaleima
    try {
        const kysely = await suoritaKysely(`SELECT kayttajaID FROM kayttajat WHERE kayttajanimi = '${kayttajanimi}'`)
        if (kysely.recordset.length === 0) {
            res.status(400).send('Käyttäjää ei löydy')
        } else {
            const arvostelijaid = kysely.recordset[0].kayttajaID;
            const kysely1 = await suoritaKysely(`SELECT * FROM arvostelut WHERE arvostelija_ID = '${arvostelijaid}' AND viini_id = '${viini_id}'`)
            if (kysely1.recordset.length > 0) {
                res.status(403).send('Olet jo arvostellut tämän viinin!')
            } else {
                try {
                    const kysely2 = await suoritaKysely(`INSERT INTO arvostelut (arvostelija_ID, viini_ID, arvio, aikaleima) VALUES ('${arvostelijaid}', '${viini_id}', '${arvio}', '${aikaleima}')`)
                    res.status(200).send('Toimii')
                } catch (error) {
                    res.status(500).send('Arviointi epäonnistui')
                }
            }
        }

    } catch (error) {
        res.status(500).send('Arviointi epäonnistui')
    }

})

//Arvostelun muokkaus

app.patch('/muokkaa_arvostelu/', async (req, res) => {
    const kayttajanimi = req.body.kayttajanimi
    const arvio = req.body.arvio
    const viini_id = req.body.viini_id
    const aikaleima = req.body.aikaleima
    try {
        const kysely = await suoritaKysely(`SELECT kayttajaID FROM kayttajat WHERE kayttajanimi = '${kayttajanimi}'`)
        if (kysely.recordset.length === 0) {
            res.status(400).send('Käyttäjää ei löydy')
        } else {
            const arvostelijaid = kysely.recordset[0].kayttajaID;
            const kysely1 = await suoritaKysely(`UPDATE arvostelut SET arvio = '${arvio}', aikaleima = '${aikaleima}' WHERE arvostelija_ID = '${arvostelijaid}' AND viini_ID = '${viini_id}'`)
            res.status(200).send('Arvostelun päivitys onnistui')
        }
    } catch (error) {
        res.status(500).send('Arvostelun päivitys epäonnistui')
    }
})


const PORT = 3001
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})


module.exports = app
