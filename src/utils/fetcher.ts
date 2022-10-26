import { EJSON } from 'bson'
import { Connection } from 'types'

export async function runCommand<T>(
  connection: string | undefined,
  database: string,
  command: object,
  opts: { canonical?: boolean } = {},
): Promise<T> {
  const response = await fetch(
    `/api/runCommand?d=${database}&c=${Object.keys(command)[0]}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        connection,
        database,
        command: JSON.stringify(command),
      }),
    },
  )
  if (response.ok) {
    if (opts.canonical) {
      return response.json()
    } else {
      const text = await response.text()

      try {
        return EJSON.parse(text) as T
      } catch (error) {
        return JSON.parse(text) as T
      }
    }
  }
  throw new Error(await response.text())
}

export async function listConnections(): Promise<Connection[]> {
  const response = await fetch('/api/listConnections', {
    method: 'POST',
  })
  if (response.ok) {
    return response.json()
  }
  throw new Error(await response.text())
}
