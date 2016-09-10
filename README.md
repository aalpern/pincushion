# pincushion

A utility for archiving your Pinterest boards for offline access. Uses
the [offical Pinterest API](https://developers.pinterest.com/docs/getting-started/introduction/).

## Usage

TBD.

## Archive Format

```
/user/index.json
/user/index.html
/user/images
/boards/index.json
/boards/index.html
/boards/<board>/index.json
/boards/<board>/pins.json
/boards/<board>/index.html
/boards/<board>/images/
/boards/<board>/pin/
/boards/<board>/pin/<pin>/index.json
/boards/<board>/pin/<pin>/index.html
/boards/<board>/pin/<pin>/images
```

## API Client

The Pinterest API client code lives in `src/ts/client`, and currently
only implements read-only GET functionality. All methods are
asynchronous, and can automatically throttle themselves to abide by
the API's rate-limiting (although this is off by default).

### Implemented methods

* [x] `GET /v1/me/`
* [x] `GET /v1/me/pins/`
* [x] `GET /v1/me/likes/`
* [x] `GET /v1/me/boards/`
* [x] `GET /v1/me/boards/suggested/`
* [x] `GET /v1/me/followers/`
* [x] `GET /v1/me/following/boards/`
* [x] `GET /v1/me/following/users/`
* [x] `GET /v1/pins/<id>/`
* [x] `GET /v1/boards/<board-spec>/pins/`
* [x] `GET /v1/boards/<board-spec>/pins/`
