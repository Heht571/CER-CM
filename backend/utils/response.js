/**
 * 统一响应格式工具
 */

/**
 * 成功响应
 * @param {Object} res - Express response对象
 * @param {*} data - 返回的数据
 * @param {string} message - 成功消息
 * @param {number} code - 状态码
 */
const success = (res, data = null, message = '操作成功', code = 200) => {
  return res.status(code).json({
    success: true,
    message,
    data
  });
};

/**
 * 失败响应
 * @param {Object} res - Express response对象
 * @param {string} message - 错误消息
 * @param {number} code - 状态码
 */
const fail = (res, message = '操作失败', code = 400) => {
  return res.status(code).json({
    success: false,
    message
  });
};

/**
 * 分页响应
 * @param {Object} res - Express response对象
 * @param {Array} list - 数据列表
 * @param {number} total - 总数量
 * @param {number} page - 当前页
 * @param {number} pageSize - 每页数量
 */
const paginate = (res, list, total, page, pageSize) => {
  return res.json({
    success: true,
    data: {
      list,
      pagination: {
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize)
      }
    }
  });
};

module.exports = { success, fail, paginate };