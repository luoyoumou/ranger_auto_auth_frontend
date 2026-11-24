import request from './request'

// 执行授权/回收
export function executePolicy(data) {
  return request.post('/policy/execute', data)
}

// 查询历史策略
export function getPolicyRecords(clusterName) {
  // 当 clusterName 为 "all" 或空时，传给后端的参数为空
  const params = clusterName && clusterName !== 'all' ? { cluster_name: clusterName } : {}
  return request.get('/policy/records', { params })
}

// 刷新策略
export function refreshPolicy(data) {
  return request.post('/policy/refresh', data)
}

// 删除策略 (彻底从 Ranger 删除)
export function deletePolicy(data) {
  return request.post('/policy/delete', data)
}

// 拷贝策略
export function copyPolicy(data) {
  return request.post('/policy/copy', data)
}

// 【新增】：修改策略（全量覆盖四组权限）
export function modifyPolicy(data) {
  return request.post('/policy/modify', data)
}

// 获取 Hive 数据库列表（如果页面用到）
export function getHiveDatabases(clusterName) {
  return request.get('/policy/hive/databases', { params: { cluster: clusterName } })
}

// 获取 Hive 表列表（如果页面用到）
export function getHiveTables(clusterName, dbName) {
  return request.get('/policy/hive/tables', { params: { cluster: clusterName, db_name: dbName } })
}

// 获取指定集群的 Ranger 用户或用户组
export function getRangerIdentities(clusterName, type) {
  return request.get('/policy/ranger/identities', { params: { cluster_name: clusterName, type } })
}

// 启用/禁用策略
export function togglePolicy(data) {
  return request.post('/policy/toggle', data)
}

// 获取 HBase 命名空间列表
export function getHbaseNamespaces(clusterName) {
  return request.get('/policy/hbase/namespaces', { params: { cluster_name: clusterName } })
}

// 获取 HBase 指定命名空间表列表
export function getHbaseTables(clusterName, namespace) {
  return request.get('/policy/hbase/tables', { params: { cluster_name: clusterName, namespace } })
}
