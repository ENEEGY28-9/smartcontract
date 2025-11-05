/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("1378lh283rztfah")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "is_private_field",
    "name": "is_private",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("1378lh283rztfah")

  // remove
  collection.schema.removeField("is_private_field")

  return dao.saveCollection(collection)
})
