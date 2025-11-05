/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "shop_items_collection",
    "created": new Date().toISOString(),
    "updated": new Date().toISOString(),
    "name": "shop_items",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "item_id_field",
        "name": "item_id",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": true,
        "options": {
          "min": null,
          "max": null,
          "pattern": "^[a-zA-Z0-9_-]+$"
        }
      },
      {
        "system": false,
        "id": "name_field",
        "name": "name",
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
        "id": "description_field",
        "name": "description",
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
        "id": "price_field",
        "name": "price",
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
        "id": "icon_field",
        "name": "icon",
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
        "id": "category_field",
        "name": "category",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "powerups",
            "consumables",
            "cosmetics"
          ]
        }
      },
      {
        "system": false,
        "id": "is_enabled_field",
        "name": "is_enabled",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "sort_order_field",
        "name": "sort_order",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": null,
          "noDecimal": true
        }
      }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX idx_shop_items_item_id ON shop_items (item_id)",
      "CREATE INDEX idx_shop_items_category ON shop_items (category)",
      "CREATE INDEX idx_shop_items_enabled ON shop_items (is_enabled)",
      "CREATE INDEX idx_shop_items_sort_order ON shop_items (sort_order)"
    ],
    "listRule": "@request.auth.id != \"\"", // Anyone logged in can view
    "viewRule": "@request.auth.id != \"\"",
    "createRule": "@request.auth.id != \"\"", // Anyone logged in can create (for testing)
    "updateRule": "@request.auth.id != \"\"", // Anyone logged in can update (for testing)
    "deleteRule": "@request.auth.id != \"\"", // Anyone logged in can delete (for testing)
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("shop_items_collection");

  return dao.deleteCollection(collection);
});
