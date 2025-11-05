/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("1378lh283rztfah")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "8egnli1r",
    "name": "max_members",
    "type": "number",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "min": 2,
      "max": 50,
      "noDecimal": false
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("1378lh283rztfah")

  // remove
  collection.schema.removeField("8egnli1r")

  return dao.saveCollection(collection)
})
