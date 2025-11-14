import Router from '@koa/router'
import { DashboardController } from '../controllers/dashboard.controller.js'

const router = new Router()
const dashboardController = new DashboardController()

// 获取完整的仪表板数据
router.get('/', dashboardController.getDashboardData)

// 获取资产概览
router.get('/asset-overview', dashboardController.getAssetOverview)

// 按分类统计资产
router.get('/assets-by-category', dashboardController.getAssetsByCategory)

// 获取资产趋势
router.get('/asset-trend', dashboardController.getAssetTrend)

// 获取待办事项
router.get('/todos', dashboardController.getTodoList)

export default router
