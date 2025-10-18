import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import morgan from 'morgan'
import compression from 'compression'
import helmet from 'helmet'
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3002

app.use(helmet({
  contentSecurityPolicy: false, // widgets externes/iframes, sinon à affiner
}))
app.use(cors())
app.use(morgan('tiny'))
app.use(compression())

// Healthcheck
app.get('/health', (req, res) => res.json({ ok: true }))

// Servir le front buildé
const distPath = path.join(__dirname, 'dist')
app.use(express.static(distPath))
app.get('*', (_, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`✅ Mini DEX server on http://0.0.0.0:${PORT}`)
})
