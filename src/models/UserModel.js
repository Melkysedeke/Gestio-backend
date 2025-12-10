class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.passwordHash = data.password_hash;
    this.avatarUrl = data.avatar_url;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  toSafeJSON() {
    const { passwordHash, ...safeData } = this;
    return safeData;
  }
}

module.exports = User;