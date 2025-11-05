/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("1378lh283rztfah")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "t7k4brjc",
    "name": "status",
    "type": "select",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "waiting",
        "playing",
        "finished",
        "cancelled"
      ]
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("1378lh283rztfah")

  // remove
  collection.schema.removeField("t7k4brjc")

  return dao.saveCollection(collection)
})
