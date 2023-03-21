const supertest = require('supertest')
const app = require('../index')
const api = supertest(app)
const sql = require('mssql')

let token

beforeEach(async () => {
    const vastaus = await api
      .post('/kirjaudu')
      .send({kayttajanimi: 'Liisa1', salasana: 'liisa1234'})
      .expect(200)

    token = vastaus.text.split(' ')[5]

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


  afterAll(async () => {
    sql.close()
    console.log('Suljettu!')
  })