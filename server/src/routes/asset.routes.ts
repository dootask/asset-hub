import Router from '@koa/router'
import { AssetController } from '../controllers/asset.controller.js'
import { AssetCategoryController } from '../controllers/asset-category.controller.js'

const router = new Router()
const assetController = new AssetController()
const categoryController = new AssetCategoryController()

// 资产路由
router.get('/', assetController.getAssets)
router.get('/statistics', assetController.getStatistics)
router.get('/:id', assetController.getAsset)
router.post('/', assetController.createAsset)
router.put('/:id', assetController.updateAsset)
router.delete('/:id', assetController.deleteAsset)
router.post('/import', assetController.importAssets)

// 资产分类路由
router.get('/categories/all', categoryController.getAllCategories)
router.get('/categories', categoryController.getCategories)
router.get('/categories/:id', categoryController.getCategory)
router.post('/categories', categoryController.createCategory)
router.put('/categories/:id', categoryController.updateCategory)
router.delete('/categories/:id', categoryController.deleteCategory)

export default router
