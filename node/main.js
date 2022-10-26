const express = require('express')
const bodyParser = require('body-parser')
const next = require('next').default
const mongodb = require('mongodb')
const { EJSON } = require('bson')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()
const clients = new Map()

app
  .prepare()
  .then(() => {
    const server = express()
    // parse application/json
    server.use(bodyParser.json())

    server.post('/api/runCommand', async (req, res) => {
      // body { connection, database, command}
      const { connection, database, command } = req.body

      try {
        const client = await create(connection)
        const parsedCMD = EJSON.deserialize(JSON.parse(command))
        const result = await client.db(database).command(parsedCMD)

        return res.status(200).send(EJSON.serialize(result))
      } catch (error) {
        console.error(error)
        res.status(500).send(error)
      }
    })
    server.post('/api/listConnections', (req, res) => {
      return res.send(process.env.MONGO_URIS || [])
    })

    server.get('*', (req, res) => {
      return handle(req, res)
    })

    server.listen(3000, (err) => {
      if (err) throw err
      console.log('> Ready on http://localhost:3000')
    })
  })
  .catch((ex) => {
    console.error(ex.stack)
    process.exit(1)
  })

async function create(uri) {
  if (clients.has(uri)) {
    return clients.get(uri)
  }

  const client = new mongodb.MongoClient(uri)
  const connectedClient = await client.connect()
  clients.set(uri, connectedClient)
  return connectedClient
}
