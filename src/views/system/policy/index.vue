<template>
  <div class="page-container">
    <!-- 搜索与操作卡片 -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" class="search-form">
        <el-form-item label="集群">
          <el-select v-model="queryParams.cluster_name" placeholder="全部集群" style="width: 160px;">
            <el-option label="全部集群" value="all" />
            <el-option v-for="c in clusterList" :key="c.cluster_name" :label="c.cluster_name" :value="c.cluster_name" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="授权类型">
          <el-select v-model="queryParams.policy_type" placeholder="全部类型" style="width: 120px;">
            <el-option label="全部类型" value="" />
            <el-option label="HBase" value="hbase" />
            <el-option label="Hive" value="hive" />
            <el-option label="Delta" value="delta" />
          </el-select>
        </el-form-item>

        <el-form-item label="策略名称">
          <el-input v-model="queryParams.policy_name" placeholder="模糊查询" clearable style="width: 150px;" />
        </el-form-item>

        <el-form-item label="对象名称">
          <el-input v-model="queryParams.db_or_url" placeholder="模糊查询" clearable style="width: 150px;" />
        </el-form-item>

        <el-form-item label="用户">
          <el-input v-model="queryParams.user" placeholder="模糊查询" clearable style="width: 120px;" />
        </el-form-item>
        
        <el-form-item label="用户组">
          <el-input v-model="queryParams.group" placeholder="模糊查询" clearable style="width: 120px;" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>查询
          </el-button>
          <el-button type="success" plain @click="handleOpenAddDialog" :disabled="!hasExecutePermission">
            <el-icon><Plus /></el-icon>新增授权
          </el-button>
          <el-button type="warning" plain @click="handleOpenRevokeDialog" :disabled="!hasExecutePermission || selectedRows.length === 0">
            <el-icon><Remove /></el-icon>撤销授权
          </el-button>
          <el-button type="danger" plain @click="handleBatchDelete" :disabled="!hasDeletePermission || selectedRows.length === 0">
            <el-icon><Delete /></el-icon>删除策略
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格卡片 -->
    <el-card class="table-card" shadow="never">
      <div style="margin-bottom: 16px; display: flex; justify-content: flex-start;">
        <el-button type="primary" link @click="toggleExpandAll">
          {{ isExpandAll ? '收起全部明细' : '展开全部明细' }}
        </el-button>
      </div>

      <el-table 
        ref="tableRef"
        :data="filteredTableData" 
        v-loading="loading" 
        style="width: 100%" 
        row-key="policy_id"
        :expand-row-keys="expandedRowKeys"
        @selection-change="handleSelectionChange"
        :row-class-name="tableRowClassName"
        @expand-change="handleExpandChange"
      >
        <el-table-column type="selection" width="55" />
        
        <el-table-column type="expand">
          <template #default="props">
            <div class="expand-container">
              <div class="expand-title">策略明细</div>
              <el-table :data="props.row.details" size="small" class="inner-table">
                <el-table-column prop="item_type" label="权限组" width="150">
                  <template #default="scope">
                    <el-tag :type="getTagType(scope.row.item_type)" effect="light" round>
                      {{ formatItemType(scope.row.item_type) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="user_name" label="用户">
                  <template #default="scope">{{ scope.row.user_name.join(', ') }}</template>
                </el-table-column>
                <el-table-column prop="group_name" label="用户组">
                  <template #default="scope">{{ scope.row.group_name.join(', ') }}</template>
                </el-table-column>
                <el-table-column prop="permissions" label="权限">
                  <template #default="scope">{{ scope.row.permissions.join(', ') }}</template>
                </el-table-column>
              </el-table>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="cluster_name" label="集群" width="120" />
        <el-table-column prop="policy_name" label="策略名称" min-width="180">
          <template #default="scope">
            <span style="font-weight: 500; color: #1e293b;">{{ scope.row.policy_name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="policy_type" label="类型" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.policy_type === 'hbase' ? 'warning' : 'success'" size="small">
              {{ scope.row.policy_type.toUpperCase() }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="db_or_url" label="资源对象" min-width="200" show-overflow-tooltip />
        
        <el-table-column prop="is_enabled" label="状态" width="80" align="center">
          <template #default="scope">
            <el-switch
              v-model="scope.row.is_enabled"
              active-value="1"
              inactive-value="0"
              :loading="scope.row.toggling"
              :disabled="!hasModifyPermission"
              @change="(val) => handleToggleStatus(scope.row, val)"
            />
          </template>
        </el-table-column>

        <el-table-column prop="deny_all_other_access" label="默认拒绝" width="90" align="center">
          <template #default="scope">
            <el-icon v-if="scope.row.deny_all_other_access === '1'" color="#f56c6c" :size="18"><CircleCheck /></el-icon>
            <el-icon v-else color="#dcdfe6" :size="18"><CircleClose /></el-icon>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="240" fixed="right" align="center">
          <template #default="scope">
            <el-button link type="primary" @click="handleRefresh(scope.row)" :disabled="!hasExecutePermission" :loading="scope.row.refreshing">刷新</el-button>
            <el-button link type="primary" @click="handleOpenModify(scope.row)" :disabled="!hasModifyPermission">修改</el-button>
            <el-button link type="primary" @click="handleOpenCopy(scope.row)" :disabled="!hasExecutePermission">拷贝</el-button>
            <el-popconfirm title="确定彻底删除该策略吗？（不可恢复）" @confirm="handleDelete(scope.row)">
              <template #reference>
                <el-button link type="danger" :disabled="!hasDeletePermission">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- ================= 新增/修改 授权弹窗 ================= -->
    <el-dialog 
      v-model="addDialogVisible" 
      :title="isModifyMode ? '修改 Ranger 授权' : '新增 Ranger 授权'" 
      width="950px" 
      @close="resetAddForm" 
      destroy-on-close
    >
      <el-form :model="formData" ref="formRef" label-position="top">
        
        <div class="form-section">
          <div class="section-title">基础配置</div>
          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="集群" prop="cluster_name" :rules="[{ required: true, message: '请选择' }]">
                <el-select v-model="formData.cluster_name" style="width: 100%;" :disabled="isModifyMode" @change="onClusterChange">
                  <el-option v-for="c in clusterList" :key="c.cluster_name" :label="c.cluster_name" :value="c.cluster_name" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="授权类型" prop="policy_type" :rules="[{ required: true, message: '请选择' }]">
                <el-select v-model="formData.policy_type" style="width: 100%;" :disabled="isModifyMode" @change="onPolicyTypeChange">
                  <el-option label="Hive" value="hive" />
                  <el-option label="HBase" value="hbase" />
                  <el-option label="Delta" value="delta" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          
          <div v-if="formData.policy_type === 'hive'">
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="Hive Database" prop="hive_db_arr" :rules="[{ required: true, message: '请选择数据库', trigger: 'change' }]">
                  <!-- 修改点 1：加上 :disabled="isModifyMode" -->
                  <el-select v-model="formData.hive_db_arr" multiple filterable allow-create default-first-option placeholder="选择或输入数据库" style="width: 100%;" :disabled="isModifyMode" @change="onHiveDbChange">
                    <el-option v-for="db in hiveDbs" :key="db" :label="db" :value="db" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="Hive Table">
                  <!-- 修改点 1：加上 :disabled="isModifyMode" -->
                  <el-select v-model="formData.hive_table_arr" multiple filterable allow-create default-first-option placeholder="选择或输入表" style="width: 100%;" :disabled="isModifyMode || formData.hive_db_arr.length !== 1">
                    <el-option v-for="tb in hiveTables" :key="tb" :label="tb" :value="tb" />
                  </el-select>
                  <div v-if="formData.hive_db_arr.length !== 1 && formData.hive_db_arr.length > 0" style="font-size: 12px; color: #909399; margin-top: 4px;">
                    选择了多个库，表将默认为 *
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
          </div>
          
          <div v-else-if="formData.policy_type === 'hbase'">
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="HBase Namespace" prop="hbase_ns_arr" :rules="[{ required: true, message: '请选择命名空间', trigger: 'change' }]">
                  <!-- 修改点 1：加上 :disabled="isModifyMode" -->
                  <el-select v-model="formData.hbase_ns_arr" multiple filterable allow-create default-first-option placeholder="选择或输入 Namespace" style="width: 100%;" :disabled="isModifyMode" @change="onHbaseNsChange">
                    <el-option v-for="ns in hbaseNamespaces" :key="ns" :label="ns" :value="ns" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="HBase Table">
                  <!-- 修改点 1：加上 :disabled="isModifyMode" -->
                  <el-select v-model="formData.hbase_table_arr" multiple filterable allow-create default-first-option placeholder="选择或输入表" style="width: 100%;" :disabled="isModifyMode || formData.hbase_ns_arr.length !== 1">
                    <el-option v-for="tb in hbaseTables" :key="tb" :label="tb" :value="tb" />
                  </el-select>
                  <div v-if="formData.hbase_ns_arr.length !== 1 && formData.hbase_ns_arr.length > 0" style="font-size: 12px; color: #909399; margin-top: 4px;">
                    选择了多个 Namespace，表将默认为 *
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="HBase Column-family">
                  <el-input v-model="formData.hbase_cf" disabled placeholder="默认 *" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="HBase Column">
                  <el-input v-model="formData.resource_column" disabled placeholder="默认 *" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>
          
          <div v-else-if="formData.policy_type === 'delta'">
             <el-form-item label="Delta URL 路径" prop="db_or_url" :rules="[{ required: true, message: '请输入路径', trigger: 'blur' }]">
                <!-- 修改点 1：加上 :disabled="isModifyMode" -->
                <el-input v-model="formData.db_or_url" placeholder="如: /user/hive/warehouse/test" :disabled="isModifyMode" />
             </el-form-item>
          </div>
        </div>

        <div class="form-section">
          <div class="section-title">权限配置</div>
          <el-form-item label="拒绝所有未明确允许的访问">
            <el-switch v-model="formData.deny_all_other_access" active-value="1" inactive-value="0" />
          </el-form-item>

          <el-tabs type="border-card" class="custom-tabs">
            <!-- 1. 允许 (Allow) -->
            <el-tab-pane label="允许 (Allow)">
              <div v-for="(item, index) in formData.allow_items" :key="index" class="policy-item-box">
                <el-row :gutter="16">
                  <el-col :span="7">
                    <el-form-item label="用户">
                      <el-select v-model="item.users" multiple filterable allow-create default-first-option placeholder="点击搜索或输入" style="width: 100%;">
                        <el-option v-for="u in allRangerUsers" :key="u" :label="u" :value="u" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="7">
                    <el-form-item label="用户组">
                      <el-select v-model="item.groups" multiple filterable allow-create default-first-option placeholder="点击搜索或输入" style="width: 100%;">
                        <el-option v-for="g in allRangerGroups" :key="g" :label="g" :value="g" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="权限">
                      <el-select 
                        :ref="el => setItemRef(el, 'add_allow', index)"
                        v-model="item.permissions" 
                        multiple 
                        placeholder="选择权限" 
                        style="width: 100%;"
                      >
                        <!-- 修改点 2：将全选功能作为第一个 option 放入，保障点击绝对灵敏 -->
                        <el-option value="__SELECT_ALL__" @click.stop="toggleItemAllPermissions('add_allow', index)">
                          <div style="font-weight: bold; cursor: pointer; display: flex; align-items: center;">
                            <el-checkbox :model-value="isItemAllPermissionsSelected('add_allow', index)" style="pointer-events: none;" />
                            <span style="margin-left: 8px;">Select/Deselect All</span>
                          </div>
                        </el-option>
                        <!-- 修改点 3：去掉自定义的 el-checkbox，保留原生勾选效果 -->
                        <el-option
                          v-for="p in getAvailablePermissions(formData.policy_type)"
                          :key="p"
                          :label="p"
                          :value="p"
                        />
                        <template #footer>
                          <div style="padding: 8px; text-align: right; border-top: 1px solid #ebeef5;">
                            <el-button size="small" type="success" @click="confirmItemPermissions('add_allow', index)">✔</el-button>
                            <el-button size="small" @click="closeItemDropdown('add_allow', index)">✖</el-button>
                          </div>
                        </template>
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="2" style="display: flex; align-items: center; justify-content: center; padding-top: 30px;">
                    <el-button type="danger" link @click="formData.allow_items.splice(index, 1)"><el-icon :size="20"><Delete /></el-icon></el-button>
                  </el-col>
                </el-row>
              </div>
              <el-button type="primary" plain @click="formData.allow_items.push({users:[], groups:[], permissions:[]})">添加条目</el-button>
            </el-tab-pane>
            
            <!-- 2. 排除允许 (Exclude) -->
            <el-tab-pane label="排除允许 (Exclude)">
              <div v-for="(item, index) in formData.exclude_allow_items" :key="index" class="policy-item-box">
                <el-row :gutter="16">
                  <el-col :span="7">
                    <el-form-item label="用户">
                      <el-select v-model="item.users" multiple filterable allow-create default-first-option placeholder="点击搜索或输入" style="width: 100%;">
                        <el-option v-for="u in allRangerUsers" :key="u" :label="u" :value="u" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="7">
                    <el-form-item label="用户组">
                      <el-select v-model="item.groups" multiple filterable allow-create default-first-option placeholder="点击搜索或输入" style="width: 100%;">
                        <el-option v-for="g in allRangerGroups" :key="g" :label="g" :value="g" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="权限">
                      <el-select 
                        :ref="el => setItemRef(el, 'add_exclude', index)"
                        v-model="item.permissions" 
                        multiple 
                        placeholder="选择权限" 
                        style="width: 100%;"
                      >
                        <el-option value="__SELECT_ALL__" @click.stop="toggleItemAllPermissions('add_exclude', index)">
                          <div style="font-weight: bold; cursor: pointer; display: flex; align-items: center;">
                            <el-checkbox :model-value="isItemAllPermissionsSelected('add_exclude', index)" style="pointer-events: none;" />
                            <span style="margin-left: 8px;">Select/Deselect All</span>
                          </div>
                        </el-option>
                        <el-option
                          v-for="p in getAvailablePermissions(formData.policy_type)"
                          :key="p"
                          :label="p"
                          :value="p"
                        />
                        <template #footer>
                          <div style="padding: 8px; text-align: right; border-top: 1px solid #ebeef5;">
                            <el-button size="small" type="success" @click="confirmItemPermissions('add_exclude', index)">✔</el-button>
                            <el-button size="small" @click="closeItemDropdown('add_exclude', index)">✖</el-button>
                          </div>
                        </template>
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="2" style="display: flex; align-items: center; justify-content: center; padding-top: 30px;">
                    <el-button type="danger" link @click="formData.exclude_allow_items.splice(index, 1)"><el-icon :size="20"><Delete /></el-icon></el-button>
                  </el-col>
                </el-row>
              </div>
              <el-button type="primary" plain @click="formData.exclude_allow_items.push({users:[], groups:[], permissions:[]})">添加条目</el-button>
            </el-tab-pane>
            
            <!-- 3. 禁止 (Deny) -->
            <el-tab-pane label="禁止 (Deny)" :disabled="formData.deny_all_other_access === '1'">
              <div v-for="(item, index) in formData.deny_items" :key="index" class="policy-item-box">
                <el-row :gutter="16">
                  <el-col :span="7">
                    <el-form-item label="用户">
                      <el-select v-model="item.users" multiple filterable allow-create default-first-option placeholder="点击搜索或输入" style="width: 100%;" :disabled="formData.deny_all_other_access === '1'">
                        <el-option v-for="u in allRangerUsers" :key="u" :label="u" :value="u" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="7">
                    <el-form-item label="用户组">
                      <el-select v-model="item.groups" multiple filterable allow-create default-first-option placeholder="点击搜索或输入" style="width: 100%;" :disabled="formData.deny_all_other_access === '1'">
                        <el-option v-for="g in allRangerGroups" :key="g" :label="g" :value="g" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="权限">
                      <el-select 
                        :ref="el => setItemRef(el, 'add_deny', index)"
                        v-model="item.permissions" 
                        multiple 
                        placeholder="选择权限" 
                        style="width: 100%;" :disabled="formData.deny_all_other_access === '1'"
                      >
                        <el-option value="__SELECT_ALL__" @click.stop="toggleItemAllPermissions('add_deny', index)">
                          <div style="font-weight: bold; cursor: pointer; display: flex; align-items: center;">
                            <el-checkbox :model-value="isItemAllPermissionsSelected('add_deny', index)" style="pointer-events: none;" />
                            <span style="margin-left: 8px;">Select/Deselect All</span>
                          </div>
                        </el-option>
                        <el-option
                          v-for="p in getAvailablePermissions(formData.policy_type)"
                          :key="p"
                          :label="p"
                          :value="p"
                        />
                        <template #footer>
                          <div style="padding: 8px; text-align: right; border-top: 1px solid #ebeef5;">
                            <el-button size="small" type="success" @click="confirmItemPermissions('add_deny', index)">✔</el-button>
                            <el-button size="small" @click="closeItemDropdown('add_deny', index)">✖</el-button>
                          </div>
                        </template>
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="2" style="display: flex; align-items: center; justify-content: center; padding-top: 30px;">
                    <el-button type="danger" link @click="formData.deny_items.splice(index, 1)" :disabled="formData.deny_all_other_access === '1'"><el-icon :size="20"><Delete /></el-icon></el-button>
                  </el-col>
                </el-row>
              </div>
              <el-button type="primary" plain @click="formData.deny_items.push({users:[], groups:[], permissions:[]})" :disabled="formData.deny_all_other_access === '1'">添加条目</el-button>
            </el-tab-pane>
            
            <!-- 4. 排除禁止 (Ex-Deny) -->
            <el-tab-pane label="排除禁止 (Ex-Deny)" :disabled="formData.deny_all_other_access === '1'">
              <div v-for="(item, index) in formData.exclude_deny_items" :key="index" class="policy-item-box">
                <el-row :gutter="16">
                  <el-col :span="7">
                    <el-form-item label="用户">
                      <el-select v-model="item.users" multiple filterable allow-create default-first-option placeholder="点击搜索或输入" style="width: 100%;" :disabled="formData.deny_all_other_access === '1'">
                        <el-option v-for="u in allRangerUsers" :key="u" :label="u" :value="u" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="7">
                    <el-form-item label="用户组">
                      <el-select v-model="item.groups" multiple filterable allow-create default-first-option placeholder="点击搜索或输入" style="width: 100%;" :disabled="formData.deny_all_other_access === '1'">
                        <el-option v-for="g in allRangerGroups" :key="g" :label="g" :value="g" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="权限">
                      <el-select 
                        :ref="el => setItemRef(el, 'add_exdeny', index)"
                        v-model="item.permissions" 
                        multiple 
                        placeholder="选择权限" 
                        style="width: 100%;" :disabled="formData.deny_all_other_access === '1'"
                      >
                        <el-option value="__SELECT_ALL__" @click.stop="toggleItemAllPermissions('add_exdeny', index)">
                          <div style="font-weight: bold; cursor: pointer; display: flex; align-items: center;">
                            <el-checkbox :model-value="isItemAllPermissionsSelected('add_exdeny', index)" style="pointer-events: none;" />
                            <span style="margin-left: 8px;">Select/Deselect All</span>
                          </div>
                        </el-option>
                        <el-option
                          v-for="p in getAvailablePermissions(formData.policy_type)"
                          :key="p"
                          :label="p"
                          :value="p"
                        />
                        <template #footer>
                          <div style="padding: 8px; text-align: right; border-top: 1px solid #ebeef5;">
                            <el-button size="small" type="success" @click="confirmItemPermissions('add_exdeny', index)">✔</el-button>
                            <el-button size="small" @click="closeItemDropdown('add_exdeny', index)">✖</el-button>
                          </div>
                        </template>
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="2" style="display: flex; align-items: center; justify-content: center; padding-top: 30px;">
                    <el-button type="danger" link @click="formData.exclude_deny_items.splice(index, 1)" :disabled="formData.deny_all_other_access === '1'"><el-icon :size="20"><Delete /></el-icon></el-button>
                  </el-col>
                </el-row>
              </div>
              <el-button type="primary" plain @click="formData.exclude_deny_items.push({users:[], groups:[], permissions:[]})" :disabled="formData.deny_all_other_access === '1'">添加条目</el-button>
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button size="large" @click="addDialogVisible = false">取消</el-button>
          <el-button size="large" type="primary" @click="handleSubmitAddOrModify" :loading="submitLoading">确认下发</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- ================= 撤销授权弹窗 ================= -->
    <el-dialog v-model="revokeDialogVisible" title="撤销 Ranger 授权" width="600px" destroy-on-close>
      <el-alert title="注意：这只会从选中策略中移除指定的用户和权限，不会删除整个策略。" type="warning" show-icon style="margin-bottom: 20px;" />
      <el-form :model="revokeForm" ref="revokeFormRef" label-position="top">
        <el-form-item label="要撤销的用户">
          <el-select 
            ref="revokeUserRef"
            v-model="revokeForm.allow_user_arr" multiple filterable allow-create default-first-option
            placeholder="点击下拉或输入搜索" style="width: 100%;"
            @visible-change="(v) => handleDropdownVisible(v, 'users')"
            @change="() => handleSelectChange('revokeUserRef')"
          >
            <el-option v-for="u in allRangerUsers" :key="u" :label="u" :value="u" />
          </el-select>
        </el-form-item>
        <el-form-item label="要撤销的用户组">
          <el-select 
            ref="revokeGroupRef"
            v-model="revokeForm.allow_group_arr" multiple filterable allow-create default-first-option
            placeholder="点击下拉或输入搜索" style="width: 100%;"
            @visible-change="(v) => handleDropdownVisible(v, 'groups')"
            @change="() => handleSelectChange('revokeGroupRef')"
          >
            <el-option v-for="g in allRangerGroups" :key="g" :label="g" :value="g" />
          </el-select>
        </el-form-item>
        <el-form-item label="要撤销的权限">
          <el-select 
            :ref="el => setItemRef(el, 'revoke', 0)"
            v-model="revokeForm.allow_permissions_arr" 
            multiple 
            placeholder="选择要撤销的具体权限" 
            style="width: 100%;"
          >
            <el-option value="__SELECT_ALL__" @click.stop="toggleItemAllPermissions('revoke', 0)">
              <div style="font-weight: bold; cursor: pointer; display: flex; align-items: center;">
                <el-checkbox :model-value="isItemAllPermissionsSelected('revoke', 0)" style="pointer-events: none;" />
                <span style="margin-left: 8px;">Select/Deselect All</span>
              </div>
            </el-option>
            <el-option
              v-for="p in getAvailablePermissions(revokeForm.policy_type)"
              :key="p"
              :label="p"
              :value="p"
            />
            <template #footer>
              <div style="padding: 8px; text-align: right; border-top: 1px solid #ebeef5;">
                <el-button size="small" type="success" @click="confirmItemPermissions('revoke', 0)">✔</el-button>
                <el-button size="small" @click="closeItemDropdown('revoke', 0)">✖</el-button>
              </div>
            </template>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="revokeDialogVisible = false">取消</el-button>
          <el-button type="warning" @click="handleSubmitRevoke" :loading="submitLoading">确认撤销</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- ================= 拷贝策略弹窗 ================= -->
    <el-dialog v-model="copyDialogVisible" title="拷贝 Ranger 授权" width="950px" destroy-on-close>
      <el-form :model="copyForm" ref="copyFormRef" label-position="top">
        
        <div class="form-section">
          <div class="section-title">基础配置</div>
          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="集群">
                <el-input v-model="copyForm.cluster_name" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="授权类型">
                <el-input :value="copyForm.policy_type === 'hbase' ? 'HBase' : (copyForm.policy_type === 'hive' ? 'Hive' : 'Delta')" disabled />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 源对象 -->
        <div class="form-section">
          <div class="section-title">源对象 (只读)</div>
          <el-row :gutter="24">
            <el-col :span="12" v-if="copyForm.policy_type === 'hive'">
              <el-form-item label="Hive Database">
                <el-input v-model="copySourceDb" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="12" v-if="copyForm.policy_type === 'hive'">
              <el-form-item label="Hive Table">
                <el-input v-model="copySourceTable" disabled placeholder="*" />
              </el-form-item>
            </el-col>

            <el-col :span="12" v-if="copyForm.policy_type === 'hbase'">
              <el-form-item label="HBase Namespace">
                <el-input v-model="copySourceDb" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="12" v-if="copyForm.policy_type === 'hbase'">
              <el-form-item label="HBase Table">
                <el-input v-model="copySourceTable" disabled placeholder="*" />
              </el-form-item>
            </el-col>

            <el-col :span="24" v-if="copyForm.policy_type === 'delta'">
              <el-form-item label="Delta URL 路径">
                <el-input v-model="copySourceDisplay" disabled />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 目标对象 -->
        <div class="form-section" style="background: #f0f7ff; border: 1px solid #d9ecff;">
          <div class="section-title" style="border-left-color: #409eff;">目标对象 (必须修改)</div>

          <!-- Hive 目标 -->
          <div v-if="copyForm.policy_type === 'hive'">
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="Hive Database" prop="copy_hive_db_arr" :rules="[{ required: true, message: '请选择' }]">
                  <el-select v-model="copyForm.copy_hive_db_arr" multiple filterable allow-create default-first-option placeholder="选择或输入" style="width: 100%;" @change="onCopyHiveDbChange">
                    <el-option v-for="db in hiveDbs" :key="db" :label="db" :value="db" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="Hive Table">
                  <el-select v-model="copyForm.copy_hive_table_arr" multiple filterable allow-create default-first-option placeholder="选择或输入" style="width: 100%;" :disabled="copyForm.copy_hive_db_arr.length !== 1">
                    <el-option v-for="tb in copyHiveTables" :key="tb" :label="tb" :value="tb" />
                  </el-select>
                  <div v-if="copyForm.copy_hive_db_arr.length !== 1 && copyForm.copy_hive_db_arr.length > 0" style="font-size: 12px; color: #909399; margin-top: 4px;">
                    选择了多个库，表将默认为 *
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <!-- HBase 目标 -->
          <div v-else-if="copyForm.policy_type === 'hbase'">
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="HBase Namespace" prop="copy_hbase_ns_arr" :rules="[{ required: true, message: '请选择' }]">
                  <el-select v-model="copyForm.copy_hbase_ns_arr" multiple filterable allow-create default-first-option placeholder="选择或输入" style="width: 100%;" @change="onCopyHbaseNsChange">
                    <el-option v-for="ns in hbaseNamespaces" :key="ns" :label="ns" :value="ns" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="HBase Table">
                  <el-select v-model="copyForm.copy_hbase_table_arr" multiple filterable allow-create default-first-option placeholder="选择或输入" style="width: 100%;" :disabled="copyForm.copy_hbase_ns_arr.length !== 1">
                    <el-option v-for="tb in copyHbaseTables" :key="tb" :label="tb" :value="tb" />
                  </el-select>
                  <div v-if="copyForm.copy_hbase_ns_arr.length !== 1 && copyForm.copy_hbase_ns_arr.length > 0" style="font-size: 12px; color: #909399; margin-top: 4px;">
                    选择了多个 Namespace，表将默认为 *
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="HBase Column-family">
                  <el-input v-model="copyForm.target_hbase_cf" disabled placeholder="默认 *" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="HBase Column">
                  <el-input v-model="copyForm.target_resource_column" disabled placeholder="默认 *" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <!-- Delta 目标 -->
          <div v-else-if="copyForm.policy_type === 'delta'">
            <el-form-item label="Delta URL 路径" prop="copy_delta_url" :rules="[{ required: true, message: '请输入路径' }]">
               <el-input v-model="copyForm.copy_delta_url" placeholder="如: /user/hive/warehouse/test" />
            </el-form-item>
          </div>
        </div>

        <!-- 权限配置 (支持多条目) -->
        <div class="form-section">
          <div class="section-title">权限配置 (对目标生效)</div>
          <el-form-item label="拒绝所有未明确允许的访问">
            <el-switch v-model="copyForm.deny_all_other_access" active-value="1" inactive-value="0" />
          </el-form-item>

          <el-tabs type="border-card" class="custom-tabs">
            <el-tab-pane label="允许 (Allow)">
              <div v-for="(item, index) in copyForm.allow_items" :key="index" class="policy-item-box">
                <el-row :gutter="16">
                  <el-col :span="7">
                    <el-form-item label="用户">
                      <el-select v-model="item.users" multiple filterable allow-create default-first-option placeholder="点击搜索或输入" style="width: 100%;">
                        <el-option v-for="u in allRangerUsers" :key="u" :label="u" :value="u" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="7">
                    <el-form-item label="用户组">
                      <el-select v-model="item.groups" multiple filterable allow-create default-first-option placeholder="点击搜索或输入" style="width: 100%;">
                        <el-option v-for="g in allRangerGroups" :key="g" :label="g" :value="g" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="权限">
                      <el-select 
                        :ref="el => setItemRef(el, 'copy_allow', index)"
                        v-model="item.permissions" 
                        multiple 
                        placeholder="选择权限" 
                        style="width: 100%;"
                      >
                        <el-option value="__SELECT_ALL__" @click.stop="toggleItemAllPermissions('copy_allow', index)">
                          <div style="font-weight: bold; cursor: pointer; display: flex; align-items: center;">
                            <el-checkbox :model-value="isItemAllPermissionsSelected('copy_allow', index)" style="pointer-events: none;" />
                            <span style="margin-left: 8px;">Select/Deselect All</span>
                          </div>
                        </el-option>
                        <el-option
                          v-for="p in getAvailablePermissions(copyForm.policy_type)"
                          :key="p"
                          :label="p"
                          :value="p"
                        />
                        <template #footer>
                          <div style="padding: 8px; text-align: right; border-top: 1px solid #ebeef5;">
                            <el-button size="small" type="success" @click="confirmItemPermissions('copy_allow', index)">✔</el-button>
                            <el-button size="small" @click="closeItemDropdown('copy_allow', index)">✖</el-button>
                          </div>
                        </template>
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="2" style="display: flex; align-items: center; justify-content: center; padding-top: 30px;">
                    <el-button type="danger" link @click="copyForm.allow_items.splice(index, 1)"><el-icon :size="20"><Delete /></el-icon></el-button>
                  </el-col>
                </el-row>
              </div>
              <el-button type="primary" plain @click="copyForm.allow_items.push({users:[], groups:[], permissions:[]})">添加条目</el-button>
            </el-tab-pane>
            
            <el-tab-pane label="排除允许 (Exclude)">
              <div v-for="(item, index) in copyForm.exclude_allow_items" :key="index" class="policy-item-box">
                <el-row :gutter="16">
                  <el-col :span="7">
                    <el-form-item label="用户">
                      <el-select v-model="item.users" multiple filterable allow-create default-first-option placeholder="点击搜索或输入" style="width: 100%;">
                        <el-option v-for="u in allRangerUsers" :key="u" :label="u" :value="u" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="7">
                    <el-form-item label="用户组">
                      <el-select v-model="item.groups" multiple filterable allow-create default-first-option placeholder="点击搜索或输入" style="width: 100%;">
                        <el-option v-for="g in allRangerGroups" :key="g" :label="g" :value="g" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="权限">
                      <el-select 
                        :ref="el => setItemRef(el, 'copy_exclude', index)"
                        v-model="item.permissions" 
                        multiple 
                        placeholder="选择权限" 
                        style="width: 100%;"
                      >
                        <el-option value="__SELECT_ALL__" @click.stop="toggleItemAllPermissions('copy_exclude', index)">
                          <div style="font-weight: bold; cursor: pointer; display: flex; align-items: center;">
                            <el-checkbox :model-value="isItemAllPermissionsSelected('copy_exclude', index)" style="pointer-events: none;" />
                            <span style="margin-left: 8px;">Select/Deselect All</span>
                          </div>
                        </el-option>
                        <el-option
                          v-for="p in getAvailablePermissions(copyForm.policy_type)"
                          :key="p"
                          :label="p"
                          :value="p"
                        />
                        <template #footer>
                          <div style="padding: 8px; text-align: right; border-top: 1px solid #ebeef5;">
                            <el-button size="small" type="success" @click="confirmItemPermissions('copy_exclude', index)">✔</el-button>
                            <el-button size="small" @click="closeItemDropdown('copy_exclude', index)">✖</el-button>
                          </div>
                        </template>
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="2" style="display: flex; align-items: center; justify-content: center; padding-top: 30px;">
                    <el-button type="danger" link @click="copyForm.exclude_allow_items.splice(index, 1)"><el-icon :size="20"><Delete /></el-icon></el-button>
                  </el-col>
                </el-row>
              </div>
              <el-button type="primary" plain @click="copyForm.exclude_allow_items.push({users:[], groups:[], permissions:[]})">添加条目</el-button>
            </el-tab-pane>
            
            <el-tab-pane label="禁止 (Deny)" :disabled="copyForm.deny_all_other_access === '1'">
              <div v-for="(item, index) in copyForm.deny_items" :key="index" class="policy-item-box">
                <el-row :gutter="16">
                  <el-col :span="7">
                    <el-form-item label="用户">
                      <el-select v-model="item.users" multiple filterable allow-create default-first-option placeholder="点击搜索或输入" style="width: 100%;" :disabled="copyForm.deny_all_other_access === '1'">
                        <el-option v-for="u in allRangerUsers" :key="u" :label="u" :value="u" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="7">
                    <el-form-item label="用户组">
                      <el-select v-model="item.groups" multiple filterable allow-create default-first-option placeholder="点击搜索或输入" style="width: 100%;" :disabled="copyForm.deny_all_other_access === '1'">
                        <el-option v-for="g in allRangerGroups" :key="g" :label="g" :value="g" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="权限">
                      <el-select 
                        :ref="el => setItemRef(el, 'copy_deny', index)"
                        v-model="item.permissions" 
                        multiple 
                        placeholder="选择权限" 
                        style="width: 100%;" :disabled="copyForm.deny_all_other_access === '1'"
                      >
                        <el-option value="__SELECT_ALL__" @click.stop="toggleItemAllPermissions('copy_deny', index)">
                          <div style="font-weight: bold; cursor: pointer; display: flex; align-items: center;">
                            <el-checkbox :model-value="isItemAllPermissionsSelected('copy_deny', index)" style="pointer-events: none;" />
                            <span style="margin-left: 8px;">Select/Deselect All</span>
                          </div>
                        </el-option>
                        <el-option
                          v-for="p in getAvailablePermissions(copyForm.policy_type)"
                          :key="p"
                          :label="p"
                          :value="p"
                        />
                        <template #footer>
                          <div style="padding: 8px; text-align: right; border-top: 1px solid #ebeef5;">
                            <el-button size="small" type="success" @click="confirmItemPermissions('copy_deny', index)">✔</el-button>
                            <el-button size="small" @click="closeItemDropdown('copy_deny', index)">✖</el-button>
                          </div>
                        </template>
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="2" style="display: flex; align-items: center; justify-content: center; padding-top: 30px;">
                    <el-button type="danger" link @click="copyForm.deny_items.splice(index, 1)" :disabled="copyForm.deny_all_other_access === '1'"><el-icon :size="20"><Delete /></el-icon></el-button>
                  </el-col>
                </el-row>
              </div>
              <el-button type="primary" plain @click="copyForm.deny_items.push({users:[], groups:[], permissions:[]})" :disabled="copyForm.deny_all_other_access === '1'">添加条目</el-button>
            </el-tab-pane>
            
            <el-tab-pane label="排除禁止 (Ex-Deny)" :disabled="copyForm.deny_all_other_access === '1'">
              <div v-for="(item, index) in copyForm.exclude_deny_items" :key="index" class="policy-item-box">
                <el-row :gutter="16">
                  <el-col :span="7">
                    <el-form-item label="用户">
                      <el-select v-model="item.users" multiple filterable allow-create default-first-option placeholder="点击搜索或输入" style="width: 100%;" :disabled="copyForm.deny_all_other_access === '1'">
                        <el-option v-for="u in allRangerUsers" :key="u" :label="u" :value="u" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="7">
                    <el-form-item label="用户组">
                      <el-select v-model="item.groups" multiple filterable allow-create default-first-option placeholder="点击搜索或输入" style="width: 100%;" :disabled="copyForm.deny_all_other_access === '1'">
                        <el-option v-for="g in allRangerGroups" :key="g" :label="g" :value="g" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="权限">
                      <el-select 
                        :ref="el => setItemRef(el, 'copy_exdeny', index)"
                        v-model="item.permissions" 
                        multiple 
                        placeholder="选择权限" 
                        style="width: 100%;" :disabled="copyForm.deny_all_other_access === '1'"
                      >
                        <el-option value="__SELECT_ALL__" @click.stop="toggleItemAllPermissions('copy_exdeny', index)">
                          <div style="font-weight: bold; cursor: pointer; display: flex; align-items: center;">
                            <el-checkbox :model-value="isItemAllPermissionsSelected('copy_exdeny', index)" style="pointer-events: none;" />
                            <span style="margin-left: 8px;">Select/Deselect All</span>
                          </div>
                        </el-option>
                        <el-option
                          v-for="p in getAvailablePermissions(copyForm.policy_type)"
                          :key="p"
                          :label="p"
                          :value="p"
                        />
                        <template #footer>
                          <div style="padding: 8px; text-align: right; border-top: 1px solid #ebeef5;">
                            <el-button size="small" type="success" @click="confirmItemPermissions('copy_exdeny', index)">✔</el-button>
                            <el-button size="small" @click="closeItemDropdown('copy_exdeny', index)">✖</el-button>
                          </div>
                        </template>
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="2" style="display: flex; align-items: center; justify-content: center; padding-top: 30px;">
                    <el-button type="danger" link @click="copyForm.exclude_deny_items.splice(index, 1)" :disabled="copyForm.deny_all_other_access === '1'"><el-icon :size="20"><Delete /></el-icon></el-button>
                  </el-col>
                </el-row>
              </div>
              <el-button type="primary" plain @click="copyForm.exclude_deny_items.push({users:[], groups:[], permissions:[]})" :disabled="copyForm.deny_all_other_access === '1'">添加条目</el-button>
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="copyDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitCopy" :loading="copyLoading">确认拷贝</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { getClusterList } from '../../../api/cluster'
import { getPolicyRecords, executePolicy, deletePolicy, refreshPolicy, copyPolicy, modifyPolicy, getRangerIdentities, togglePolicy, getHiveDatabases, getHiveTables, getHbaseNamespaces, getHbaseTables } from '../../../api/policy'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, CircleCheck, CircleClose, Delete, Remove } from '@element-plus/icons-vue'

const loading = ref(false)
const submitLoading = ref(false)
const clusterList = ref([])
const rawTableData = ref([]) 
const selectedRows = ref([])

const tableRef = ref(null)
const expandedRowKeys = ref([])
const isExpandAll = ref(true)

const queryParams = reactive({ 
  cluster_name: 'all', policy_type: '', policy_name: '', db_or_url: '', user: '', group: ''
})

const PERMISSION_POOL = {
  hive: [
    'Select', 'Update', 'Create', 'Drop', 'Alter', 'Index', 'Lock', 'All', 
    'Read', 'Write', 'ReplAdmin', 'Service Admin', 'Temporary UDF Admin', 'Refresh'
  ],
  hbase: ['Read', 'Write', 'Create', 'Admin', 'Execute'],
  delta: [
    'Select', 'Update', 'Create', 'Drop', 'Alter', 'Index', 'Lock', 'All', 
    'Read', 'Write', 'ReplAdmin', 'Service Admin', 'Temporary UDF Admin', 'Refresh'
  ]
}

const normalizePermissions = (arr, policyType) => {
  if (!arr || !arr.length) return []
  const pool = PERMISSION_POOL[policyType] || PERMISSION_POOL['hive']
  const result = new Set()
  arr.forEach(perm => {
    const matched = pool.find(p => p.toLowerCase() === perm.toLowerCase())
    result.add(matched || perm)
  })
  return Array.from(result)
}

const allRangerUsers = ref([])
const allRangerGroups = ref([])
const hiveDbs = ref([])
const hiveTables = ref([])
const hbaseNamespaces = ref(['default'])
const hbaseTables = ref([])

const copyHiveTables = ref([])
const copyHbaseTables = ref([])
const copySourceDb = ref('')
const copySourceTable = ref('*')
const copySourceDisplay = ref('')

const addDialogVisible = ref(false)
const isModifyMode = ref(false)
const formRef = ref(null)

const emptyItem = () => ({users:[], groups:[], permissions:[]})

const initialFormData = {
  cluster_name: '', policy_type: 'hive', action: 'add', 
  db_or_url: '', hbase_cf: '*', resource_column: '*',
  hive_db_arr: [], hive_table_arr: [],
  hbase_ns_arr: ['default'], hbase_table_arr: [],
  allow_items: [emptyItem()],
  exclude_allow_items: [emptyItem()],
  deny_items: [emptyItem()],
  exclude_deny_items: [emptyItem()],
  deny_all_other_access: '0'
}
const formData = reactive({ ...initialFormData })

const revokeDialogVisible = ref(false)
const revokeFormRef = ref(null)
const revokeForm = reactive({
  cluster_name: '', policy_type: '', policy_names: [], action: 'remove',
  allow_user_arr: [], allow_group_arr: [], allow_permissions_arr: []
})

const copyDialogVisible = ref(false)
const copyLoading = ref(false)
const copyForm = reactive({
  cluster_name: '', source_policy_name: '', policy_type: '',
  copy_hive_db_arr: [], copy_hive_table_arr: [],
  copy_hbase_ns_arr: [], copy_hbase_table_arr: [],
  copy_delta_url: '', target_hbase_cf: '*', target_resource_column: '*',
  allow_items: [emptyItem()],
  exclude_allow_items: [emptyItem()],
  deny_items: [emptyItem()],
  exclude_deny_items: [emptyItem()],
  deny_all_other_access: '0'
})

const hasExecutePermission = computed(() => {
  const info = JSON.parse(localStorage.getItem('user_info') || '{}')
  return info.permissions && info.permissions.includes('policy:execute')
})
const hasModifyPermission = computed(() => {
  const info = JSON.parse(localStorage.getItem('user_info') || '{}')
  return info.permissions && info.permissions.includes('policy:modify')
})
const hasDeletePermission = computed(() => {
  const info = JSON.parse(localStorage.getItem('user_info') || '{}')
  return info.permissions && info.permissions.includes('policy:delete')
})

const filteredTableData = computed(() => {
  const { cluster_name, policy_type, policy_name, db_or_url, user, group } = queryParams;
  return rawTableData.value.filter(item => {
    if (cluster_name && cluster_name !== 'all' && item.cluster_name !== cluster_name) return false;
    if (policy_type && item.policy_type !== policy_type) return false;
    if (policy_name && !item.policy_name.toLowerCase().includes(policy_name.toLowerCase())) return false;
    if (db_or_url && !item.db_or_url.toLowerCase().includes(db_or_url.toLowerCase())) return false;
    if (user && !item.details.some(d => d.user_name.some(u => u.toLowerCase().includes(user.toLowerCase())))) return false;
    if (group && !item.details.some(d => d.group_name.some(g => g.toLowerCase().includes(group.toLowerCase())))) return false;
    return true;
  });
});

const tableRowClassName = ({ rowIndex }) => rowIndex % 2 === 0 ? 'even-row' : 'odd-row'

const handleExpandChange = (row, expandedRows) => {
  const expandedKeys = expandedRows.map(r => r.policy_id)
  isExpandAll.value = expandedKeys.length === filteredTableData.value.length
}

const toggleExpandAll = () => {
  if (isExpandAll.value) {
    expandedRowKeys.value = []
    isExpandAll.value = false
  } else {
    expandedRowKeys.value = filteredTableData.value.map(item => item.policy_id)
    isExpandAll.value = true
  }
}

const handleSelectionChange = (val) => { selectedRows.value = val }

const fetchClusters = async () => {
  clusterList.value = await getClusterList()
  fetchData()
}

const fetchData = async () => {
  loading.value = true
  try {
    const targetCluster = queryParams.cluster_name === 'all' ? '' : queryParams.cluster_name;
    const res = await getPolicyRecords(targetCluster)
    let list = res.data || []
    
    list.sort((a, b) => {
      const clusterCompare = (a.cluster_name || '').localeCompare(b.cluster_name || '');
      if (clusterCompare !== 0) return clusterCompare;
      return (a.policy_id || 0) - (b.policy_id || 0);
    })
    
    list.forEach(item => {
      item.refreshing = false
      item.toggling = false
      if (item.details) {
        const orderMap = { 'allow': 1, 'exclude_allow': 2, 'deny': 3, 'exclude_deny': 4 };
        item.details.sort((x, y) => (orderMap[x.item_type] || 99) - (orderMap[y.item_type] || 99));
      }
    })
    
    rawTableData.value = list
    
    nextTick(() => {
      if (isExpandAll.value) {
        expandedRowKeys.value = list.map(item => item.policy_id)
      }
    })
  } finally {
    loading.value = false
  }
}

const handleSearch = () => { fetchData() }

const handleToggleStatus = async (row, newVal) => {
  row.toggling = true
  const enable = newVal === '1'
  try {
    const payload = {
      cluster_name: row.cluster_name,
      policy_type: row.policy_type,
      policy_names: [row.policy_name],
      enable: enable
    }
    const res = await togglePolicy(payload)
    if (res.code === 200) {
      ElMessage.success(enable ? '策略已启用' : '策略已禁用')
    } else {
      ElMessage.error(res.msg || '操作失败')
      row.is_enabled = enable ? '0' : '1'
    }
  } catch (e) {
    console.error(e)
    row.is_enabled = enable ? '0' : '1'
  } finally {
    row.toggling = false
  }
}

// ================= 资源级联联动逻辑 =================

const onClusterChange = async (clusterName) => {
  allRangerUsers.value = []
  allRangerGroups.value = []
  hiveDbs.value = []
  
  if (!clusterName) return
  
  try {
    const [usersRes, groupsRes] = await Promise.all([
      getRangerIdentities(clusterName, 'users'),
      getRangerIdentities(clusterName, 'groups')
    ])
    if (usersRes.code === 200) allRangerUsers.value = usersRes.data || []
    if (groupsRes.code === 200) allRangerGroups.value = groupsRes.data || []
    
    if (formData.policy_type === 'hive') {
      const dbRes = await getHiveDatabases(clusterName)
      if (dbRes && dbRes.code === 200) {
        hiveDbs.value = dbRes.data || []
      }
    } else if (formData.policy_type === 'hbase') {
      const nsRes = await getHbaseNamespaces(clusterName)
      if (nsRes && nsRes.code === 200) {
        hbaseNamespaces.value = nsRes.data || ['default']
      }
    }
  } catch (e) {
    console.error("拉取依赖数据失败", e)
  }
}

const onPolicyTypeChange = (type) => {
  formData.hive_db_arr = []
  formData.hive_table_arr = []
  formData.hbase_ns_arr = ['default']
  formData.hbase_table_arr = []
  
  if (!formData.cluster_name) return

  if (type === 'hive') {
    getHiveDatabases(formData.cluster_name).then(res => {
      if (res && res.code === 200) hiveDbs.value = res.data || []
    })
  } else if (type === 'hbase') {
    getHbaseNamespaces(formData.cluster_name).then(res => {
      if (res && res.code === 200) hbaseNamespaces.value = res.data || ['default']
    })
  }
}

const onHiveDbChange = async (selectedDbs) => {
  if (selectedDbs.length === 1) {
    try {
      const res = await getHiveTables(formData.cluster_name, selectedDbs[0])
      if (res && res.code === 200) hiveTables.value = res.data || []
    } catch(e) { console.error(e) }
  } else {
    hiveTables.value = []
    formData.hive_table_arr = []
  }
}

const onHbaseNsChange = async (selectedNs) => {
  if (selectedNs.length === 1) {
    hbaseTables.value = []
    try {
      const res = await getHbaseTables(formData.cluster_name, selectedNs[0])
      if (res && res.code === 200) {
        hbaseTables.value = res.data || []
      }
    } catch(e) { 
      console.error("获取 HBase 表失败", e) 
    }
  } else {
    hbaseTables.value = []
    formData.hbase_table_arr = []
  }
}

const getAvailablePermissions = (policyType) => {
  return PERMISSION_POOL[policyType] || PERMISSION_POOL['hive']
}

const handleDropdownVisible = async (visible, type) => {
  if (visible) {
    const targetArr = type === 'users' ? allRangerUsers : allRangerGroups
    if (targetArr.value.length === 0 && formData.cluster_name) {
      try {
        const res = await getRangerIdentities(formData.cluster_name, type)
        if (res.code === 200) {
          targetArr.value = res.data || []
        }
      } catch (e) {
        console.error("补拉数据失败", e)
      }
    }
  }
}

const handleSelectChange = () => {}

// ================= 新增/修改逻辑 =================

const handleOpenAddDialog = () => {
  isModifyMode.value = false
  Object.assign(formData, initialFormData)
  formData.allow_items = [emptyItem()]
  formData.exclude_allow_items = [emptyItem()]
  formData.deny_items = [emptyItem()]
  formData.exclude_deny_items = [emptyItem()]
  
  formData.cluster_name = queryParams.cluster_name === 'all' ? '' : queryParams.cluster_name
  if (formData.cluster_name) onClusterChange(formData.cluster_name)
  addDialogVisible.value = true
}

const buildItemsFromDetails = (details, policyType, targetObject) => {
  targetObject.allow_items = []
  targetObject.exclude_allow_items = []
  targetObject.deny_items = []
  targetObject.exclude_deny_items = []

  if (!Array.isArray(details)) return

  details.forEach(detail => {
    if (!detail || !detail.item_type) return
    let targetKey = ''
    if (detail.item_type === 'allow') targetKey = 'allow_items'
    else if (detail.item_type === 'exclude_allow') targetKey = 'exclude_allow_items'
    else if (detail.item_type === 'deny') targetKey = 'deny_items'
    else if (detail.item_type === 'exclude_deny') targetKey = 'exclude_deny_items'
    
    if (targetKey) {
      targetObject[targetKey].push({
        users: Array.isArray(detail.user_name) ? detail.user_name : [],
        groups: Array.isArray(detail.group_name) ? detail.group_name : [],
        permissions: Array.isArray(detail.permissions) ? normalizePermissions(detail.permissions, policyType) : []
      })
    }
  })

  const keys = ['allow_items', 'exclude_allow_items', 'deny_items', 'exclude_deny_items']
  keys.forEach(k => {
    if (targetObject[k].length === 0) {
      targetObject[k].push({ users: [], groups: [], permissions: [] })
    }
  })
}

const handleOpenModify = (row) => {
  isModifyMode.value = true
  Object.assign(formData, initialFormData)
  
  formData.cluster_name = row.cluster_name
  formData.policy_type = row.policy_type
  formData.deny_all_other_access = row.deny_all_other_access
  
  if (row.policy_type === 'hive') {
    if (row.db_or_url.includes('.')) {
      const [db, tb] = row.db_or_url.split('.')
      formData.hive_db_arr = [db]
      if (tb && tb !== '*') formData.hive_table_arr = [tb]
      onHiveDbChange([db]).then(() => {
        formData.hive_table_arr = tb === '*' ? [] : [tb]
      })
    } else {
      formData.hive_db_arr = [row.db_or_url]
      onHiveDbChange([row.db_or_url])
    }
  } else if (row.policy_type === 'hbase') {
    if (row.db_or_url.includes(':')) {
      const [ns, tb] = row.db_or_url.split(':')
      formData.hbase_ns_arr = [ns]
      if (tb && tb !== '*') formData.hbase_table_arr = [tb]
      onHbaseNsChange([ns])
    } else {
      formData.hbase_ns_arr = [row.db_or_url]
      onHbaseNsChange([row.db_or_url])
    }
    formData.hbase_cf = row.hbase_cf || '*'
    formData.resource_column = row.resource_column || '*'
  } else {
    formData.db_or_url = row.db_or_url
  }
  
  buildItemsFromDetails(row.details, row.policy_type, formData)
  if (formData.cluster_name) onClusterChange(formData.cluster_name)
  addDialogVisible.value = true
}

const handleSubmitAddOrModify = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    
    let finalDbOrUrl = ''
    let finalHbaseCf = '*'
    
    if (formData.policy_type === 'hive') {
      if (formData.hive_db_arr.length > 1) {
        finalDbOrUrl = formData.hive_db_arr.join(';')
      } else if (formData.hive_db_arr.length === 1) {
        const db = formData.hive_db_arr[0]
        if (formData.hive_table_arr.length === 0) {
          finalDbOrUrl = db
        } else if (formData.hive_table_arr.length === 1) {
          finalDbOrUrl = `${db}.${formData.hive_table_arr[0]}`
        } else {
          finalDbOrUrl = `${db}.[${formData.hive_table_arr.join(',')}]`
        }
      }
    } else if (formData.policy_type === 'hbase') {
      if (formData.hbase_ns_arr.length > 1) {
        finalDbOrUrl = formData.hbase_ns_arr.map(ns => `${ns}:*`).join(';')
      } else if (formData.hbase_ns_arr.length === 1) {
        const ns = formData.hbase_ns_arr[0]
        // 如果用户没有选表，默认授权整个 Namespace
        if (formData.hbase_table_arr.length === 0) {
          finalDbOrUrl = `${ns}:*` 
        } else if (formData.hbase_table_arr.length === 1) {
          finalDbOrUrl = `${ns}:${formData.hbase_table_arr[0]}`
        } else {
          const tbs = formData.hbase_table_arr.join(',')
          finalDbOrUrl = `${ns}:[${tbs}]`
        }
      }
      finalHbaseCf = formData.hbase_cf
    } else {
      finalDbOrUrl = formData.db_or_url
    }

    if (!finalDbOrUrl) {
      ElMessage.warning('请选择资源对象')
      return
    }

    submitLoading.value = true
    const payload = {
      cluster_name: formData.cluster_name,
      policy_type: formData.policy_type,
      db_or_url: finalDbOrUrl,
      hbase_cf: finalHbaseCf,
      deny_all_other_access: formData.deny_all_other_access,
      allow_items: formData.allow_items.filter(i => i.users.length > 0 || i.groups.length > 0 || i.permissions.length > 0),
      exclude_allow_items: formData.exclude_allow_items.filter(i => i.users.length > 0 || i.groups.length > 0 || i.permissions.length > 0),
      deny_items: formData.deny_items.filter(i => i.users.length > 0 || i.groups.length > 0 || i.permissions.length > 0),
      exclude_deny_items: formData.exclude_deny_items.filter(i => i.users.length > 0 || i.groups.length > 0 || i.permissions.length > 0)
    }

    try {
      let res;
      if (isModifyMode.value) {
        payload.policy_name = rawTableData.value.find(r => r.db_or_url === finalDbOrUrl && r.policy_type === formData.policy_type)?.policy_name
        res = await modifyPolicy(payload)
      } else {
        payload.action = 'add'
        res = await executePolicy(payload)
      }

      if (res.code === 200) {
        ElMessage.success(isModifyMode.value ? '修改成功！' : '下发成功！')
        addDialogVisible.value = false
        fetchData()
      } else {
        ElMessage.error(res.msg || '操作失败')
      }
    } finally {
      submitLoading.value = false
    }
  })
}

const resetAddForm = () => {
  formRef.value?.resetFields()
}

// ================= 撤销逻辑 =================

const handleOpenRevokeDialog = () => {
  if (selectedRows.value.length === 0) return
  const clusterNames = [...new Set(selectedRows.value.map(r => r.cluster_name))]
  if (clusterNames.length > 1) { ElMessage.warning('批量撤销仅支持属于同一个集群的策略，请分开操作。'); return }
  
  revokeForm.cluster_name = clusterNames[0]
  revokeForm.policy_type = selectedRows.value[0].policy_type
  revokeForm.policy_names = selectedRows.value.map(r => r.policy_name)
  revokeForm.allow_user_arr = []
  revokeForm.allow_group_arr = []
  revokeForm.allow_permissions_arr = []
  
  onClusterChange(revokeForm.cluster_name)
  revokeDialogVisible.value = true
}

const handleSubmitRevoke = () => {
  if (revokeForm.allow_user_arr.length === 0 && revokeForm.allow_group_arr.length === 0) {
    ElMessage.warning('请至少输入要撤销的用户或用户组')
    return
  }
  submitLoading.value = true
  try {
    const promises = revokeForm.policy_names.map(pName => {
      const targetRow = rawTableData.value.find(r => r.policy_name === pName);
      if (!targetRow) return Promise.resolve({ code: 200 });
      
      const payload = {
        cluster_name: revokeForm.cluster_name,
        policy_type: revokeForm.policy_type,
        action: 'remove',
        db_or_url: targetRow.db_or_url,
        hbase_cf: targetRow.hbase_cf || '*',
        allow_user: revokeForm.allow_user_arr.join(';'),
        allow_group: revokeForm.allow_group_arr.join(';'),
        allow_permissions: revokeForm.allow_permissions_arr.join(';')
      }
      return executePolicy(payload)
    })

    Promise.all(promises).then(results => {
      const failed = results.filter(r => r.code !== 200);
      if (failed.length === 0) {
        ElMessage.success('撤销成功！')
        revokeDialogVisible.value = false
        fetchData()
      } else {
        ElMessage.error('部分策略撤销失败，请检查')
      }
    }).finally(() => {
      submitLoading.value = false
    })
  } catch(e) {
    console.error(e)
    submitLoading.value = false
  }
}

// ================= 拷贝功能 =================

const handleOpenCopy = (row) => {
  Object.keys(copyForm).forEach(k => {
    if (Array.isArray(copyForm[k])) copyForm[k] = []
    else if (typeof copyForm[k] === 'string') copyForm[k] = ''
  })
  
  Object.assign(copyForm, {
    cluster_name: row.cluster_name,
    source_policy_name: row.policy_name,
    policy_type: row.policy_type,
    deny_all_other_access: row.deny_all_other_access || '0'
  })
  
  getRangerIdentities(row.cluster_name, 'users').then(res => {
    if (res && res.code === 200) allRangerUsers.value = res.data || []
  })
  getRangerIdentities(row.cluster_name, 'groups').then(res => {
    if (res && res.code === 200) allRangerGroups.value = res.data || []
  })
  
  if (row.policy_type === 'hive') {
    getHiveDatabases(row.cluster_name).then(res => {
      if (res && res.code === 200) hiveDbs.value = res.data || []
    })
  } else if (row.policy_type === 'hbase') {
    getHbaseNamespaces(row.cluster_name).then(res => {
      if (res && res.code === 200) hbaseNamespaces.value = res.data || ['default']
    })
  }

  copySourceDb.value = ''
  copySourceTable.value = '*'
  copySourceDisplay.value = ''

  if (row.policy_type === 'hive') {
    if (row.db_or_url.includes('.')) {
      const [db, tb] = row.db_or_url.split('.')
      copySourceDb.value = db
      copySourceTable.value = tb
    } else {
      copySourceDb.value = row.db_or_url
    }
  } else if (row.policy_type === 'hbase') {
    if (row.db_or_url.includes(':')) {
      const [ns, tb] = row.db_or_url.split(':')
      copySourceDb.value = ns
      copySourceTable.value = tb
    } else {
      copySourceDb.value = row.db_or_url
    }
    copyForm.target_hbase_cf = row.hbase_cf || '*'
    copyForm.target_resource_column = row.resource_column || '*'
  } else {
    copySourceDisplay.value = row.db_or_url
  }
  
  buildItemsFromDetails(row.details, row.policy_type, copyForm)
  copyDialogVisible.value = true
}

const onCopyHiveDbChange = async (selectedDbs) => {
  copyHiveTables.value = []
  copyForm.copy_hive_table_arr = []
  if (selectedDbs.length === 1) {
    try {
      const res = await getHiveTables(copyForm.cluster_name, selectedDbs[0])
      if (res && res.code === 200) copyHiveTables.value = res.data || []
    } catch(e) { console.error(e) }
  }
}

const onCopyHbaseNsChange = async (selectedNs) => {
  copyHbaseTables.value = []
  copyForm.copy_hbase_table_arr = []
  if (selectedNs.length === 1) {
    try {
      const res = await getHbaseTables(copyForm.cluster_name, selectedNs[0])
      if (res && res.code === 200) copyHbaseTables.value = res.data || []
    } catch(e) { console.error(e) }
  }
}

const submitCopy = () => {
  copyFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    let target_db_or_url = ''
    if (copyForm.policy_type === 'hive') {
      if (copyForm.copy_hive_db_arr.length === 0) return ElMessage.warning('请选择目标 Database')
      const db = copyForm.copy_hive_db_arr[0]
      if (copyForm.copy_hive_db_arr.length > 1) target_db_or_url = copyForm.copy_hive_db_arr.join(';')
      else if (copyForm.copy_hive_table_arr.length === 0) target_db_or_url = db
      else if (copyForm.copy_hive_table_arr.length === 1) target_db_or_url = `${db}.${copyForm.copy_hive_table_arr[0]}`
      else target_db_or_url = `${db}.[${copyForm.copy_hive_table_arr.join(',')}]`
    } else if (copyForm.policy_type === 'hbase') {
      if (copyForm.copy_hbase_ns_arr.length === 0) return ElMessage.warning('请选择目标 Namespace')
      const ns = copyForm.copy_hbase_ns_arr[0]
      if (copyForm.copy_hbase_ns_arr.length > 1) target_db_or_url = copyForm.copy_hbase_ns_arr.join(';')
      else if (copyForm.copy_hbase_table_arr.length === 0) target_db_or_url = ns === 'default' ? '*' : `${ns}:*`
      else if (copyForm.copy_hbase_table_arr.length === 1) target_db_or_url = ns === 'default' ? copyForm.copy_hbase_table_arr[0] : `${ns}:${copyForm.copy_hbase_table_arr[0]}`
      else {
        const tbs = copyForm.copy_hbase_table_arr.join(',')
        target_db_or_url = ns === 'default' ? `[${tbs}]` : `${ns}:[${tbs}]`
      }
    } else {
      if (!copyForm.copy_delta_url) return ElMessage.warning('请填写目标路径')
      target_db_or_url = copyForm.copy_delta_url
    }

    let source_full = copySourceDisplay.value;
    if (copyForm.policy_type === 'hbase') {
      source_full = `${copySourceDisplay.value.replace(/\s*\(列簇.*\)/, '')}:${copyForm.target_hbase_cf}`;
    }
    if (target_db_or_url === copySourceDisplay.value || (copyForm.policy_type === 'hbase' && target_db_or_url === source_full)) {
      return ElMessage.warning('目标对象不能与源对象完全一致！')
    }

    copyLoading.value = true
    const payload = {
      cluster_name: copyForm.cluster_name,
      source_policy_name: copyForm.source_policy_name,
      policy_type: copyForm.policy_type,
      target_db_or_url: target_db_or_url,
      target_hbase_cf: copyForm.target_hbase_cf,
      target_resource_column: copyForm.target_resource_column,
      allow_items: copyForm.allow_items.filter(i => i.users.length > 0 || i.groups.length > 0 || i.permissions.length > 0),
      exclude_allow_items: copyForm.exclude_allow_items.filter(i => i.users.length > 0 || i.groups.length > 0 || i.permissions.length > 0),
      deny_items: copyForm.deny_items.filter(i => i.users.length > 0 || i.groups.length > 0 || i.permissions.length > 0),
      exclude_deny_items: copyForm.exclude_deny_items.filter(i => i.users.length > 0 || i.groups.length > 0 || i.permissions.length > 0),
      deny_all_other_access: copyForm.deny_all_other_access
    }

    try {
      const res = await copyPolicy(payload)
      if(res.code === 200) {
        ElMessage.success(res.msg)
        copyDialogVisible.value = false
        fetchData()
      } else ElMessage.error(res.msg)
    } catch(e) { console.error(e) } finally { copyLoading.value = false }
  })
}

const handleRefresh = async (row) => {
  row.refreshing = true
  try {
    const payload = { cluster_name: row.cluster_name, policy_type: row.policy_type, policy_names: [row.policy_name] }
    const res = await refreshPolicy(payload)
    if(res.code === 200) {
      if(res.data.warnings && res.data.warnings.length > 0) ElMessage.warning(res.data.warnings[0])
      else ElMessage.success(`策略 ${row.policy_name} 刷新成功`)
      fetchData()
    } else ElMessage.error(res.msg)
  } catch(e) { console.error(e) } finally { row.refreshing = false }
}

const handleDelete = async (row) => {
  try {
    const payload = { cluster_name: row.cluster_name, policy_type: row.policy_type, policy_names: [row.policy_name] }
    const res = await deletePolicy(payload)
    if (res.code === 200) { ElMessage.success('删除成功'); fetchData() } 
    else ElMessage.error(res.msg)
  } catch(e) { console.error(e) }
}

const handleBatchDelete = () => {
  if (selectedRows.value.length === 0) return
  const clusterNames = [...new Set(selectedRows.value.map(r => r.cluster_name))]
  if (clusterNames.length > 1) { ElMessage.warning('批量删除仅支持属于同一个集群的策略，请分开操作。'); return }
  
  ElMessageBox.confirm(`确定要彻底删除选中的 ${selectedRows.value.length} 个策略吗？所有关联授权将丢失！`, '删除警告', {
    confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning', confirmButtonClass: 'el-button--danger'
  }).then(async () => {
    try {
      const res = await deletePolicy({
        cluster_name: clusterNames[0],
        policy_type: selectedRows.value[0].policy_type,
        policy_names: selectedRows.value.map(row => row.policy_name)
      })
      if (res.code === 200) { ElMessage.success(res.msg || '删除成功'); fetchData() } 
      else ElMessage.error(res.msg)
    } catch(e) { console.error(e) }
  }).catch(() => {})
}

const getTagType = (type) => {
  const map = { 'allow': 'success', 'exclude_allow': 'warning', 'deny': 'danger', 'exclude_deny': 'info' }
  return map[type] || ''
}
const formatItemType = (type) => {
  const map = { 'allow': '允许', 'exclude_allow': '排除允许', 'deny': '禁止', 'exclude_deny': '排除禁止' }
  return map[type] || type
}

// ================= 自定义权限下拉框逻辑 =================
const itemRefs = ref({})

const setItemRef = (el, type, index) => {
  if (!el) return
  if (!itemRefs.value[type]) itemRefs.value[type] = []
  itemRefs.value[type][index] = el
}

const isItemAllPermissionsSelected = (type, index) => {
  const pool = PERMISSION_POOL[formData.policy_type] || PERMISSION_POOL['hive']
  let targetArr = []
  if (type === 'add_allow' || type === 'copy_allow') {
    targetArr = type === 'add_allow' ? formData.allow_items[index]?.permissions : copyForm.allow_items[index]?.permissions
  } else if (type === 'add_exclude' || type === 'copy_exclude') {
    targetArr = type === 'add_exclude' ? formData.exclude_allow_items[index]?.permissions : copyForm.exclude_allow_items[index]?.permissions
  } else if (type === 'add_deny' || type === 'copy_deny') {
    targetArr = type === 'add_deny' ? formData.deny_items[index]?.permissions : copyForm.deny_items[index]?.permissions
  } else if (type === 'add_exdeny' || type === 'copy_exdeny') {
    targetArr = type === 'add_exdeny' ? formData.exclude_deny_items[index]?.permissions : copyForm.exclude_deny_items[index]?.permissions
  } else if (type === 'revoke') {
    targetArr = revokeForm.allow_permissions_arr
  }
  if (!targetArr) return false
  return pool.every(p => targetArr.includes(p))
}

const toggleItemAllPermissions = (type, index) => {
  const pool = PERMISSION_POOL[formData.policy_type] || PERMISSION_POOL['hive']
  const isAll = isItemAllPermissionsSelected(type, index)
  
  const newArr = isAll ? [] : [...pool]
  if (type === 'add_allow') formData.allow_items[index].permissions = newArr
  else if (type === 'add_exclude') formData.exclude_allow_items[index].permissions = newArr
  else if (type === 'add_deny') formData.deny_items[index].permissions = newArr
  else if (type === 'add_exdeny') formData.exclude_deny_items[index].permissions = newArr
  else if (type === 'copy_allow') copyForm.allow_items[index].permissions = newArr
  else if (type === 'copy_exclude') copyForm.exclude_allow_items[index].permissions = newArr
  else if (type === 'copy_deny') copyForm.deny_items[index].permissions = newArr
  else if (type === 'copy_exdeny') copyForm.exclude_deny_items[index].permissions = newArr
  else if (type === 'revoke') revokeForm.allow_permissions_arr = newArr
}

const confirmItemPermissions = (type, index) => {
  closeItemDropdown(type, index)
}

const closeItemDropdown = (type, index) => {
  const el = itemRefs.value[type]?.[index]
  if (el) el.blur()
}

onMounted(() => { fetchClusters() })
</script>

<style scoped>
.page-container { padding: 20px; max-width: 1600px; margin: 0 auto; }
.search-card { margin-bottom: 16px; border-radius: 8px; }
.search-form { display: flex; flex-wrap: wrap; margin-bottom: -18px; }
.search-form :deep(.el-form-item) { margin-bottom: 18px; }
.table-card { border-radius: 8px; }
.expand-container { padding: 16px 24px; background-color: #f8fafc; border-radius: 8px; }
.expand-title { font-weight: 600; margin-bottom: 12px; color: #475569; }
.inner-table { background: transparent; }
.inner-table :deep(th) { background-color: #f1f5f9 !important; }
.form-section { background: #fafafa; padding: 20px; border-radius: 8px; margin-bottom: 16px; }
.section-title { font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 16px; padding-left: 10px; border-left: 4px solid #409eff; }
.custom-tabs :deep(.el-tabs__content) { padding: 20px 10px; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 12px; }

.policy-item-box {
  background: #fff;
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}

:deep(.el-table .even-row) { background-color: #ffffff; }
:deep(.el-table .odd-row) { background-color: #f8fafc; }
:deep(.el-table .odd-row:hover > td.el-table__cell) { background-color: #f1f5f9 !important; }
:deep(.el-table .even-row:hover > td.el-table__cell) { background-color: #f1f5f9 !important; }
</style>