const categoryRepository = require('../repositories/CategoryRepository');

class CategoryService {
  async findAll() {
    return await categoryRepository.findAll();
  }
}
module.exports = new CategoryService();