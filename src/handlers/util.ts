import https from "https"
import AdmZip from "adm-zip"

function download(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks:Uint8Array[] = [];

      // A chunk of data has been recieved.
      response.on('data', (chunk) => {
        chunks.push(chunk);
      })

      // The whole response has been received. Print out the result.
      response.on('end', () => {
        resolve(Buffer.concat(chunks))
      })

    }).on("error", (err) => {
      reject(err)
    })
  })
}

/*
Downloads a file and returns its string contents.
*/
export async function downloadContents(url: string, encoding: BufferEncoding = "utf-8"): Promise<string> {
  return (await download(url)).toString(encoding)
}

export async function downloadAndExtract(url: string): Promise<BufferMap> {
  const zipContents = await download(url)
  const zip = new AdmZip(zipContents)
  const entries: ZipEntry[] = await Promise.all(zip.getEntries().filter((entry) => !entry.isDirectory).map((entry) => {
    const getData: Promise<ZipEntry> = new Promise((resolve, reject) => {
      entry.getDataAsync((data, err) => {
        if (err) {
          reject(err)
        } else {
          resolve({
            name: entry.entryName,
            contents: data
          })
        }
      })
    })
    return getData
  }))
  return entries.reduce((accumulator, entry) => {
    return { ...accumulator, [entry.name]: entry.contents}
  }, {})
}

type ZipEntry = {
  name: string,
  contents: Buffer
}

export interface BufferMap {
  [name: string]: Buffer;
}

export function createZip(files: BufferMap): Buffer {
  const zip = new AdmZip()
  for (const [fileName, data] of Object.entries(files)) {
    zip.addFile(fileName, data)
  }
  return zip.toBuffer()
}

