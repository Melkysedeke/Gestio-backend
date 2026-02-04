class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.avatar = data.avatar;
    this.settings = data.settings || {}; 
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  toSafeJSON() {
    const { password, ...safeData } = this;
    return safeData;
  }
}

module.exports = User;