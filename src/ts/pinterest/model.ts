/* -----------------------------------------------------------------------------
   Model data types

   See https://developers.pinterest.com/docs/api/overview/
   ----------------------------------------------------------------------------- */

export interface Image {
  url: string
  width: number
  height: number
}

export interface Creator {
  url?: string
  first_name?: string
  last_name?: string
  id?: string
}

export interface ImageDictionary {
  [index: string] : Image
}

export interface CountsDictionary {
  [index: string] : number
}

export interface StringDictionary {
  [index: string] : string
}

export interface ObjectDictionary {
  [index: string] : any
}

export const BoardFields = [
  'counts',
  'created_at',
  'creator',
  'description',
  'id',
  'image',
  'name',
  'privacy',
  'reason',
  'url'
]

/**
 * @see https://developers.pinterest.com/docs/api/boards/
 */
export interface Board {
  counts?: CountsDictionary
  created_at?: string
  creator?: Creator
  description?: string
  id?: string
  image?: ImageDictionary
  name?: string
  privacy?: string
  reason?: string
  url?: string
}

export const PinFields = [
  'attribution',
  'board',
  'color',
  'counts',
  'created_at',
  'creator',
  'id',
  'image',
  'link',
  'media',
  'metadata',
  'note',
  'original_link',
  'url'
]

/**
 * @see https://developers.pinterest.com/docs/api/pins/
 */
export interface Pin {
  attribution?: string
  board?: Board
  color?: string
  counts?: CountsDictionary
  created_at?: string
  creator?: Creator
  id?: string
  image?: ImageDictionary
  link?: string
  media?: StringDictionary
  metadata?: ObjectDictionary
  note?: string
  original_link?: string
  url?: string
}

export interface Link {
  locale?: string
  title?: string
  site_name?: string
  description?: string
  favicon?: string
}

export const UserFields = [
  'id',
  'username',
  'first_name',
  'last_name',
  'bio',
  'created_at',
  'counts',
  'image'
]

/**
 * @see https://developers.pinterest.com/docs/api/users/
 */
export interface User {
  id?: string
  username?: string
  first_name?: string
  last_name?: string
  bio?: string
  created_at?: string
  counts?: CountsDictionary
  image?: ImageDictionary
}
