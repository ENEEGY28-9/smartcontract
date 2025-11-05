/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("shop_items_collection")

  // Update rules to allow logged in users to manage shop items (for testing)
  collection.listRule = "@request.auth.id != \"\""
  collection.viewRule = "@request.auth.id != \"\""
  collection.createRule = "@request.auth.id != \"\""
  collection.updateRule = "@request.auth.id != \"\""
  collection.deleteRule = "@request.auth.id != \"\""

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("shop_items_collection")

  // Revert to admin-only rules
  collection.listRule = "@request.auth.id != \"\""
  collection.viewRule = "@request.auth.id != \"\""
  collection.createRule = "@request.auth.id != \"\" && @request.auth.isAdmin = true"
  collection.updateRule = "@request.auth.id != \"\" && @request.auth.isAdmin = true"
  collection.deleteRule = "@request.auth.id != \"\" && @request.auth.isAdmin = true"

  return dao.saveCollection(collection)
})

