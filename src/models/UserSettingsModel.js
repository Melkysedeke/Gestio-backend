class UserSettings {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.lastOpenedWallet = data.last_opened_wallet;
    this.theme = data.theme;
    this.language = data.language;
    this.notificationsEnabled = data.notifications_enabled;
    this.emailNotifications = data.email_notifications;
    this.defaultCurrency = data.default_currency;
    this.extra = data.extra || {}; 
  }
}

module.exports = UserSettings;