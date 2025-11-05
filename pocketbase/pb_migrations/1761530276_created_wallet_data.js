/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "s0ibenulg9qnsfg",
    "created": "2025-10-27 01:57:56.511Z",
    "updated": "2025-10-27 01:57:56.511Z",
    "name": "wallet_data",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "hrnmoqjd",
        "name": "user_id",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "znxj77zu",
        "name": "address",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "5jzlfozg",
        "name": "private_key",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "1nqfqogf",
        "name": "mnemonic",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "fj88wslp",
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
      },
      {
        "system": false,
        "id": "zbvv1w1g",
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
      },
      {
        "system": false,
        "id": "ryunsq4f",
        "name": "balance",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": null,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "kox2i9re",
        "name": "balance_last_updated",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      },
      {
        "system": false,
        "id": "bsulhgdt",
        "name": "is_connected",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "oyw6xwwz",
        "name": "notes",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [],
    "listRule": "user_id = @request.auth.id",
    "viewRule": "user_id = @request.auth.id",
    "createRule": "@request.auth.id != \"\"",
    "updateRule": "user_id = @request.auth.id",
    "deleteRule": "user_id = @request.auth.id",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("s0ibenulg9qnsfg");

  return dao.deleteCollection(collection);
})
