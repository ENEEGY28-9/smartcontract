/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "c5ukammoq3048tu",
    "created": "2025-10-28 07:50:30.782Z",
    "updated": "2025-10-28 07:50:30.782Z",
    "name": "energies",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "hvdzlpgi",
        "name": "user_id",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "_pb_users_auth_",
          "cascadeDelete": true,
          "minSelect": 1,
          "maxSelect": 1,
          "displayFields": [
            "email"
          ]
        }
      },
      {
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
      },
      {
        "system": false,
        "id": "akehvtga",
        "name": "last_updated",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_energies_user_id` ON `energies` (`user_id`)"
    ],
    "listRule": "user_id = @request.auth.id",
    "viewRule": "user_id = @request.auth.id",
    "createRule": "user_id = @request.auth.id",
    "updateRule": "user_id = @request.auth.id",
    "deleteRule": "@request.auth.id != \"\" && user_id = @request.auth.id",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("c5ukammoq3048tu");

  return dao.deleteCollection(collection);
})
