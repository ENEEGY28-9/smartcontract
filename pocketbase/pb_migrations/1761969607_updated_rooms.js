/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("1378lh283rztfah")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "game_type_field",
    "name": "game_type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "rune",
        "bote"
      ]
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("1378lh283rztfah")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "game_type_field",
    "name": "game_type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "subway_surfers",
        "infinite_runner",
        "puzzle",
        "racing",
        "other"
      ]
    }
  }))

  return dao.saveCollection(collection)
})
