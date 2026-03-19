require('dotenv').config();
const { sequelize, User, ConstructionPhase, TaskTemplate, TaskDependency } = require('../models');

const initDatabase = async () => {
  try {
    console.log('开始初始化数据库...');

    // 同步模型到数据库
    await sequelize.sync({ force: true });
    console.log('数据库表创建完成');

    // 创建默认管理员
    await User.create({
      username: 'admin',
      password: 'admin123',
      real_name: '系统管理员',
      role: 'admin',
      department: '信息中心',
      status: 1
    });
    console.log('默认管理员创建完成 (用户名: admin, 密码: admin123)');

    // 创建测试负责人
    await User.create({
      username: 'manager1',
      password: '123456',
      real_name: '张三',
      role: 'manager',
      department: '网络部',
      phone: '13800138001',
      status: 1
    });

    await User.create({
      username: 'manager2',
      password: '123456',
      real_name: '李四',
      role: 'manager',
      department: '建设部',
      phone: '13800138002',
      status: 1
    });
    console.log('测试负责人创建完成');

    // 创建建设阶段
    const phases = [
      { phase_number: 1, name: '立项批复', description: '项目启动', sort_order: 1 },
      { phase_number: 2, name: '合同签订', description: '合同签订阶段', sort_order: 2 },
      { phase_number: 3, name: '设计批复', description: '设计批复阶段', sort_order: 3 },
      { phase_number: 4, name: '物资到货', description: '物资采购到货', sort_order: 4 },
      { phase_number: 5, name: '施工作业', description: '施工建设阶段', sort_order: 5 },
      { phase_number: 6, name: '竣工投用', description: '竣工验收投用', sort_order: 6 }
    ];

    for (const phase of phases) {
      await ConstructionPhase.create(phase);
    }
    console.log('建设阶段创建完成');

    // 创建任务节点（网络图结构）
    // applicable_types: purchase-购置, lease-租赁, self_build-自建, container-一体化集装箱
    // 时间换算：1个月=30天，1周=7天

    const nodes = [
      // ========== 第1层 - 起点（所有类型共用）==========
      {
        id: 1,
        phase_id: 1,
        name: '立项批复',
        planned_days: 0,
        graph_level: 1,
        graph_row: 2,
        sort_order: 1,
        applicable_types: ['purchase', 'lease', 'self_build', 'container']
      },

      // ========== 第2层 - 合同签订/方案确定 ==========
      // 合同签订（购置、租赁、自建）
      {
        id: 2,
        phase_id: 2,
        name: '合同签订',
        planned_days: 90, // 3个月
        graph_level: 2,
        graph_row: 2,
        sort_order: 2,
        applicable_types: ['purchase', 'lease', 'self_build']
      },
      // 方案及用地确定（一体化集装箱专用）
      {
        id: 14,
        phase_id: 2,
        name: '方案及用地确定',
        planned_days: 90, // 3个月
        graph_level: 2,
        graph_row: 2,
        sort_order: 14,
        applicable_types: ['container']
      },

      // ========== 第3层 - 分支点 ==========
      // 收房（购置、租赁、自建）
      {
        id: 3,
        phase_id: 5,
        name: '收房',
        planned_days: 30, // 1个月
        graph_level: 3,
        graph_row: 1,
        sort_order: 3,
        applicable_types: ['purchase', 'lease', 'self_build']
      },
      // 设计批复（所有类型）
      {
        id: 4,
        phase_id: 3,
        name: '设计批复',
        planned_days: 7, // 1周
        graph_level: 3,
        graph_row: 3,
        sort_order: 4,
        applicable_types: ['purchase', 'lease', 'self_build', 'container']
      },

      // ========== 第4层 ==========
      // 产权办理（仅购置）
      {
        id: 5,
        phase_id: 6,
        name: '产权办理',
        planned_days: 60, // 2个月
        graph_level: 4,
        graph_row: 1,
        sort_order: 5,
        applicable_types: ['purchase']
      },
      // 物资到货（所有类型）
      {
        id: 6,
        phase_id: 4,
        name: '物资到货',
        planned_days: 37, // 1个月+1周
        graph_level: 4,
        graph_row: 3,
        sort_order: 6,
        applicable_types: ['purchase', 'lease', 'self_build', 'container']
      },

      // ========== 第5层 - 三分支 ==========
      {
        id: 7,
        phase_id: 5,
        name: '外市电完成',
        planned_days: 180, // 6个月
        graph_level: 5,
        graph_row: 2,
        sort_order: 7,
        applicable_types: ['purchase', 'lease', 'self_build', 'container']
      },
      {
        id: 8,
        phase_id: 5,
        name: '装修完成',
        planned_days: 60, // 2个月
        graph_level: 5,
        graph_row: 3,
        sort_order: 8,
        applicable_types: ['purchase', 'lease', 'self_build', 'container']
      },
      {
        id: 9,
        phase_id: 5,
        name: '管道完成',
        planned_days: 150, // 5个月
        graph_level: 5,
        graph_row: 4,
        sort_order: 9,
        applicable_types: ['purchase', 'lease', 'self_build', 'container']
      },

      // ========== 第6层 ==========
      {
        id: 10,
        phase_id: 5,
        name: '配套安装',
        planned_days: 120, // 4个月
        graph_level: 6,
        graph_row: 3,
        sort_order: 10,
        applicable_types: ['purchase', 'lease', 'self_build', 'container']
      },
      {
        id: 11,
        phase_id: 6,
        name: '线路完成',
        planned_days: 30, // 1个月
        graph_level: 6,
        graph_row: 4,
        sort_order: 11,
        applicable_types: ['purchase', 'lease', 'self_build', 'container']
      },

      // ========== 第7层 ==========
      {
        id: 12,
        phase_id: 6,
        name: '动环上线',
        planned_days: 7, // 1周
        graph_level: 7,
        graph_row: 3,
        sort_order: 12,
        applicable_types: ['purchase', 'lease', 'self_build', 'container']
      },

      // ========== 第8层 - 终点 ==========
      {
        id: 13,
        phase_id: 6,
        name: '传输业务割接',
        planned_days: 3, // 3天
        graph_level: 8,
        graph_row: 3,
        sort_order: 13,
        applicable_types: ['purchase', 'lease', 'self_build', 'container']
      }
    ];

    for (const node of nodes) {
      await TaskTemplate.create(node);
    }
    console.log('任务节点创建完成（14个网络节点）');

    // 创建节点依赖关系
    const dependencies = [
      // 购置/租赁/自建路径
      { task_id: 2, prev_task_id: 1 },  // 合同签订 → 立项批复
      { task_id: 3, prev_task_id: 2 },  // 收房 → 合同签订
      { task_id: 4, prev_task_id: 2 },  // 设计批复 → 合同签订
      { task_id: 5, prev_task_id: 3 },  // 产权办理 → 收房
      { task_id: 6, prev_task_id: 4 },  // 物资到货 → 设计批复

      // 一体化集装箱路径
      { task_id: 14, prev_task_id: 1 }, // 方案及用地确定 → 立项批复
      { task_id: 4, prev_task_id: 14 }, // 设计批复 → 方案及用地确定（一体化集装箱）

      // 共用后续流程（物资到货后的三分支）
      { task_id: 7, prev_task_id: 6 },  // 外市电完成 → 物资到货
      { task_id: 8, prev_task_id: 6 },  // 装修完成 → 物资到货
      { task_id: 9, prev_task_id: 6 },  // 管道完成 → 物资到货

      { task_id: 10, prev_task_id: 8 }, // 配套安装 → 装修完成
      { task_id: 11, prev_task_id: 9 }, // 线路完成 → 管道完成
      { task_id: 12, prev_task_id: 10 },// 动环上线 → 配套安装
      { task_id: 13, prev_task_id: 12 } // 传输业务割接 → 动环上线
    ];

    for (const dep of dependencies) {
      await TaskDependency.create(dep);
    }
    console.log('节点依赖关系创建完成');

    console.log('\n数据库初始化完成！');
    console.log('=====================================');
    console.log('默认管理员账号: admin / admin123');
    console.log('测试负责人账号: manager1 / 123456');
    console.log('测试负责人账号: manager2 / 123456');
    console.log('=====================================');
    console.log('\n建设方式及节点数量:');
    console.log('- 购置类: 13个节点（含收房、产权办理）');
    console.log('- 租赁类: 12个节点（含收房、无产权办理）');
    console.log('- 自建类: 12个节点（含收房、无产权办理）');
    console.log('- 一体化集装箱: 11个节点（方案及用地确定，无收房、无产权办理）');

    process.exit(0);
  } catch (error) {
    console.error('初始化失败:', error);
    process.exit(1);
  }
};

initDatabase();