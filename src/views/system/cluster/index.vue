<template>
  <div class="app-container">
    <el-card>
      <div style="margin-bottom: 20px;">
        <el-button type="primary" @click="handleAdd" :disabled="!hasPermission">新增集群配置</el-button>
      </div>

      <el-table :data="tableData" v-loading="loading" border style="width: 100%">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="cluster_name" label="集群名称" width="150" />
        <el-table-column prop="ranger_base_url" label="Ranger 地址" />
        <el-table-column prop="hive_service_name" label="Hive 服务名" width="150" />
        <el-table-column prop="hbase_service_name" label="HBase 服务名" width="150" />
        <el-table-column label="操作" width="150">
          <template #default="scope">
            <el-button size="small" type="primary" @click="handleEdit(scope.row)" :disabled="!hasPermission">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑 弹窗 -->
    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="800px" @close="resetForm">
      <el-form :model="formData" ref="formRef" label-width="150px">
        
        <el-tabs v-model="activeTab">
          <!-- Tab 1: Ranger 基础配置 -->
          <el-tab-pane label="Ranger 配置" name="ranger">
            <el-form-item label="集群名称" prop="cluster_name" :rules="[{ required: true, message: '请输入', trigger: 'blur' }]">
              <el-input v-model="formData.cluster_name" :disabled="isEdit" placeholder="如: gl_cluster" />
            </el-form-item>
            <el-form-item label="Ranger URL" prop="ranger_base_url" :rules="[{ required: true, message: '请输入', trigger: 'blur' }]">
              <el-input v-model="formData.ranger_base_url" type="textarea" :rows="2" placeholder="支持多个，用英文逗号分隔。如: http://10.172.144.77:6080,http://10.172.144.78:6080" />
            </el-form-item>
            <el-form-item label="Ranger 账号" prop="ranger_username" :rules="[{ required: true, message: '请输入', trigger: 'blur' }]">
              <el-input v-model="formData.ranger_username" />
            </el-form-item>
            <el-form-item label="Ranger 密码" prop="ranger_password" :rules="[{ required: true, message: '请输入', trigger: 'blur' }]">
              <el-input v-model="formData.ranger_password" type="password" show-password />
            </el-form-item>
            <el-form-item label="Hive 服务名" prop="hive_service_name" :rules="[{ required: true, message: '请输入', trigger: 'blur' }]">
              <el-input v-model="formData.hive_service_name" placeholder="如: perspcluster1_hive" />
            </el-form-item>
            <el-form-item label="HDFS 服务名" prop="hdfs_service_name" :rules="[{ required: true, message: '请输入', trigger: 'blur' }]">
              <el-input v-model="formData.hdfs_service_name" placeholder="如: perspcluster1_hadoop" />
            </el-form-item>
            <el-form-item label="Delta 服务名">
              <el-input v-model="formData.delta_service_name" placeholder="如: perspcluster1_hive" />
            </el-form-item>
            <el-form-item label="HBase 服务名">
              <el-input v-model="formData.hbase_service_name" placeholder="如: perspcluster1_hbase" />
            </el-form-item>
          </el-tab-pane>

          <!-- Tab 2: Hive 元数据配置 -->
          <el-tab-pane label="Hive 元数据配置" name="hive">
            <el-form-item label="数据库类型">
              <el-select v-model="formData.hive_db_type" style="width: 100%;">
                <el-option label="MySQL" value="mysql" />
                <el-option label="PostgreSQL" value="postgresql" />
                <el-option label="Oracle" value="oracle" />
              </el-select>
            </el-form-item>
            <el-form-item label="DB 主机">
              <el-input v-model="formData.hive_db_host" />
            </el-form-item>
            <el-form-item label="DB 端口">
              <el-input-number v-model="formData.hive_db_port" :min="1" :max="65535" style="width: 100%;" />
            </el-form-item>
            <el-form-item label="DB 库名">
              <el-input v-model="formData.hive_db_name" />
            </el-form-item>
            <el-form-item label="DB 账号">
              <el-input v-model="formData.hive_db_user" />
            </el-form-item>
            
            <!-- 密码与二次确认 -->
            <el-form-item label="DB 密码" prop="hive_db_password">
              <el-input v-model="formData.hive_db_password" type="password" show-password />
            </el-form-item>
            <el-form-item label="确认密码" prop="hive_db_password_confirm" :rules="[{ validator: validatePasswordConfirm, trigger: 'blur' }]">
              <el-input v-model="formData.hive_db_password_confirm" type="password" show-password />
            </el-form-item>

            <!-- 测试按钮 -->
            <el-form-item>
              <el-button type="success" plain @click="handleTestConnection" :loading="testLoading">
                测试数据库连通性
              </el-button>
            </el-form-item>
          </el-tab-pane>

          <!-- Tab 3: HDFS 与 HBase 配置 -->
          <el-tab-pane label="HDFS / HBase 配置" name="others">
            <el-form-item label="HDFS 默认路径">
              <el-input v-model="formData.hdfs_default_fs" placeholder="如: hdfs://ha" />
            </el-form-item>
            <el-form-item label="HBase REST URLs">
              <el-input 
                v-model="formData.hbase_rest_urls" 
                type="textarea" 
                :rows="3"
                placeholder="多个 URL 用英文逗号分隔，如: http://ip1:8080,http://ip2:8080" 
              />
            </el-form-item>
          </el-tab-pane>
        </el-tabs>

      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { getClusterList, createCluster, updateCluster, testHiveConnection } from '../../../api/cluster'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const submitLoading = ref(false)
const testLoading = ref(false)
const tableData = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('新增集群配置')
const isEdit = ref(false)
const activeTab = ref('ranger')
const formRef = ref(null)

// 完整的字段定义（已彻底移除 ranger_version）
const initialFormData = {
  cluster_name: '',
  ranger_base_url: '',
  ranger_username: '',
  ranger_password: '',
  hive_service_name: '',
  hdfs_service_name: '',
  delta_service_name: '',
  hbase_service_name: '',
  hdfs_default_fs: '',
  hive_db_type: 'postgresql',
  hive_db_host: '',
  hive_db_port: 5432,
  hive_db_name: '',
  hive_db_user: '',
  hive_db_password: '',
  hive_db_password_confirm: '', // 仅用于前端校验
  hbase_rest_urls: ''
}

const formData = reactive({ ...initialFormData })

const hasPermission = computed(() => {
  const info = JSON.parse(localStorage.getItem('user_info') || '{}')
  return info.permissions && info.permissions.includes('cluster:manage')
})

const fetchData = async () => {
  loading.value = true
  try {
    tableData.value = await getClusterList()
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  dialogTitle.value = '新增集群配置'
  isEdit.value = false
  Object.assign(formData, initialFormData)
  activeTab.value = 'ranger'
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑集群配置'
  isEdit.value = true
  Object.assign(formData, initialFormData, row)
  // 编辑时把确认密码也填入，防止直接保存报错
  formData.hive_db_password_confirm = row.hive_db_password || ''
  activeTab.value = 'ranger'
  dialogVisible.value = true
}

// 密码校验器
const validatePasswordConfirm = (rule, value, callback) => {
  if (value !== formData.hive_db_password) {
    callback(new Error('两次输入密码不一致!'))
  } else {
    callback()
  }
}

// 测试连通性
const handleTestConnection = async () => {
  if (!formData.hive_db_host || !formData.hive_db_port || !formData.hive_db_name || !formData.hive_db_user) {
    ElMessage.warning('请完整填写 Hive 元数据库配置')
    return
  }
  testLoading.value = true
  try {
    const res = await testHiveConnection({
      hive_db_type: formData.hive_db_type,
      hive_db_host: formData.hive_db_host,
      hive_db_port: formData.hive_db_port,
      hive_db_name: formData.hive_db_name,
      hive_db_user: formData.hive_db_user,
      hive_db_password: formData.hive_db_password
    })
    if (res.code === 200) {
      ElMessage.success(res.msg)
    } else {
      ElMessage.error(res.msg)
    }
  } catch (e) {
    console.error(e)
  } finally {
    testLoading.value = false
  }
}

const handleSubmit = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    submitLoading.value = true
    try {
      // 提交前移除仅用于前端验证的确认密码字段
      const payload = { ...formData }
      delete payload.hive_db_password_confirm

      if (isEdit.value) {
        await updateCluster(formData.cluster_name, payload)
        ElMessage.success('更新成功')
      } else {
        await createCluster(payload)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      fetchData()
    } finally {
      submitLoading.value = false
    }
  })
}

const resetForm = () => {
  formRef.value?.resetFields()
}

onMounted(() => { fetchData() })
</script>

<style scoped>
.app-container {
  padding: 20px;
}
</style>