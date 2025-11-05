/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("psdjiphccz9pwin")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "gufwirik",
    "name": "wallet_type",
    "type": "select",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "metamask",
        "phantom",
        "generated",
        "sui",
        "other"
      ]
    }
  }))

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "2wufhuk3",
    "name": "network",
    "type": "select",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "ethereum",
        "solana",
        "sui"
      ]
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("psdjiphccz9pwin")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "gufwirik",
    "name": "wallet_type",
    "type": "select",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "metamask",
        "phantom",
        "generated",
        "bitcoin",
        "other"
      ]
    }
  }))

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "2wufhuk3",
    "name": "network",
    "type": "select",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "ethereum",
        "solana",
        "bitcoin"
      ]
    }
  }))

  return dao.saveCollection(collection)
})
