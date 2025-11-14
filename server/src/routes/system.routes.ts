import Router from '@koa/router'
import { CompanyController } from '../controllers/company.controller.js'
import { UserController } from '../controllers/user.controller.js'
import { RoleController } from '../controllers/role.controller.js'

const router = new Router()
const companyController = new CompanyController()
const userController = new UserController()
const roleController = new RoleController()

// 公司管理路由
router.get('/companies', companyController.getAllCompanies)
router.get('/companies/list', companyController.getCompanies)
router.get('/companies/:id', companyController.getCompany)
router.post('/companies', companyController.createCompany)
router.put('/companies/:id', companyController.updateCompany)
router.delete('/companies/:id', companyController.deleteCompany)

// 用户管理路由
router.get('/users', userController.getUsers)
router.get('/users/:id', userController.getUser)
router.post('/users', userController.createUser)
router.put('/users/:id', userController.updateUser)
router.delete('/users/:id', userController.deleteUser)
router.post('/users/import', userController.importUsers)
router.post('/users/sync-dootask', userController.syncFromDooTask)

// 角色管理路由
router.get('/roles', roleController.getRoles)
router.get('/roles/all', roleController.getAllRoles)
router.get('/roles/:id', roleController.getRole)
router.post('/roles', roleController.createRole)
router.put('/roles/:id', roleController.updateRole)
router.delete('/roles/:id', roleController.deleteRole)

// 权限管理路由
router.get('/permissions', roleController.getAllPermissions)
router.get('/permissions/by-module', roleController.getPermissionsByModule)

// 用户角色关联路由
router.get('/users/:userId/roles', roleController.getUserRoles)
router.post('/users/:userId/roles', roleController.assignRolesToUser)

export default router
