const { MachineRoom, RoomTask, ConstructionPhase, User, sequelize } = require('../models');
const { success, fail } = require('../utils/response');
const { Op } = require('sequelize');

/**
 * 总体概览统计
 */
const getOverview = async (req, res, next) => {
  try {
    // 机房统计
    const totalRooms = await MachineRoom.count();
    const planningRooms = await MachineRoom.count({ where: { status: 'planning' } });
    const inProgressRooms = await MachineRoom.count({ where: { status: 'in_progress' } });
    const completedRooms = await MachineRoom.count({ where: { status: 'completed' } });
    const pausedRooms = await MachineRoom.count({ where: { status: 'paused' } });

    // 任务统计
    const totalTasks = await RoomTask.count();
    const completedTasks = await RoomTask.count({ where: { status: 'completed' } });
    const inProgressTasks = await RoomTask.count({ where: { status: 'in_progress' } });
    const notStartedTasks = await RoomTask.count({ where: { status: 'not_started' } });

    // 延期任务统计
    const today = new Date();
    const delayedTasks = await RoomTask.count({
      where: {
        status: { [Op.ne]: 'completed' },
        planned_end_date: { [Op.lt]: today, [Op.ne]: null }
      }
    });

    // 负责人统计
    const totalManagers = await User.count({ where: { role: 'manager', status: 1 } });

    success(res, {
      rooms: {
        total: totalRooms,
        planning: planningRooms,
        inProgress: inProgressRooms,
        completed: completedRooms,
        paused: pausedRooms
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        notStarted: notStartedTasks,
        delayed: delayedTasks
      },
      managers: totalManagers,
      overallProgress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 按阶段统计
 */
const getByPhase = async (req, res, next) => {
  try {
    const phases = await ConstructionPhase.findAll({
      order: [['phase_number', 'ASC']]
    });

    const result = await Promise.all(phases.map(async (phase) => {
      const total = await RoomTask.count({ where: { phase_id: phase.id } });
      const completed = await RoomTask.count({
        where: { phase_id: phase.id, status: 'completed' }
      });
      const inProgress = await RoomTask.count({
        where: { phase_id: phase.id, status: 'in_progress' }
      });

      return {
        id: phase.id,
        name: phase.name,
        phaseNumber: phase.phase_number,
        total,
        completed,
        inProgress,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    }));

    success(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * 延期预警
 */
const getDelayed = async (req, res, next) => {
  try {
    const today = new Date();

    const delayedTasks = await RoomTask.findAll({
      where: {
        status: { [Op.ne]: 'completed' },
        planned_end_date: { [Op.lt]: today, [Op.ne]: null }
      },
      include: [
        {
          model: MachineRoom,
          as: 'room',
          attributes: ['id', 'name', 'status'],
          include: [{
            model: User,
            as: 'manager',
            attributes: ['id', 'real_name', 'phone']
          }]
        },
        {
          model: ConstructionPhase,
          as: 'phase',
          attributes: ['id', 'name']
        }
      ],
      order: [['planned_end_date', 'ASC']]
    });

    const result = delayedTasks.map(task => ({
      ...task.toJSON(),
      delayDays: Math.ceil((today - new Date(task.planned_end_date)) / (1000 * 60 * 60 * 24))
    }));

    success(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * 机房进度排行
 */
const getRoomRanking = async (req, res, next) => {
  try {
    const rooms = await MachineRoom.findAll({
      include: [{
        model: User,
        as: 'manager',
        attributes: ['id', 'real_name']
      }],
      order: [['created_at', 'DESC']]
    });

    const result = await Promise.all(rooms.map(async (room) => {
      const total = await RoomTask.count({ where: { room_id: room.id } });
      const completed = await RoomTask.count({
        where: { room_id: room.id, status: 'completed' }
      });

      return {
        id: room.id,
        name: room.name,
        status: room.status,
        manager: room.manager,
        total,
        completed,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    }));

    // 按进度排序
    result.sort((a, b) => b.progress - a.progress);

    success(res, result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview,
  getByPhase,
  getDelayed,
  getRoomRanking
};