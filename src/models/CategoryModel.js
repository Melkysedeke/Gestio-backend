class Category {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id; 
    this.name = data.name;
    this.icon = data.icon;
    this.type = data.type;
    this.color = data.color;
    this.archived = data.archived
    this.createdAt = data.created_at;
  }
}

module.exports = Category;