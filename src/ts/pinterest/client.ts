declare const require, process

const axios  = require('axios')
const extend = require('extend')
const log4js = require('log4js')
const log    = log4js.getLogger('pincushon.client')

import * as model from './model'

/* -----------------------------------------------------------------------------
   API types
   ----------------------------------------------------------------------------- */

export const Constants = {
  API_ROOT:           'https://api.pinterest.com/v1',
  MAX_PAGE_SIZE:      100,
  DEFAULT_PAGE_SIZE:   25
}

export interface RateLimitInfo {
  limit?: number
  remaining?: number
  delay_millis?: number
}

export interface PageInfo {
  cursor?: string
  next?: string
}

export interface Fetcher {
  get(url: string) : Promise<any>
}

/**
 * The pinterest API for returning sets of entities is paged, with the
 * complete URL for fetching the next page conveniently included in
 * the page info of the response.
 *
 * The PagedResponse class includes a reference back to the client
 * object (via the Fetcher interface), so that all requests will be
 * made through a single location, which is responsible for managing
 * rate limiting.
 */
export class PagedResponse<T> {
  data: T[]
  page: PageInfo
  fetcher: Fetcher

  constructor(fetcher: Fetcher, response: any) {
    this.data = response.data
    this.page = response.page || {}
    this.fetcher = fetcher
  }

  has_next() : boolean {
    return !!(this.page && this.page.next)
  }

  async next() : Promise<PagedResponse<T>> {
    return this.fetcher.get(this.page.next)
      .then(response => new PagedResponse<T>(this.fetcher, response))
  }
}

/**
 * The type returned by Node's high resolution timer
 * (process.hrtime()) is an array of [second, nanoseconds].
 */
type HighResolutionTimer = [number, number]

function milliseconds_since(time: HighResolutionTimer) {
  let elapsed = process.hrtime(time)
  return (elapsed[0] * 1000) + (elapsed[1] / 1000000)
}

export class Client implements Fetcher {
  access_token : string
  rate_limit : RateLimitInfo
  throttle : boolean
  private last_request_time : HighResolutionTimer

  constructor(data?) {
    if (data && typeof data === 'string') {
      this.access_token = data
    } else if (data) {
      this.access_token = data.access_token
      this.throttle = !!data.throttle
    }
  }

  /* ----------------------------------------
     Fetcher interface
     ---------------------------------------- */

  async get(url: string, params?: any) : Promise<any> {
    let p = Promise.resolve()

    if (this.throttle && this.rate_limit) {
      if (this.last_request_time) {
        let elapsed = milliseconds_since(this.last_request_time)
        if (elapsed < this.rate_limit.delay_millis) {
          log.debug(`Throttling API request. ${elapsed}ms elapsed out of ${this.rate_limit.delay_millis}`)
          // TODO: actually delay
        }
      }
    }

    if (!this.last_request_time) {
      this.last_request_time = process.hrtime()
    }

    return p.then(() => {
      return axios.get(url, {
        params: extend(params || {}, {
          access_token: this.access_token
        })
      }).then(response => {
        if (response.headers && response.headers['x-ratelimit-limit']) {
          let limit : RateLimitInfo = {
            limit: Number(response.headers['x-ratelimit-limit']),
            remaining: Number(response.headers['x-ratelimit-remaining'])
          }
          limit.delay_millis = (60 * 60 * 1000) / limit.limit
          log.info(`Rate limit: ${limit.remaining} of ${limit.limit} (${limit.delay_millis}ms) for ${response.config.url}`)
          this.rate_limit = limit
        }
        return response.data
      })
    })
  }

  /* ----------------------------------------
     API Methods
     ---------------------------------------- */

  /**
   * Get the current logged in user.
   */
  async get_user() : Promise<model.User> {
    return this.get(`${Constants.API_ROOT}/me/`, {
      fields: model.UserFields.join(',')
    })
  }

  /**
   * Get the current logged in user's boards.
   */
  async get_boards(limit?: number) : Promise<PagedResponse<model.Board>> {
    return this.get(`${Constants.API_ROOT}/me/boards/`, {
      fields: model.BoardFields.join(','),
      limit: limit
    }).then(data => new PagedResponse<model.Board>(this, data))
  }

  /**
   * Get the current logged in user's suggested boards.
   */
  async get_suggested_boards(limit?: number) : Promise<PagedResponse<model.Board>> {
    return this.get(`${Constants.API_ROOT}/me/boards/suggested/`, {
      fields: model.BoardFields.join(','),
      limit: limit
    }).then(data => new PagedResponse<model.Board>(this, data))
  }

  /**
   * Get the boards that the current logged in user follows.
   */
  async get_following_boards(limit?: number) : Promise<PagedResponse<model.Board>> {
    return this.get(`${Constants.API_ROOT}/me/following/boards/`, {
      fields: model.BoardFields.join(','),
      limit: limit
    }).then(data => new PagedResponse<model.Board>(this, data))
  }

  /**
   * Get the current logged in user's liked pins.
   */
  async get_liked_pins(limit?: number) : Promise<PagedResponse<model.Pin>> {
    return this.get(`${Constants.API_ROOT}/me/likes/`, {
      fields: model.PinFields.join(','),
      limit: limit
    }).then(data => new PagedResponse<model.Pin>(this, data))
  }

  /**
   * Get all of the current logged in user's pins.
   */
  async get_all_pins(limit?: number) : Promise<PagedResponse<model.Pin>> {
    return this.get(`${Constants.API_ROOT}/me/pins/`, {
      fields: model.PinFields.join(','),
      limit: limit
    }).then(data => new PagedResponse<model.Pin>(this, data))
  }

  /**
   * Get a specific board's pins.
   */
  async get_pins(board: model.Board|string, limit?: number) : Promise<PagedResponse<model.Pin>> {
    let id = (typeof board === 'string')
      ? board
      : board.id
    return this.get(`${Constants.API_ROOT}/boards/${id}/pins/`, {
      fields: model.PinFields.join(',')
    }).then(data => new PagedResponse<model.Pin>(this, data))
  }

  /**
   * Get a specific pin.
   */
  async get_pin(id: string) : Promise<model.Pin> {
    return this.get(`${Constants.API_ROOT}/pins/${id}/`, {
      fields: model.PinFields.join(',')
    })
  }

  /**
   * Get a specific board.
   */
  async get_board(board_spec: string) : Promise<model.Board> {
    return this.get(`${Constants.API_ROOT}/boards/${board_spec}/`, {
      fields: model.BoardFields.join(',')
    })
  }

  /**
   * Get the current logged in user's followers.
   */
  async get_followers(limit?: number) : Promise<PagedResponse<model.User>> {
    return this.get(`${Constants.API_ROOT}/me/followers/`, {
      fields: model.UserFields.join(',')
    }).then(data => new PagedResponse<model.User>(this, data))
  }

  /**
   * Get the users that the current logged in user follows.
   */
  async get_following(limit?: number) : Promise<PagedResponse<model.User>> {
    return this.get(`${Constants.API_ROOT}/me/following/users/`, {
      fields: model.UserFields.join(',')
    }).then(data => new PagedResponse<model.User>(this, data))
  }
}
