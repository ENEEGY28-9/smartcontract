/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("c5ukammoq3048tu")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "cnednp2l",
    "name": "points",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": 0,
      "max": null,
      "noDecimal": false
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("c5ukammoq3048tu")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "cnednp2l",
    "name": "points",
    "type": "number",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "min": 0,
      "max": null,
      "noDecimal": false
    }
  }))

  return dao.saveCollection(collection)
})
