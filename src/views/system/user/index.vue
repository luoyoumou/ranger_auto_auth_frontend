<template>
  <div class="app-container">
    <el-card>
      <!-- 顶部操作栏 -->
      <div style="margin-bottom: 20px;">
        <el-button type="primary" @click="handleAdd" :disabled="!hasPermission">新增用户</el-button>
      </div>

      <!-- 用户数据表格 -->
      <el-table :data="tableData" v-loading="loading" border style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column label="角色">
          <template #default="scope">
            <el-tag v-for="role in scope.row.roles" :key="role" style="margin-right: 5px;">
              {{ role }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态">
          <template #default="scope">
            <el-switch
              v-model="scope.row.is_active"
              :disabled="!hasPermission"
              @change="(val) => handleStatusChange(scope.row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button size="small" type="primary" @click="handleEdit(scope.row)" :disabled="!hasPermission">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.row)" :disabled="!hasPermission">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="500px" @close="resetForm">
      <el-form :model="formData" ref="formRef" label-width="100px">
        <el-form-item label="用户名" prop="username" :rules="[{ required: true, message: '请输入用户名', trigger: 'blur' }]">
          <el-input v-model="formData.username" :disabled="!!formData.id" />
        </el-form-item>
        <el-form-item label="密码" prop="password" :rules="!formData.id ? [{ required: true, message: '请输入密码', trigger: 'blur' }] : []">
          <el-input v-model="formData.password" type="password" placeholder="不修改请留空" />
        </el-form-item>
        <el-form-item label="角色" prop="role_names" :rules="[{ required: true, message: '请选择角色', trigger: 'change' }]">
          <el-select v-model="formData.role_names" multiple placeholder="请选择角色" style="width: 100%;">
            <el-option label="管理员 (admin)" value="admin" />
            <el-option label="操作员 (operator)" value="operator" />
            <el-option label="只读用户 (viewer)" value="viewer" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { getUserList, createUser, updateUser, deleteUser } from '../../../api/user'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const submitLoading = ref(false)
const tableData = ref([])

// 弹窗相关
const dialogVisible = ref(false)
const dialogTitle = ref('新增用户')
const formRef = ref(null)
const formData = reactive({
  id: null,
  username: '',
  password: '',
  role_names: []
})

// 检查权限 (从本地存储的 user_info 中读取)
const hasPermission = computed(() => {
  const info = JSON.parse(localStorage.getItem('user_info') || '{}')
  return info.permissions && info.permissions.includes('user:manage')
})

// 获取用户列表
const fetchData = async () => {
  loading.value = true
  try {
    const res = await getUserList()
    tableData.value = res || []
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增用户'
  formData.id = null
  formData.username = ''
  formData.password = ''
  formData.role_names = ['viewer'] // 默认给只读
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row) => {
  dialogTitle.value = '编辑用户'
  formData.id = row.id
  formData.username = row.username
  formData.password = '' // 编辑时不回显密码
  formData.role_names = [...row.roles]
  dialogVisible.value = true
}

// 状态切换
const handleStatusChange = async (row, val) => {
  try {
    await updateUser(row.id, { is_active: val })
    ElMessage.success('状态更新成功')
  } catch (error) {
    row.is_active = !val // 失败回滚状态
  }
}

// 提交表单 (新增或修改)
const handleSubmit = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    submitLoading.value = true
    try {
      if (formData.id) {
        // 编辑
        const payload = { role_names: formData.role_names }
        if (formData.password) payload.password = formData.password
        await updateUser(formData.id, payload)
        ElMessage.success('更新成功')
      } else {
        // 新增
        await createUser(formData)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      fetchData()
    } catch (error) {
      console.error(error)
    } finally {
      submitLoading.value = false
    }
  })
}

// 删除
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除用户 ${row.username} 吗?`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await deleteUser(row.id)
      ElMessage.success('删除成功')
      fetchData()
    } catch (error) {
      console.error(error)
    }
  }).catch(() => {})
}

const resetForm = () => {
  formRef.value?.resetFields()
}

onMounted(() => {
  fetchData()
})
</script>