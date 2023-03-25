const supertest = require('supertest')
const app = require('../index')
const api = supertest(app)
const sql = require('mssql')
const jwt = require('jsonwebtoken')
const { TOKEN_KEY } = require('../config')

let token
let kayttajanimi
let kayttajaid

beforeEach(async () => {
    const vastaus = await api
      .post('/kirjaudu')
      .send({kayttajanimi: 'pentti1', salasana: 'pentti1'})
      .expect(200)

    token = vastaus.text.split(' ')[5]
    kayttajanimi = vastaus.text.split(' ')[0]
    const dekoodattuToken = jwt.verify(token, TOKEN_KEY)
    kayttajaid = dekoodattuToken.id
})

describe('kayttajat testausta', () => {

    test('käyttäjätiedot palautetaan json muodossa', async () => {
        await api
          .get('/kayttajat')
          .expect(200)
          .expect('Content-Type', /application\/json/)
      })
    
    test('haetaan kirjautuneen käyttäjän tiedot', async () => {
        await api
          .get('/kayttaja')
          .set({"Authorization":`bearer ${token} `})
          .expect(200)
          .expect('Content-Type', /application\/json/)
      })

    test('sähköpostin muokkaus ei onnistu jos sähköposti on väärässä muodossa', async () => {
        await api
        .patch('/muokkaa_kayttaja')
        .set({"Authorization":`bearer ${token} `})
        .send({sposti: 'liisa.sposti.com'})
        .expect(400)   
    })

}) 

describe('arvostelut testausta', () => {

  test('käyttäjä pystyy lisäämään viiniarvostelun', async () => {

      const arvio = '4'
      const viini_id = '1119'
      const arvostelijaid = kayttajaid
  
      await api
      .post('/arvosteleViini')
      .send({kayttajanimi, arvio, viini_id})
      .expect(200)

      const yhteys = await sql.connect({
        user: 'ygroup',
        password: 'Viiniot2',
        server: 'viiniserveri.database.windows.net',
        database: 'viinikanta',
        options: {
            encrypt: true
        }
      })

      const tulos = await yhteys.request().query(`SELECT * FROM arvostelut 
      WHERE arvostelija_ID = '${arvostelijaid}' AND viini_id = '${viini_id}'`)
      
      expect(tulos.recordset).toHaveLength(1)
      sql.close()
  })

  //npm test -- tests/backend.test.js

  test('käyttäjä pystyy muokkaamaan arvosteluaan', async () => {

    const tulos = await api
    .get('/kayttaja/viinit')
    .set({"Authorization":`bearer ${token} `})
    .expect(200)

    let arvio = 0
    const vanha_arvio = parseInt(tulos.text.split('"arvio":')[1].split('},{"viini_id"')[0])
    if (vanha_arvio === 5) {
      arvio = vanha_arvio -1
    } else {
      arvio = vanha_arvio +1
    }
    const viini_id = tulos.text.split('"viini_id":')[1].split(',')[0]

    await api
    .patch('/muokkaa_arvostelu/')
    .send({kayttajanimi, arvio, viini_id})
    .expect(200)

    expect(arvio).not.toBe(vanha_arvio)
  })
})


  afterAll(async () => {
    sql.close()
    console.log('Suljettu!')
  })