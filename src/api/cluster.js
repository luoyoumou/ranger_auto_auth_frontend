import request from './request'

export function getClusterList() {
  return request.get('/clusters/')
}

export function createCluster(data) {
  return request.post('/clusters/', data)
}

export function updateCluster(clusterName, data) {
  return request.put(`/clusters/${clusterName}`, data)
}

export function testHiveConnection(data) {
  return request.post('/clusters/test-hive-connection', data)
}