const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/default');

const usersFile = path.join(__dirname, '..', 'data', 'users.json');

class AuthService {
  constructor() {
    this.initUsers();
  }

  initUsers() {
    if (!fs.existsSync(usersFile)) {
      // Default Admin user (password: admin123)
      const salt = bcrypt.genSaltSync(10);
      const defaultUsers = [
        {
          id: 'user_admin',
          username: 'admin',
          name: 'DHCP Administrator',
          passwordHash: bcrypt.hashSync('admin123', salt),
          role: 'admin',
          createdAt: new Date().toISOString()
        }
      ];
      fs.writeFileSync(usersFile, JSON.stringify(defaultUsers, null, 2), 'utf8');
    }
  }

  getUsers() {
    if (!fs.existsSync(usersFile)) this.initUsers();
    try {
      const data = fs.readFileSync(usersFile, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      this.initUsers();
      return JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    }
  }

  saveUsers(users) {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
  }

  authenticate(username, password) {
    const users = this.getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return { success: false, error: 'Invalid username or password' };
    }

    // Role check: Only admin is allowed as per specification
    if (user.role !== 'admin') {
      return { success: false, error: 'Access denied: Admin role required' };
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    };
  }

  changePassword(userId, currentPassword, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters');
    }

    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isMatch = bcrypt.compareSync(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new Error('Current password does not match');
    }

    const salt = bcrypt.genSaltSync(10);
    user.passwordHash = bcrypt.hashSync(newPassword, salt);
    this.saveUsers(users);

    return { success: true, message: 'Password updated successfully' };
  }
}

module.exports = new AuthService();
