declare const require

import * as pinterest from '../pinterest'

const URI    = require('urijs')
const fs     = require('file-async')
const exec   = require('child_process').exec
const log4js = require('log4js')
const log    = log4js.getLogger('pincushion.archive')


export interface ArchiveConstructorOptions {
  access_token: string
  directory: string
  throttle?: boolean
}

async function write_json(file: string, data: any) : Promise<any> {
  log.debug(`Writing ${file}`)
  await fs.outputJson(file, data)
  return data
}

async function download(url: string, dir: string) : Promise<void> {
  let uri     = new URI(url)
  let dst     = `${dir}/${uri.filename()}`
  let cmd = `curl -o ${dst} ${url}`
  log.debug(cmd)
  return new Promise<void>((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.warn(error)
        // reject(error)
      } else {
        resolve()
      }
    })
  })
}

export class Archive {
  client: pinterest.Client
  root: string

  constructor(data: ArchiveConstructorOptions) {
    this.client = new pinterest.Client({
      access_token: data.access_token,
      throttle: !!data.throttle
    })
    this.root = data.directory
  }

  async sync() : Promise<void> {
    log.info(`Synchronizing to ${this.root}...`)

    await this.sync_user()
    await this.sync_boards()

    return Promise.resolve()
  }

  async sync_user() : Promise<pinterest.User> {
    log.debug('Synchronizing user...')
    let user_dir = `${this.root}/user`
    let user = await this.client.get_user()
    await write_json(`${user_dir}/index.json`, user)
    if (user.image) {
      this.sync_images(user_dir, user.image)
    }
    return user
  }

  async sync_boards() : Promise<void> {
    let done : boolean = false
    let boards = await this.client.get_all_boards()
    log.debug(`Fetched ${boards.length} boards`)
    await write_json(`${this.root}/boards/index.json`, boards)
    for (let board of boards) {
      await this.sync_board(board)
    }
  }

  async sync_board(board: pinterest.Board) : Promise<void> {
    log.info(`Synchronizing board ${board.name}`)

    let uri       = new URI(board.url).normalizePath()
    let segments  = uri.segment()
    let slug      = segments[segments.length - 2]
    let board_dir = `${this.root}/boards/${slug}`

    await write_json(`${board_dir}/index.json`, board)
    if (board.image) {
      this.sync_images(board_dir, board.image)
    }
    return this.sync_pins(board_dir, board)
  }

  async sync_pins(dir: string, board: pinterest.Board) : Promise<void> {
    log.info(`Synchronizing pins for board ${board.name}...`)
    let pin_dir = `${dir}/pin`
    await fs.ensureDir(dir)
    let done : boolean = false
    let pins = await this.client.get_all_pins_for_board(board)
    log.info(`Fetched ${pins.length} pins`)
    await write_json(`${dir}/pins.json`, pins)
    for (let pin of pins) {
      await this.sync_pin(dir, pin)
    }
  }

  async sync_pin(dir: string, pin: pinterest.Pin) : Promise<void> {
    let pin_dir = `${dir}/${pin.id}`
    await write_json(`${pin_dir}/index.json`, pin)
    if (pin.image) {
      this.sync_images(pin_dir, pin.image)
    }
  }

  async sync_images(dir: string, images: pinterest.ImageDictionary) : Promise<void> {
    let image_dir = `${dir}/images`
    let sizes = Object.keys(images)
    for (let size of Object.keys(images)) {
      this.download_image(image_dir, size, images[size].url)
    }
    if (images['60x60']) {
      log.debug('Checking additional sizes...')
      let additional_sizes = [ '400x300' ]
      for (let size of additional_sizes) {
        if (!images[size]) {
          log.debug(`Trying additional size ${size}`)
          let url = images['60x60'].url.replace('60x60', size)
          this.download_image(image_dir, size, url)
        }
      }
    }
    return Promise.resolve()
  }

  async download_image(dir: string, size: string, url: string) : Promise<void> {
    let size_dir = `${dir}/${size}`
    await fs.ensureDir(size_dir)
    if (fs.existsSync(size_dir + '/' + new URI(url).filename())) {
      log.debug(`Skipping ${url}, already downloaded.`)
      return Promise.resolve()
    }
    return download(url, size_dir)
  }
}
